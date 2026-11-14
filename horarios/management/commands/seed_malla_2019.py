import datetime
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User

from horarios.models import (
    PerfilUsuario,
    Periodo_Academico,
    asignatura,
    docente,
    aula,
    grupo,
    bloque_horario,
    Prerequisitos,
    estudiante,
    HistorialAcademico,
)
from horarios.management.commands.seed_data import (
    ASIGNATURAS_EPIS,
    PREREQUISITOS_EPIS,
)


MALLA = "2019"
PREFIX = "19-"


class Command(BaseCommand):
    help = (
        "Carga una malla curricular de prueba 2019 (asignaturas, prerrequisitos, "
        "grupos y bloques horarios) sin borrar la malla 2021 existente."
    )

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING("Cargando malla de prueba 2019..."))

        # 1. Periodos activos donde se ofertará la malla 2019
        periodo_impar, _ = Periodo_Academico.objects.get_or_create(
            nombre="2026-1",
            defaults={
                "fecha_inicio": datetime.date(2026, 3, 15),
                "fecha_fin": datetime.date(2026, 7, 20),
            },
        )
        periodo_par, _ = Periodo_Academico.objects.get_or_create(
            nombre="2026-2",
            defaults={
                "fecha_inicio": datetime.date(2026, 8, 15),
                "fecha_fin": datetime.date(2026, 12, 20),
            },
        )

        # 2. Aulas base
        aulas_data = [
            {"codigo": "A3-1", "tipo": "Teoría"},
            {"codigo": "A3-2", "tipo": "Teoría"},
            {"codigo": "A3-3", "tipo": "Teoría"},
            {"codigo": "LAB-101", "tipo": "Laboratorio"},
            {"codigo": "LAB-102", "tipo": "Laboratorio"},
            {"codigo": "LAB-103", "tipo": "Laboratorio"},
        ]
        aula_objs = {
            data["codigo"]: aula.objects.get_or_create(
                codigo=data["codigo"], defaults=data
            )[0]
            for data in aulas_data
        }

        # 3. Docentes (reutiliza los existentes y completa si hace falta)
        doc_objs = list(docente.objects.all()[:6])
        while len(doc_objs) < 6:
            idx = len(doc_objs) + 1
            doc_obj, _ = docente.objects.get_or_create(
                email=f"docente2019{idx}@unfv.edu.pe",
                defaults={"nombre": f"Docente Malla 2019 {idx}"},
            )
            doc_objs.append(doc_obj)

        # 4. Asignaturas de la malla 2019 (códigos con prefijo 19-)
        asig_objs = {}
        for base in ASIGNATURAS_EPIS:
            data = {
                "codigo": f"{PREFIX}{base['codigo']}",
                "nombre": base["nombre"],
                "creditos": base["creditos"],
                "horas_teoria": base["horas_teoria"],
                "horas_practica": base["horas_practica"],
                "ciclo": base["ciclo"],
                "malla": MALLA,
            }
            obj, _ = asignatura.objects.get_or_create(
                codigo=data["codigo"], defaults=data
            )
            for key, value in data.items():
                setattr(obj, key, value)
            obj.save()
            asig_objs[base["codigo"]] = obj

        # 5. Prerrequisitos de la malla 2019
        for codigo, requisito in PREREQUISITOS_EPIS:
            Prerequisitos.objects.get_or_create(
                asignatura_codigo=asig_objs[codigo],
                asignatura_requisito=asig_objs[requisito],
            )

        # 6. Grupos y bloques horarios para 2026-1 (impares) y 2026-2 (pares)
        seccion_configs = {
            "A": {
                "turno": "Mañana",
                "aula_teoria": "A3-1",
                "aula_lab": "LAB-101",
                "h1_ini": datetime.time(7, 0),
                "h1_fin": datetime.time(8, 40),
                "h2_ini": datetime.time(8, 40),
                "h2_fin": datetime.time(10, 20),
            },
            "B": {
                "turno": "Tarde",
                "aula_teoria": "A3-2",
                "aula_lab": "LAB-102",
                "h1_ini": datetime.time(13, 0),
                "h1_fin": datetime.time(14, 40),
                "h2_ini": datetime.time(14, 40),
                "h2_fin": datetime.time(16, 20),
            },
            "C": {
                "turno": "Noche",
                "aula_teoria": "A3-3",
                "aula_lab": "LAB-103",
                "h1_ini": datetime.time(17, 0),
                "h1_fin": datetime.time(18, 40),
                "h2_ini": datetime.time(18, 40),
                "h2_fin": datetime.time(20, 20),
            },
        }

        ciclo_dias = {
            "I": ("MIERCOLES", "JUEVES"),
            "II": ("JUEVES", "VIERNES"),
            "III": ("VIERNES", "SABADO"),
            "IV": ("LUNES", "MARTES"),
            "V": ("MARTES", "MIERCOLES"),
            "VI": ("MIERCOLES", "JUEVES"),
            "VII": ("JUEVES", "VIERNES"),
            "VIII": ("VIERNES", "SABADO"),
            "IX": ("LUNES", "MARTES"),
            "X": ("MARTES", "MIERCOLES"),
        }

        def seed_periodo(periodo, ciclos):
            cursos = [a for a in ASIGNATURAS_EPIS if a["ciclo"] in ciclos]
            cursos_por_ciclo = {}
            for item in cursos:
                cursos_por_ciclo.setdefault(item["ciclo"], []).append(item)

            for ciclo, lista in cursos_por_ciclo.items():
                dias = ciclo_dias.get(ciclo, ("LUNES", "MARTES"))
                for seccion, cfg in seccion_configs.items():
                    for idx, base in enumerate(lista):
                        grupo_obj, _ = grupo.objects.get_or_create(
                            codigo=asig_objs[base["codigo"]],
                            seccion=seccion,
                            id_periodo=periodo,
                            defaults={
                                "turno": cfg["turno"],
                                "vacantes": 30,
                                "cupos_ocupados": 0,
                            },
                        )

                        dia = dias[idx % len(dias)]
                        hora_inicio = cfg["h1_ini"] if idx % 2 == 0 else cfg["h2_ini"]
                        hora_fin = cfg["h1_fin"] if idx % 2 == 0 else cfg["h2_fin"]
                        es_laboratorio = base["horas_practica"] >= 4
                        aula_target = aula_objs[
                            cfg["aula_lab"] if es_laboratorio else cfg["aula_teoria"]
                        ]
                        docente_target = doc_objs[(idx + len(seccion)) % len(doc_objs)]

                        bloque_horario.objects.get_or_create(
                            id_grupo=grupo_obj,
                            dia_semana=dia,
                            hora_inicio=hora_inicio,
                            hora_fin=hora_fin,
                            defaults={
                                "id_aula": aula_target,
                                "id_docente": docente_target,
                            },
                        )

        seed_periodo(periodo_impar, ["I", "III", "V", "VII", "IX"])
        seed_periodo(periodo_par, ["II", "IV", "VI", "VIII", "X"])

        # 7. Estudiante de prueba de la malla 2019 (ciclo II con ciclo I aprobado)
        codigo_estudiante = "2019000001"
        user, _ = User.objects.get_or_create(
            username=codigo_estudiante,
            defaults={
                "email": f"{codigo_estudiante}@unfv.edu.pe",
                "first_name": "Estudiante Malla",
                "last_name": "2019",
            },
        )
        user.set_password("estudiante123")
        user.save()
        PerfilUsuario.objects.get_or_create(
            user=user, defaults={"rol": "ESTUDIANTE"}
        )

        est_obj, _ = estudiante.objects.get_or_create(
            codigo_universitario=codigo_estudiante,
            defaults={
                "nombres": "Estudiante de Prueba Malla 2019",
                "ciclo_actual": "II",
                "malla": MALLA,
                "usuario": user,
            },
        )
        est_obj.malla = MALLA
        est_obj.ciclo_actual = "II"
        est_obj.usuario = user
        est_obj.save()

        cursos_ciclo_i = [a for a in ASIGNATURAS_EPIS if a["ciclo"] == "I"]
        for base in cursos_ciclo_i:
            HistorialAcademico.objects.get_or_create(
                id_estudiante=est_obj,
                id_asignatura=asig_objs[base["codigo"]],
                id_periodo=periodo_impar,
                defaults={"nota": 16.0, "estado": "aprobado"},
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"Malla {MALLA} cargada: {len(ASIGNATURAS_EPIS)} asignaturas, "
                f"grupos/bloques para 2026-1 y 2026-2. "
                f"Estudiante de prueba: {codigo_estudiante} / estudiante123"
            )
        )
