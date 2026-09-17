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
    disponibilidad_aula,
    estudiante,
    seleccion,
    Prerequisitos,
    HistorialAcademico,
    SolicitudAmpliacion,
)


class Command(BaseCommand):
    help = 'Carga datos semilla para periodos impares (2026-1: I, III, V, VII, IX) y pares (2026-2: II, IV, VI, VIII, X).'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING("Iniciando reseteo y carga de datos para Periodos Impares (2026-1) y Pares (2026-2)..."))

        # Limpieza previa
        seleccion.objects.all().delete()
        bloque_horario.objects.all().delete()
        grupo.objects.all().delete()

        # 0. Usuario Administrador (Consejo de Facultad)
        admin_user, _ = User.objects.get_or_create(
            username="admin",
            defaults={"email": "admin.epis@unfv.edu.pe", "first_name": "Consejo de", "last_name": "Facultad", "is_staff": True, "is_superuser": True}
        )
        admin_user.set_password("admin123")
        admin_user.save()
        PerfilUsuario.objects.get_or_create(user=admin_user, defaults={"rol": "ADMIN"})

        # 1. Periodos Académicos (Impar 2026-1 y Par 2026-2)
        periodo_impar, _ = Periodo_Academico.objects.get_or_create(
            nombre="2026-1",
            defaults={
                "fecha_inicio": datetime.date(2026, 3, 15),
                "fecha_fin": datetime.date(2026, 7, 20)
            }
        )

        periodo_par, _ = Periodo_Academico.objects.get_or_create(
            nombre="2026-2",
            defaults={
                "fecha_inicio": datetime.date(2026, 8, 15),
                "fecha_fin": datetime.date(2026, 12, 20)
            }
        )

        # 2. Catálogo Completo de Asignaturas (Impares + Pares)
        asignaturas_data = [
            # CICLOS IMPARES (Periodos -1: 2026-1)
            {"codigo": "SI-101", "nombre": "Introducción a la Ing. de Sistemas", "creditos": 4, "horas_teoria": 2, "horas_practica": 4, "ciclo": "I"},
            {"codigo": "MAT-101", "nombre": "Análisis Matemático I", "creditos": 4, "horas_teoria": 3, "horas_practica": 2, "ciclo": "I"},
            
            {"codigo": "SI-301", "nombre": "Estructuras de Datos I", "creditos": 4, "horas_teoria": 2, "horas_practica": 4, "ciclo": "III"},
            {"codigo": "MAT-301", "nombre": "Estadística Aplicada", "creditos": 4, "horas_teoria": 3, "horas_practica": 2, "ciclo": "III"},

            {"codigo": "SI-501", "nombre": "Base de Datos II", "creditos": 4, "horas_teoria": 2, "horas_practica": 4, "ciclo": "V"},
            {"codigo": "SI-502", "nombre": "Análisis y Diseño de Sistemas", "creditos": 4, "horas_teoria": 3, "horas_practica": 2, "ciclo": "V"},

            {"codigo": "SI-701", "nombre": "Sistemas Distribuidos", "creditos": 4, "horas_teoria": 3, "horas_practica": 2, "ciclo": "VII"},
            {"codigo": "SI-702", "nombre": "Calidad de Software", "creditos": 4, "horas_teoria": 3, "horas_practica": 2, "ciclo": "VII"},

            {"codigo": "SI-901", "nombre": "Taller de Tesis I", "creditos": 5, "horas_teoria": 2, "horas_practica": 6, "ciclo": "IX"},
            {"codigo": "SI-902", "nombre": "Seguridad de la Información", "creditos": 4, "horas_teoria": 3, "horas_practica": 2, "ciclo": "IX"},

            # CICLOS PARES (Periodos -2: 2026-2)
            {"codigo": "SI-201", "nombre": "Algoritmos y Estructuras de Datos", "creditos": 4, "horas_teoria": 2, "horas_practica": 4, "ciclo": "II"},
            {"codigo": "MAT-202", "nombre": "Matemática Discreta", "creditos": 4, "horas_teoria": 3, "horas_practica": 2, "ciclo": "II"},

            {"codigo": "SI-401", "nombre": "Base de Datos I", "creditos": 4, "horas_teoria": 2, "horas_practica": 4, "ciclo": "IV"},
            {"codigo": "SI-402", "nombre": "Programación Orientada a Objetos", "creditos": 4, "horas_teoria": 2, "horas_practica": 4, "ciclo": "IV"},

            {"codigo": "SI-601", "nombre": "Ingeniería de Software", "creditos": 4, "horas_teoria": 3, "horas_practica": 2, "ciclo": "VI"},
            {"codigo": "SI-602", "nombre": "Redes y Comunicaciones", "creditos": 4, "horas_teoria": 3, "horas_practica": 2, "ciclo": "VI"},

            {"codigo": "SI-801", "nombre": "Gerencia de Proyectos TI", "creditos": 4, "horas_teoria": 3, "horas_practica": 2, "ciclo": "VIII"},
            {"codigo": "SI-802", "nombre": "Arquitectura de Software", "creditos": 4, "horas_teoria": 3, "horas_practica": 2, "ciclo": "VIII"},

            {"codigo": "SI-1001", "nombre": "Taller de Tesis II", "creditos": 5, "horas_teoria": 2, "horas_practica": 6, "ciclo": "X"},
            {"codigo": "SI-1002", "nombre": "Gobernanza de TI", "creditos": 4, "horas_teoria": 3, "horas_practica": 2, "ciclo": "X"},
        ]

        asig_objs = {}
        for a in asignaturas_data:
            obj, _ = asignatura.objects.get_or_create(codigo=a["codigo"], defaults=a)
            asig_objs[a["codigo"]] = obj

        # 3. Prerrequisitos
        prereqs = [
            ("SI-301", "SI-101"),
            ("SI-501", "SI-301"),
            ("SI-701", "SI-501"),
            ("SI-901", "SI-701"),
            ("SI-401", "SI-201"),
            ("SI-402", "SI-201"),
            ("SI-601", "SI-401"),
            ("SI-801", "SI-601"),
            ("SI-802", "SI-601"),
        ]
        for cod, req in prereqs:
            if cod in asig_objs and req in asig_objs:
                Prerequisitos.objects.get_or_create(
                    asignatura_codigo=asig_objs[cod],
                    asignatura_requisito=asig_objs[req]
                )

        # 4. Docentes con Cuenta de Usuario
        docentes_data = [
            {"username": "cmendoza", "nombre": "Ing. Carlos Mendoza", "email": "cmendoza@unfv.edu.pe"},
            {"username": "agutierrez", "nombre": "Dra. Ana Gutiérrez", "email": "agutierrez@unfv.edu.pe"},
            {"username": "rtorres", "nombre": "Mag. Roberto Torres", "email": "rtorres@unfv.edu.pe"},
            {"username": "pvega", "nombre": "Ing. Patricia Vega", "email": "pvega@unfv.edu.pe"},
            {"username": "framos", "nombre": "Dr. Fernando Ramos", "email": "framos@unfv.edu.pe"},
            {"username": "ecastro", "nombre": "Ing. Elena Castro", "email": "ecastro@unfv.edu.pe"},
        ]
        doc_objs = []
        for d in docentes_data:
            u, _ = User.objects.get_or_create(username=d["username"], defaults={"email": d["email"], "first_name": d["nombre"]})
            u.set_password("docente123")
            u.save()
            PerfilUsuario.objects.get_or_create(user=u, defaults={"rol": "DOCENTE"})

            doc_obj, _ = docente.objects.get_or_create(email=d["email"], defaults={"nombre": d["nombre"], "usuario": u})
            doc_obj.usuario = u
            doc_obj.save()
            doc_objs.append(doc_obj)

        # 5. Aulas
        aulas_data = [
            {"codigo": "A3-1", "tipo": "Teoría"},
            {"codigo": "A3-2", "tipo": "Teoría"},
            {"codigo": "A3-3", "tipo": "Teoría"},
            {"codigo": "LAB-101", "tipo": "Laboratorio"},
            {"codigo": "LAB-102", "tipo": "Laboratorio"},
            {"codigo": "LAB-103", "tipo": "Laboratorio"},
        ]
        aula_objs = {au["codigo"]: aula.objects.get_or_create(codigo=au["codigo"], defaults=au)[0] for au in aulas_data}

        # Helper para poblar grupos y bloques por periodo
        def seed_period_schedule(target_period, is_odd=False):
            seccion_configs = {
                "A": {
                    "turno": "Mañana",
                    "aula_teoria": "A3-1", "aula_lab": "LAB-101",
                    "doc_teoria": doc_objs[0], "doc_lab": doc_objs[1],
                    "h1_ini": datetime.time(8, 0), "h1_fin": datetime.time(9, 40),
                    "h2_ini": datetime.time(9, 40), "h2_fin": datetime.time(11, 20),
                },
                "B": {
                    "turno": "Tarde",
                    "aula_teoria": "A3-2", "aula_lab": "LAB-102",
                    "doc_teoria": doc_objs[2], "doc_lab": doc_objs[3],
                    "h1_ini": datetime.time(14, 0), "h1_fin": datetime.time(15, 40),
                    "h2_ini": datetime.time(15, 40), "h2_fin": datetime.time(17, 20),
                },
                "C": {
                    "turno": "Noche",
                    "aula_teoria": "A3-3", "aula_lab": "LAB-103",
                    "doc_teoria": doc_objs[4], "doc_lab": doc_objs[5],
                    "h1_ini": datetime.time(18, 0), "h1_fin": datetime.time(19, 40),
                    "h2_ini": datetime.time(19, 40), "h2_fin": datetime.time(21, 20),
                },
            }

            odd_cycles = ["I", "III", "V", "VII", "IX"]
            even_cycles = ["II", "IV", "VI", "VIII", "X"]
            target_cycles = odd_cycles if is_odd else even_cycles

            ciclo_dias = {
                "I": ("LUNES", "MARTES"), "III": ("MARTES", "MIERCOLES"), "V": ("MIERCOLES", "JUEVES"), "VII": ("JUEVES", "VIERNES"), "IX": ("VIERNES", "SABADO"),
                "II": ("LUNES", "MARTES"), "IV": ("MARTES", "MIERCOLES"), "VI": ("MIERCOLES", "JUEVES"), "VIII": ("JUEVES", "VIERNES"), "X": ("VIERNES", "SABADO"),
            }

            filtered_asigs = [a for a in asignaturas_data if a["ciclo"] in target_cycles]
            cursos_por_ciclo = {}
            for a in filtered_asigs:
                c = a["ciclo"]
                if c not in cursos_por_ciclo:
                    cursos_por_ciclo[c] = []
                cursos_por_ciclo[c].append(asig_objs[a["codigo"]])

            for c_nombre, cursos_lista in cursos_por_ciclo.items():
                dias = ciclo_dias[c_nombre]

                for sec_letra in ["A", "B", "C"]:
                    cfg = seccion_configs[sec_letra]

                    for c_idx, curso_obj in enumerate(cursos_lista):
                        g_obj, _ = grupo.objects.get_or_create(
                            codigo=curso_obj,
                            seccion=sec_letra,
                            id_periodo=target_period,
                            defaults={
                                "turno": cfg["turno"],
                                "vacantes": 30,
                                "cupos_ocupados": 0
                            }
                        )
                        g_obj.cupos_ocupados = 0
                        g_obj.save()

                        dia = dias[c_idx % len(dias)]
                        h_ini = cfg["h1_ini"] if c_idx % 2 == 0 else cfg["h2_ini"]
                        h_fin = cfg["h1_fin"] if c_idx % 2 == 0 else cfg["h2_fin"]
                        aula_target = aula_objs[cfg["aula_lab"] if "LAB" in curso_obj.codigo or "Taller" in curso_obj.nombre else cfg["aula_teoria"]]
                        docente_target = cfg["doc_lab"] if "LAB" in curso_obj.codigo or "Taller" in curso_obj.nombre else cfg["doc_teoria"]

                        assigned_docente = docente_target if (c_idx + (0 if sec_letra == 'A' else 1)) % 2 == 0 else None

                        bloque_horario.objects.get_or_create(
                            id_grupo=g_obj,
                            dia_semana=dia,
                            hora_inicio=h_ini,
                            hora_fin=h_fin,
                            defaults={
                                "id_aula": aula_target,
                                "id_docente": assigned_docente
                            }
                        )

        # Poblar Horarios 2026-1 (Impar) y 2026-2 (Par)
        seed_period_schedule(periodo_impar, is_odd=True)
        seed_period_schedule(periodo_par, is_odd=False)

        # 6. Estudiantes con Cuentas de Usuario vinculadas
        estudiantes_data = [
            {"codigo": "2021001001", "nombres": "Juan Pérez Gómez", "ciclo": "I"},
            {"codigo": "2022002002", "nombres": "María López Torres", "ciclo": "III"},
            {"codigo": "2023003003", "nombres": "Carlos Sánchez Vílchez", "ciclo": "V"},
        ]
        est_objs = []
        for ed in estudiantes_data:
            u, _ = User.objects.get_or_create(username=ed["codigo"], defaults={"email": f"{ed['codigo']}@unfv.edu.pe", "first_name": ed["nombres"]})
            u.set_password("estudiante123")
            u.save()
            PerfilUsuario.objects.get_or_create(user=u, defaults={"rol": "ESTUDIANTE"})

            e_obj, _ = estudiante.objects.get_or_create(
                codigo_universitario=ed["codigo"],
                defaults={"nombres": ed["nombres"], "ciclo_actual": ed["ciclo"], "usuario": u}
            )
            e_obj.usuario = u
            e_obj.save()
            est_objs.append(e_obj)

        self.stdout.write(self.style.SUCCESS("=========================================================="))
        self.stdout.write(self.style.SUCCESS("¡Periodos 2026-1 (Impar: I, III, V, VII, IX) y 2026-2 (Par: II, IV, VI, VIII, X) generados con éxito!"))
        self.stdout.write(self.style.SUCCESS("=========================================================="))
