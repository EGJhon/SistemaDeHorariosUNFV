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

# Malla Curricular EPIS - UNFV (Ciclos I al X) usada por el seed principal
ASIGNATURAS_EPIS = [
    # CICLO I
    {"codigo": "SI-101", "nombre": "Introducción a la Ing. de Sistemas", "creditos": 4, "horas_teoria": 2, "horas_practica": 4, "ciclo": "I"},
    {"codigo": "MAT-101", "nombre": "Análisis Matemático I", "creditos": 4, "horas_teoria": 3, "horas_practica": 2, "ciclo": "I"},
    {"codigo": "SI-102", "nombre": "Algoritmos y Programación", "creditos": 4, "horas_teoria": 2, "horas_practica": 4, "ciclo": "I"},
    {"codigo": "COM-101", "nombre": "Comunicación y Lenguaje", "creditos": 3, "horas_teoria": 2, "horas_practica": 2, "ciclo": "I"},

    # CICLO II
    {"codigo": "SI-201", "nombre": "Programación Orientada a Objetos", "creditos": 4, "horas_teoria": 2, "horas_practica": 4, "ciclo": "II"},
    {"codigo": "MAT-201", "nombre": "Análisis Matemático II", "creditos": 4, "horas_teoria": 3, "horas_practica": 2, "ciclo": "II"},
    {"codigo": "MAT-202", "nombre": "Matemática Discreta", "creditos": 4, "horas_teoria": 3, "horas_practica": 2, "ciclo": "II"},
    {"codigo": "SI-202", "nombre": "Teoría General de Sistemas", "creditos": 3, "horas_teoria": 2, "horas_practica": 2, "ciclo": "II"},

    # CICLO III
    {"codigo": "SI-301", "nombre": "Estructuras de Datos", "creditos": 4, "horas_teoria": 2, "horas_practica": 4, "ciclo": "III"},
    {"codigo": "MAT-301", "nombre": "Estadística Aplicada", "creditos": 4, "horas_teoria": 3, "horas_practica": 2, "ciclo": "III"},
    {"codigo": "SI-302", "nombre": "Arquitectura de Computadoras", "creditos": 4, "horas_teoria": 2, "horas_practica": 4, "ciclo": "III"},
    {"codigo": "SI-303", "nombre": "Metodología de la Investigación", "creditos": 3, "horas_teoria": 2, "horas_practica": 2, "ciclo": "III"},

    # CICLO IV
    {"codigo": "SI-401", "nombre": "Base de Datos I", "creditos": 4, "horas_teoria": 2, "horas_practica": 4, "ciclo": "IV"},
    {"codigo": "SI-402", "nombre": "Análisis y Diseño de Algoritmos", "creditos": 4, "horas_teoria": 2, "horas_practica": 4, "ciclo": "IV"},
    {"codigo": "SI-403", "nombre": "Sistemas Operativos", "creditos": 4, "horas_teoria": 2, "horas_practica": 4, "ciclo": "IV"},
    {"codigo": "SI-404", "nombre": "Modelado de Procesos de Negocio", "creditos": 3, "horas_teoria": 2, "horas_practica": 2, "ciclo": "IV"},

    # CICLO V
    {"codigo": "SI-501", "nombre": "Base de Datos II", "creditos": 4, "horas_teoria": 2, "horas_practica": 4, "ciclo": "V"},
    {"codigo": "SI-502", "nombre": "Ingeniería de Software I", "creditos": 4, "horas_teoria": 3, "horas_practica": 2, "ciclo": "V"},
    {"codigo": "SI-503", "nombre": "Redes y Conectividad", "creditos": 4, "horas_teoria": 2, "horas_practica": 4, "ciclo": "V"},
    {"codigo": "SI-504", "nombre": "Dinámica de Sistemas", "creditos": 3, "horas_teoria": 2, "horas_practica": 2, "ciclo": "V"},

    # CICLO VI
    {"codigo": "SI-601", "nombre": "Ingeniería de Software II", "creditos": 4, "horas_teoria": 3, "horas_practica": 2, "ciclo": "VI"},
    {"codigo": "SI-602", "nombre": "Redes Avanzadas y Comunicaciones", "creditos": 4, "horas_teoria": 3, "horas_practica": 2, "ciclo": "VI"},
    {"codigo": "SI-603", "nombre": "Inteligencia Artificial", "creditos": 4, "horas_teoria": 2, "horas_practica": 4, "ciclo": "VI"},

    # CICLO VII
    {"codigo": "SI-701", "nombre": "Sistemas Distribuidos", "creditos": 4, "horas_teoria": 3, "horas_practica": 2, "ciclo": "VII"},
    {"codigo": "SI-702", "nombre": "Calidad y Pruebas de Software", "creditos": 4, "horas_teoria": 3, "horas_practica": 2, "ciclo": "VII"},

    # CICLO VIII
    {"codigo": "SI-801", "nombre": "Gerencia de Proyectos TI", "creditos": 4, "horas_teoria": 3, "horas_practica": 2, "ciclo": "VIII"},
    {"codigo": "SI-802", "nombre": "Arquitectura Empresarial", "creditos": 4, "horas_teoria": 3, "horas_practica": 2, "ciclo": "VIII"},

    # CICLO IX
    {"codigo": "SI-901", "nombre": "Taller de Tesis I", "creditos": 5, "horas_teoria": 2, "horas_practica": 6, "ciclo": "IX"},
    {"codigo": "SI-902", "nombre": "Seguridad de la Información", "creditos": 4, "horas_teoria": 3, "horas_practica": 2, "ciclo": "IX"},

    # CICLO X
    {"codigo": "SI-1001", "nombre": "Taller de Tesis II", "creditos": 5, "horas_teoria": 2, "horas_practica": 6, "ciclo": "X"},
    {"codigo": "SI-1002", "nombre": "Gobernanza y Auditoría de TI", "creditos": 4, "horas_teoria": 3, "horas_practica": 2, "ciclo": "X"},
]

# Prerrequisitos de la malla EPIS base
PREREQUISITOS_EPIS = [
    # Ciclo II requiere Ciclo I
    ("SI-201", "SI-102"),
    ("MAT-201", "MAT-101"),
    ("MAT-202", "MAT-101"),
    ("SI-202", "SI-101"),

    # Ciclo III requiere Ciclo II
    ("SI-301", "SI-201"),
    ("MAT-301", "MAT-201"),
    ("SI-302", "MAT-202"),

    # Ciclo IV requiere Ciclo III / II
    ("SI-401", "SI-301"),
    ("SI-402", "SI-301"),
    ("SI-403", "SI-302"),
    ("SI-404", "SI-202"),

    # Ciclo V requiere Ciclo IV
    ("SI-501", "SI-401"),
    ("SI-502", "SI-402"),
    ("SI-503", "SI-403"),
    ("SI-504", "SI-404"),

    # Ciclo VI requiere Ciclo V
    ("SI-601", "SI-502"),
    ("SI-602", "SI-503"),
    ("SI-603", "SI-402"),

    # Ciclo VII requiere Ciclo VI
    ("SI-701", "SI-602"),
    ("SI-702", "SI-601"),

    # Ciclo VIII requiere Ciclo VII
    ("SI-801", "SI-702"),
    ("SI-802", "SI-701"),

    # Ciclo IX requiere Ciclo VIII
    ("SI-901", "SI-801"),
    ("SI-902", "SI-701"),

    # Ciclo X requiere Ciclo IX
    ("SI-1001", "SI-901"),
    ("SI-1002", "SI-902"),
]


class Command(BaseCommand):
    help = 'Carga datos semilla completos: malla curricular con prerrequisitos, historial de notas, horarios y usuarios.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING("Iniciando reseteo y carga completa de malla, historial y horarios EPIS..."))

        # Limpieza previa
        seleccion.objects.all().delete()
        bloque_horario.objects.all().delete()
        grupo.objects.all().delete()
        HistorialAcademico.objects.all().delete()
        Prerequisitos.objects.all().delete()

        # 0. Usuario Administrador (Consejo de Facultad)
        admin_user, _ = User.objects.get_or_create(
            username="admin",
            defaults={"email": "admin.epis@unfv.edu.pe", "first_name": "Consejo de", "last_name": "Facultad", "is_staff": True, "is_superuser": True}
        )
        admin_user.set_password("admin123")
        admin_user.save()
        PerfilUsuario.objects.get_or_create(user=admin_user, defaults={"rol": "ADMIN"})

        # 1. Periodos Académicos (Históricos y Activos)
        periodo_2024_1, _ = Periodo_Academico.objects.get_or_create(
            nombre="2024-1",
            defaults={"fecha_inicio": datetime.date(2024, 3, 15), "fecha_fin": datetime.date(2024, 7, 20)}
        )
        periodo_2024_2, _ = Periodo_Academico.objects.get_or_create(
            nombre="2024-2",
            defaults={"fecha_inicio": datetime.date(2024, 8, 15), "fecha_fin": datetime.date(2024, 12, 20)}
        )
        periodo_2025_1, _ = Periodo_Academico.objects.get_or_create(
            nombre="2025-1",
            defaults={"fecha_inicio": datetime.date(2025, 3, 15), "fecha_fin": datetime.date(2025, 7, 20)}
        )
        periodo_2025_2, _ = Periodo_Academico.objects.get_or_create(
            nombre="2025-2",
            defaults={"fecha_inicio": datetime.date(2025, 8, 15), "fecha_fin": datetime.date(2025, 12, 20)}
        )
        periodo_impar, _ = Periodo_Academico.objects.get_or_create(
            nombre="2026-1",
            defaults={"fecha_inicio": datetime.date(2026, 3, 15), "fecha_fin": datetime.date(2026, 7, 20)}
        )
        periodo_par, _ = Periodo_Academico.objects.get_or_create(
            nombre="2026-2",
            defaults={"fecha_inicio": datetime.date(2026, 8, 15), "fecha_fin": datetime.date(2026, 12, 20)}
        )

        # 2. Malla Curricular Completa EPIS - UNFV (Ciclos I al X)
        asignaturas_data = ASIGNATURAS_EPIS

        asig_objs = {}
        for a in asignaturas_data:
            obj, _ = asignatura.objects.get_or_create(codigo=a["codigo"], defaults=a)
            # Asegurar actualización de valores
            for k, v in a.items():
                setattr(obj, k, v)
            obj.malla = "2021"
            obj.save()
            asig_objs[a["codigo"]] = obj

        # 3. Prerrequisitos de la Malla Curricular
        prereqs = PREREQUISITOS_EPIS
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
                dias = ciclo_dias.get(c_nombre, ("LUNES", "MARTES"))

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
            {"codigo": "2021001001", "nombres": "Juan Pérez Gómez", "ciclo": "IV", "malla": "2021"},
            {"codigo": "2022002002", "nombres": "María López Torres", "ciclo": "II", "malla": "2021"},
            {"codigo": "2023003003", "nombres": "Carlos Sánchez Vílchez", "ciclo": "VI", "malla": "2021"},
        ]
        est_dict = {}
        for ed in estudiantes_data:
            u, _ = User.objects.get_or_create(username=ed["codigo"], defaults={"email": f"{ed['codigo']}@unfv.edu.pe", "first_name": ed["nombres"]})
            u.set_password("estudiante123")
            u.save()
            PerfilUsuario.objects.get_or_create(user=u, defaults={"rol": "ESTUDIANTE"})

            e_obj, _ = estudiante.objects.get_or_create(
                codigo_universitario=ed["codigo"],
                defaults={"nombres": ed["nombres"], "ciclo_actual": ed["ciclo"], "malla": ed["malla"], "usuario": u}
            )
            e_obj.usuario = u
            e_obj.ciclo_actual = ed["ciclo"]
            e_obj.malla = ed["malla"]
            e_obj.save()
            est_dict[ed["codigo"]] = e_obj

        # 7. Historial Académico de Notas (Cursos Aprobados en Ciclos Anteriores)
        self.stdout.write(self.style.NOTICE("Generando historial de notas y cursos aprobados..."))

        # Estudiante 1: Juan Pérez Gómez (en Ciclo IV)
        # Ha aprobado Ciclo I (2024-1), Ciclo II (2024-2) y Ciclo III (2025-1)
        juan = est_dict["2021001001"]
        historial_juan = [
            # Ciclo I en 2024-1
            ("SI-101", 16.0, periodo_2024_1),
            ("MAT-101", 14.0, periodo_2024_1),
            ("SI-102", 17.5, periodo_2024_1),
            ("COM-101", 15.0, periodo_2024_1),

            # Ciclo II en 2024-2
            ("SI-201", 15.5, periodo_2024_2),
            ("MAT-201", 13.0, periodo_2024_2),
            ("MAT-202", 16.0, periodo_2024_2),
            ("SI-202", 14.5, periodo_2024_2),

            # Ciclo III en 2025-1
            ("SI-301", 17.0, periodo_2025_1), # Desbloquea SI-401 y SI-402
            ("MAT-301", 14.0, periodo_2025_1),
            ("SI-302", 15.0, periodo_2025_1), # Desbloquea SI-403
            ("SI-303", 16.5, periodo_2025_1),
        ]
        for cod, nota, per in historial_juan:
            HistorialAcademico.objects.create(
                nota=nota,
                estado="aprobado",
                id_estudiante=juan,
                id_asignatura=asig_objs[cod],
                id_periodo=per
            )

        # Estudiante 2: María López Torres (en Ciclo II)
        # Ha aprobado Ciclo I (2025-1)
        maria = est_dict["2022002002"]
        historial_maria = [
            ("SI-101", 18.0, periodo_2025_1),
            ("MAT-101", 16.0, periodo_2025_1),
            ("SI-102", 17.0, periodo_2025_1),
            ("COM-101", 19.0, periodo_2025_1),
        ]
        for cod, nota, per in historial_maria:
            HistorialAcademico.objects.create(
                nota=nota,
                estado="aprobado",
                id_estudiante=maria,
                id_asignatura=asig_objs[cod],
                id_periodo=per
            )
        # Ampliación de créditos para María (24 créditos)
        SolicitudAmpliacion.objects.get_or_create(
            id_estudiante=maria,
            id_periodo=periodo_par,
            defaults={"creditosAdicionales": 2, "estado": "aprobada"}
        )

        # Estudiante 3: Carlos Sánchez Vílchez (en Ciclo VI)
        # Ha aprobado Ciclos I al V
        carlos = est_dict["2023003003"]
        historial_carlos = [
            # Ciclo I
            ("SI-101", 15.0, periodo_2024_1), ("MAT-101", 14.0, periodo_2024_1), ("SI-102", 16.0, periodo_2024_1), ("COM-101", 14.0, periodo_2024_1),
            # Ciclo II
            ("SI-201", 16.0, periodo_2024_2), ("MAT-201", 15.0, periodo_2024_2), ("MAT-202", 15.0, periodo_2024_2), ("SI-202", 16.0, periodo_2024_2),
            # Ciclo III
            ("SI-301", 17.0, periodo_2025_1), ("MAT-301", 14.0, periodo_2025_1), ("SI-302", 16.0, periodo_2025_1), ("SI-303", 15.0, periodo_2025_1),
            # Ciclo IV
            ("SI-401", 16.0, periodo_2025_2), ("SI-402", 17.0, periodo_2025_2), ("SI-403", 15.0, periodo_2025_2), ("SI-404", 16.0, periodo_2025_2),
            # Ciclo V
            ("SI-501", 16.5, periodo_impar), ("SI-502", 17.0, periodo_impar), ("SI-503", 15.5, periodo_impar), ("SI-504", 16.0, periodo_impar),
        ]
        for cod, nota, per in historial_carlos:
            HistorialAcademico.objects.create(
                nota=nota,
                estado="aprobado",
                id_estudiante=carlos,
                id_asignatura=asig_objs[cod],
                id_periodo=per
            )

        self.stdout.write(self.style.SUCCESS("=========================================================="))
        self.stdout.write(self.style.SUCCESS("¡Malla Curricular EPIS, dependencias y récords de notas cargados exitosamente!"))
        self.stdout.write(self.style.SUCCESS("=========================================================="))

        # 8. Cargar también la malla de prueba 2019 (selector de mallas)
        from django.core.management import call_command
        call_command('seed_malla_2019')
