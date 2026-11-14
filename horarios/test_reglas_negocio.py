import pytest
import datetime
from django.contrib.auth.models import User
from rest_framework.exceptions import ValidationError

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
from horarios.services import (
    crear_seleccion,
    anular_seleccion,
    crear_bloque_horario,
    modificar_bloque_horario,
    eliminar_bloque_horario,
    asignar_docente_bloque,
    obtener_horario_general,
    obtener_historial_estudiante,
    obtener_estado_malla_estudiante,
    obtener_oferta_habilitada_estudiante,
)


@pytest.fixture
def setup_datos(db):
    """Fixture para inicializar entidades base para pruebas."""
    periodo = Periodo_Academico.objects.create(
        nombre="2026-2",
        fecha_inicio=datetime.date(2026, 8, 15),
        fecha_fin=datetime.date(2026, 12, 20)
    )

    aula1 = aula.objects.create(codigo="A3-1", tipo="Teoría")
    aula2 = aula.objects.create(codigo="LAB-01", tipo="Laboratorio")

    user_doc = User.objects.create_user(username="prof_garcia", password="password123")
    doc1 = docente.objects.create(nombre="Dr. Juan García", email="jgarcia@unfv.edu.pe", usuario=user_doc)

    user_est = User.objects.create_user(username="2021001001", password="password123")
    est1 = estudiante.objects.create(codigo_universitario="2021001001", nombres="Carlos Mendoza", ciclo_actual="IV", usuario=user_est)

    # Asignaturas
    asig_base = asignatura.objects.create(codigo="SI-201", nombre="Programación I", creditos=4, horas_teoria=2, horas_practica=2, ciclo="II")
    asig_avanzada = asignatura.objects.create(codigo="SI-401", nombre="Algoritmos y Estructuras de Datos", creditos=5, horas_teoria=3, horas_practica=2, ciclo="IV")
    asig_otra = asignatura.objects.create(codigo="SI-402", nombre="Bases de Datos", creditos=4, horas_teoria=2, horas_practica=2, ciclo="IV")

    # Prerrequisito: SI-401 requiere SI-201
    Prerequisitos.objects.create(asignatura_codigo=asig_avanzada, asignatura_requisito=asig_base)

    # Grupos
    grupo1 = grupo.objects.create(turno="Mañana", seccion="A", vacantes=30, cupos_ocupados=0, id_periodo=periodo, codigo=asig_base)
    grupo2 = grupo.objects.create(turno="Mañana", seccion="A", vacantes=25, cupos_ocupados=0, id_periodo=periodo, codigo=asig_avanzada)
    grupo3 = grupo.objects.create(turno="Tarde", seccion="B", vacantes=1, cupos_ocupados=0, id_periodo=periodo, codigo=asig_otra)

    # Bloques de horario
    b1 = bloque_horario.objects.create(
        dia_semana="LUNES",
        hora_inicio=datetime.time(8, 0),
        hora_fin=datetime.time(9, 40),
        id_grupo=grupo1,
        id_aula=aula1,
        id_docente=None
    )

    return {
        "periodo": periodo,
        "aula1": aula1,
        "aula2": aula2,
        "doc1": doc1,
        "est1": est1,
        "asig_base": asig_base,
        "asig_avanzada": asig_avanzada,
        "asig_otra": asig_otra,
        "grupo1": grupo1,
        "grupo2": grupo2,
        "grupo3": grupo3,
        "b1": b1,
    }


@pytest.mark.django_db
def test_regla_1_unicidad_seleccion(setup_datos):
    """REGLA 1: Un estudiante no puede seleccionar la misma asignatura dos veces en el mismo periodo."""
    d = setup_datos
    sel1 = crear_seleccion(estudiante_id=d["est1"].id, grupo_id=d["grupo1"].id)
    assert sel1.estado == "confirmada"

    with pytest.raises(ValidationError, match="ya tiene una selección activa"):
        crear_seleccion(estudiante_id=d["est1"].id, grupo_id=d["grupo1"].id)


@pytest.mark.django_db
def test_regla_2_cruce_horarios(setup_datos):
    """REGLA 2: No se permite matrícula con cruce de horario con otra asignatura del estudiante."""
    d = setup_datos
    # grupo2 tiene bloque el lunes 09:00 a 10:40 (se traslapa con 08:00 a 09:40 de grupo1)
    bloque_horario.objects.create(
        dia_semana="LUNES",
        hora_inicio=datetime.time(9, 0),
        hora_fin=datetime.time(10, 40),
        id_grupo=d["grupo2"],
        id_aula=d["aula2"],
        id_docente=None
    )
    # Aprobar prerrequisito para poder probar el cruce
    HistorialAcademico.objects.create(
        nota=15.0,
        estado="aprobado",
        id_estudiante=d["est1"],
        id_asignatura=d["asig_base"],
        id_periodo=d["periodo"]
    )

    crear_seleccion(estudiante_id=d["est1"].id, grupo_id=d["grupo1"].id)

    with pytest.raises(ValidationError, match="cruce de horario"):
        crear_seleccion(estudiante_id=d["est1"].id, grupo_id=d["grupo2"].id)


@pytest.mark.django_db
def test_regla_3_cupos_vacantes(setup_datos):
    """REGLA 3: Control estricto de cupos y decremento al anular."""
    d = setup_datos
    # grupo3 tiene solo 1 vacante
    sel = crear_seleccion(estudiante_id=d["est1"].id, grupo_id=d["grupo3"].id)
    d["grupo3"].refresh_from_db()
    assert d["grupo3"].cupos_ocupados == 1

    # Otro estudiante intenta matricularse en grupo lleno
    user2 = User.objects.create_user(username="2021001002", password="password123")
    est2 = estudiante.objects.create(codigo_universitario="2021001002", nombres="Ana Torres", ciclo_actual="IV", usuario=user2)

    with pytest.raises(ValidationError, match="no cuenta con vacantes disponibles"):
        crear_seleccion(estudiante_id=est2.id, grupo_id=d["grupo3"].id)

    # Al anular la selección del estudiante 1, la vacante queda libre
    anular_seleccion(seleccion_id=sel.id)
    d["grupo3"].refresh_from_db()
    assert d["grupo3"].cupos_ocupados == 0


@pytest.mark.django_db
def test_regla_4_prerrequisitos(setup_datos):
    """REGLA 4: Validación de prerrequisitos aprobados en el historial académico."""
    d = setup_datos
    # Sin aprobar SI-201, no puede llevar SI-401
    with pytest.raises(ValidationError, match="no cumple con los prerrequisitos aprobados"):
        crear_seleccion(estudiante_id=d["est1"].id, grupo_id=d["grupo2"].id)

    # Ahora aprobamos SI-201 en el historial
    HistorialAcademico.objects.create(
        nota=14.0,
        estado="aprobado",
        id_estudiante=d["est1"],
        id_asignatura=d["asig_base"],
        id_periodo=d["periodo"]
    )
    sel = crear_seleccion(estudiante_id=d["est1"].id, grupo_id=d["grupo2"].id)
    assert sel.estado == "confirmada"


@pytest.mark.django_db
def test_regla_5_limite_creditos_y_ampliacion(setup_datos):
    """REGLA 5: Límite regular de 22 créditos y ampliación a 24."""
    d = setup_datos
    # Creamos materias grandes que sumen más de 22 créditos
    asig1 = asignatura.objects.create(codigo="C1", nombre="Curso 1", creditos=10, horas_teoria=5, horas_practica=5, ciclo="IV")
    asig2 = asignatura.objects.create(codigo="C2", nombre="Curso 2", creditos=10, horas_teoria=5, horas_practica=5, ciclo="IV")
    asig3 = asignatura.objects.create(codigo="C3", nombre="Curso 3", creditos=3, horas_teoria=2, horas_practica=1, ciclo="IV")

    g1 = grupo.objects.create(turno="M", seccion="A", vacantes=20, id_periodo=d["periodo"], codigo=asig1)
    g2 = grupo.objects.create(turno="M", seccion="A", vacantes=20, id_periodo=d["periodo"], codigo=asig2)
    g3 = grupo.objects.create(turno="M", seccion="A", vacantes=20, id_periodo=d["periodo"], codigo=asig3)

    crear_seleccion(d["est1"].id, g1.id) # 10 cr
    crear_seleccion(d["est1"].id, g2.id) # +10 cr = 20 cr

    # Intentar llevar 3 créditos más = 23 créditos (excede el máximo regular de 22)
    with pytest.raises(ValidationError, match="excede el máximo permitido"):
        crear_seleccion(d["est1"].id, g3.id)

    # Otorgar ampliación aprobada de 2 créditos (máx 24)
    SolicitudAmpliacion.objects.create(
        creditosAdicionales=2,
        estado="aprobada",
        id_estudiante=d["est1"],
        id_periodo=d["periodo"]
    )

    # Ahora sí debe permitir los 23 créditos
    sel3 = crear_seleccion(d["est1"].id, g3.id)
    assert sel3.estado == "confirmada"


@pytest.mark.django_db
def test_regla_6_crear_bloque_aula_traslape(setup_datos):
    """REGLA 6: Validación de traslapes en aula y creación de bloque sin docente."""
    d = setup_datos
    # d['b1'] está en aula1 el LUNES 08:00 a 09:40
    with pytest.raises(ValidationError, match="ya está ocupada"):
        crear_bloque_horario(
            grupo_id=d["grupo2"].id,
            dia_semana="LUNES",
            hora_inicio=datetime.time(9, 0),
            hora_fin=datetime.time(10, 0),
            aula_id=d["aula1"].id
        )

    # En aula2 no hay conflicto
    b_nuevo = crear_bloque_horario(
        grupo_id=d["grupo2"].id,
        dia_semana="LUNES",
        hora_inicio=datetime.time(9, 0),
        hora_fin=datetime.time(10, 0),
        aula_id=d["aula2"].id
    )
    assert b_nuevo.id_docente is None
    assert b_nuevo.id_aula == d["aula2"]


@pytest.mark.django_db
def test_regla_7_asignar_docente_cruce(setup_datos):
    """REGLA 7: Asignación de docente y prevención de cruce de horario del docente."""
    d = setup_datos
    # Asignar doc1 a b1 (Lunes 08:00 - 09:40)
    asignar_docente_bloque(bloque_id=d["b1"].id, docente_id=d["doc1"].id)
    d["b1"].refresh_from_db()
    assert d["b1"].id_docente == d["doc1"]

    # Crear otro bloque en aula2 el Lunes 09:00 - 10:40
    b2 = bloque_horario.objects.create(
        dia_semana="LUNES",
        hora_inicio=datetime.time(9, 0),
        hora_fin=datetime.time(10, 40),
        id_grupo=d["grupo2"],
        id_aula=d["aula2"],
        id_docente=None
    )

    # Intentar asignar al mismo docente en horario traslapado
    with pytest.raises(ValidationError, match="ya tiene un bloque asignado"):
        asignar_docente_bloque(bloque_id=b2.id, docente_id=d["doc1"].id)


@pytest.mark.django_db
def test_modificar_y_eliminar_bloque_horario(setup_datos):
    """Prueba de modificación y eliminación de bloque horario en el panel admin."""
    d = setup_datos
    b1 = d["b1"]

    # Modificar día y hora
    modificado = modificar_bloque_horario(
        bloque_id=b1.id,
        dia_semana="MIERCOLES",
        hora_inicio=datetime.time(10, 0),
        hora_fin=datetime.time(11, 40),
        aula_id=d["aula2"].id,
        docente_id=d["doc1"].id
    )

    assert modificado.dia_semana == "MIERCOLES"
    assert modificado.id_aula == d["aula2"]
    assert modificado.id_docente == d["doc1"]

    # Desasignar docente
    sin_doc = modificar_bloque_horario(
        bloque_id=b1.id,
        desasignar_docente=True
    )
    assert sin_doc.id_docente is None

    # Eliminar bloque
    bloque_id = b1.id
    res = eliminar_bloque_horario(bloque_id)
    assert res is True
    assert not bloque_horario.objects.filter(pk=bloque_id).exists()


@pytest.mark.django_db
def test_regla_8_horario_general_agrupado(setup_datos):
    """REGLA 8: Consulta consolidada de horario general."""
    d = setup_datos
    horario = obtener_horario_general(periodo_id=d["periodo"].id)
    assert isinstance(horario, list)
    assert len(horario) >= 1
    item = horario[0]
    assert "codigo_asignatura" in item
    assert "bloques" in item


@pytest.mark.django_db
def test_historial_malla_y_oferta_habilitada(setup_datos):
    """Prueba del cálculo de historial de notas, estado de malla y filtrado de oferta habilitada por prerrequisitos."""
    d = setup_datos
    est = d["est1"]

    # Crear bloque para grupo2 (SI-401) para que forme parte de la oferta del horario general
    bloque_horario.objects.create(
        id_grupo=d["grupo2"],
        dia_semana="MARTES",
        hora_inicio=datetime.time(8, 0),
        hora_fin=datetime.time(9, 40),
        id_aula=d["aula2"],
        id_docente=None
    )

    # Inicialmente sin historial: SI-401 (avanzada) requiere SI-201 (base)
    oferta = obtener_oferta_habilitada_estudiante(estudiante_id=est.id, periodo_id=d["periodo"].id)
    item_avanzada = next((o for o in oferta if o["codigo_asignatura"] == d["asig_avanzada"].codigo), None)
    assert item_avanzada is not None
    assert item_avanzada["cumple_prerrequisitos"] is False
    assert item_avanzada["habilitado_para_matricula"] is False
    assert len(item_avanzada["prerrequisitos_faltantes"]) == 1

    # Registrar aprobación de SI-201 con nota 16.0
    HistorialAcademico.objects.create(
        nota=16.0,
        estado="aprobado",
        id_estudiante=est,
        id_asignatura=d["asig_base"],
        id_periodo=d["periodo"]
    )

    # Verificar historial
    hist = list(obtener_historial_estudiante(est.id))
    assert len(hist) == 1
    assert hist[0].nota == 16.0
    assert hist[0].id_asignatura == d["asig_base"]

    # Verificar malla curricular
    malla = obtener_estado_malla_estudiante(est.id)
    malla_base = next((m for m in malla if m["codigo"] == d["asig_base"].codigo), None)
    malla_avanzada = next((m for m in malla if m["codigo"] == d["asig_avanzada"].codigo), None)
    assert malla_base["estado"] == "aprobado"
    assert malla_base["nota"] == 16.0
    assert malla_avanzada["estado"] == "habilitado"

    # Verificar oferta habilitada ahora que aprobó el prerrequisito
    oferta_post = obtener_oferta_habilitada_estudiante(estudiante_id=est.id, periodo_id=d["periodo"].id)
    item_avanzada_post = next((o for o in oferta_post if o["codigo_asignatura"] == d["asig_avanzada"].codigo), None)
    assert item_avanzada_post["cumple_prerrequisitos"] is True
    assert item_avanzada_post["habilitado_para_matricula"] is True
    assert len(item_avanzada_post["prerrequisitos_cumplidos"]) == 1
