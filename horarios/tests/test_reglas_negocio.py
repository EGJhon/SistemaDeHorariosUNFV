import datetime
import pytest
from concurrent.futures import ThreadPoolExecutor
from django.urls import reverse
from django.db import connections
from rest_framework import status
from rest_framework.test import APIClient

from horarios.models import (
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


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def base_data(db):
    """
    Fixture que proporciona datos base limpios para los tests de las 8 reglas.
    """
    periodo = Periodo_Academico.objects.create(
        nombre="2026-2",
        fecha_inicio=datetime.date(2026, 8, 15),
        fecha_fin=datetime.date(2026, 12, 20)
    )

    asig1 = asignatura.objects.create(
        codigo="SI-201",
        nombre="Algoritmos y Estructuras de Datos",
        creditos=4,
        horas_teoria=2,
        horas_practica=4,
        ciclo="II"
    )

    asig2 = asignatura.objects.create(
        codigo="SI-401",
        nombre="Base de Datos I",
        creditos=4,
        horas_teoria=2,
        horas_practica=4,
        ciclo="IV"
    )

    asig3 = asignatura.objects.create(
        codigo="SI-601",
        nombre="Ingeniería de Software",
        creditos=4,
        horas_teoria=3,
        horas_practica=2,
        ciclo="VI"
    )

    doc1 = docente.objects.create(nombre="Ing. Carlos Mendoza", email="cmendoza@unfv.edu.pe")
    doc2 = docente.objects.create(nombre="Dra. Ana Gutiérrez", email="agutierrez@unfv.edu.pe")

    aula1 = aula.objects.create(codigo="A3-1", tipo="Teoría")
    aula2 = aula.objects.create(codigo="LAB-101", tipo="Laboratorio")

    est1 = estudiante.objects.create(
        codigo_universitario="2021001001",
        nombres="Juan Pérez",
        ciclo_actual="VI"
    )

    est2 = estudiante.objects.create(
        codigo_universitario="2021001002",
        nombres="María López",
        ciclo_actual="VI"
    )

    grp1 = grupo.objects.create(
        turno="Mañana",
        seccion="01",
        vacantes=2,
        cupos_ocupados=0,
        id_periodo=periodo,
        codigo=asig1
    )

    grp2 = grupo.objects.create(
        turno="Mañana",
        seccion="01",
        vacantes=2,
        cupos_ocupados=0,
        id_periodo=periodo,
        codigo=asig2
    )

    grp3 = grupo.objects.create(
        turno="Tarde",
        seccion="01",
        vacantes=2,
        cupos_ocupados=0,
        id_periodo=periodo,
        codigo=asig3
    )

    # Bloques de horario
    # grp1 (SI-201): Lunes 08:00 - 10:00
    bh1 = bloque_horario.objects.create(
        dia_semana="LUNES",
        hora_inicio=datetime.time(8, 0),
        hora_fin=datetime.time(10, 0),
        id_grupo=grp1,
        id_aula=aula1,
        id_docente=doc1
    )

    # grp2 (SI-401): Lunes 09:00 - 11:00 (se traslapa con grp1 el Lunes)
    bh2 = bloque_horario.objects.create(
        dia_semana="LUNES",
        hora_inicio=datetime.time(9, 0),
        hora_fin=datetime.time(11, 0),
        id_grupo=grp2,
        id_aula=aula2,
        id_docente=doc2
    )

    # grp3 (SI-601): Martes 14:00 - 16:00 (sin traslape)
    bh3 = bloque_horario.objects.create(
        dia_semana="MARTES",
        hora_inicio=datetime.time(14, 0),
        hora_fin=datetime.time(16, 0),
        id_grupo=grp3,
        id_aula=aula1,
        id_docente=None
    )

    return {
        "periodo": periodo,
        "asig1": asig1,
        "asig2": asig2,
        "asig3": asig3,
        "doc1": doc1,
        "doc2": doc2,
        "aula1": aula1,
        "aula2": aula2,
        "est1": est1,
        "est2": est2,
        "grp1": grp1,
        "grp2": grp2,
        "grp3": grp3,
        "bh1": bh1,
        "bh2": bh2,
        "bh3": bh3,
    }


# ============================================================================
# REGLA 1: Unicidad de selección
# ============================================================================
@pytest.mark.django_db
def test_regla_1_unicidad_seleccion(client, base_data):
    """
    Un estudiante no puede tener dos selecciones activas para la misma asignatura en el mismo periodo.
    Permite volver a seleccionar si la selección previa fue anulada.
    """
    url = reverse('seleccion-list')
    payload = {
        "id_estudiante": base_data["est1"].id,
        "id_grupo": base_data["grp1"].id
    }

    # 1. Primera selección exitosa
    res1 = client.post(url, payload, format='json')
    assert res1.status_code == status.HTTP_201_CREATED
    assert res1.data['estado'] == 'confirmada'
    sel_id = res1.data['id']

    # 2. Intento de re-seleccionar la misma asignatura -> Debe fallar con 400
    res2 = client.post(url, payload, format='json')
    assert res2.status_code == status.HTTP_400_BAD_REQUEST

    # 3. Anular la primera selección
    anular_url = reverse('seleccion-anular', kwargs={'pk': sel_id})
    res_anular = client.post(anular_url)
    assert res_anular.status_code == status.HTTP_200_OK
    assert res_anular.data['estado'] == 'anulada'

    # 4. Volver a seleccionar tras anular -> Debe ser exitoso
    res3 = client.post(url, payload, format='json')
    assert res3.status_code == status.HTTP_201_CREATED
    assert res3.data['estado'] == 'confirmada'


# ============================================================================
# REGLA 2: Cruce de horario del estudiante
# ============================================================================
@pytest.mark.django_db
def test_regla_2_cruce_horario_estudiante(client, base_data):
    """
    Valida que ningún bloque del nuevo grupo se traslape con los bloques de los grupos activos ya seleccionados.
    """
    url = reverse('seleccion-list')

    # Seleccionar Grupo 1 (Lunes 08:00 - 10:00)
    res1 = client.post(url, {"id_estudiante": base_data["est1"].id, "id_grupo": base_data["grp1"].id}, format='json')
    assert res1.status_code == status.HTTP_201_CREATED

    # Intentar seleccionar Grupo 2 (Lunes 09:00 - 11:00) -> Traslape el lunes -> Falla 400
    res2 = client.post(url, {"id_estudiante": base_data["est1"].id, "id_grupo": base_data["grp2"].id}, format='json')
    assert res2.status_code == status.HTTP_400_BAD_REQUEST
    assert "cruce de horario" in str(res2.data).lower()

    # Seleccionar Grupo 3 (Martes 14:00 - 16:00) -> Sin traslape -> Exitoso
    res3 = client.post(url, {"id_estudiante": base_data["est1"].id, "id_grupo": base_data["grp3"].id}, format='json')
    assert res3.status_code == status.HTTP_201_CREATED


# ============================================================================
# REGLA 3: Cupo del grupo
# ============================================================================
@pytest.mark.django_db
def test_regla_3_cupo_grupo(client, base_data):
    """
    Valida que cupos_ocupados < vacantes y actualiza el contador dentro de la transacción.
    """
    url = reverse('seleccion-list')
    grp = base_data["grp1"]  # Vacantes = 2

    # Estudiante 1 se matricula
    res1 = client.post(url, {"id_estudiante": base_data["est1"].id, "id_grupo": grp.id}, format='json')
    assert res1.status_code == status.HTTP_201_CREATED

    grp.refresh_from_db()
    assert grp.cupos_ocupados == 1

    # Estudiante 2 se matricula
    res2 = client.post(url, {"id_estudiante": base_data["est2"].id, "id_grupo": grp.id}, format='json')
    assert res2.status_code == status.HTTP_201_CREATED

    grp.refresh_from_db()
    assert grp.cupos_ocupados == 2

    # Estudiante 3 intenta matricularse pero el grupo está lleno -> Falla 400
    est3 = estudiante.objects.create(codigo_universitario="2021001003", nombres="Pedro Picapiedra", ciclo_actual="VI")
    res3 = client.post(url, {"id_estudiante": est3.id, "id_grupo": grp.id}, format='json')
    assert res3.status_code == status.HTTP_400_BAD_REQUEST
    assert "vacantes" in str(res3.data).lower()


# ============================================================================
# REGLA 4: Prerrequisitos
# ============================================================================
@pytest.mark.django_db
def test_regla_4_prerrequisitos(client, base_data):
    """
    SI-401 requiere SI-201. Si el estudiante no ha aprobado SI-201 en HistorialAcademico, la selección de SI-401 debe fallar.
    """
    url = reverse('seleccion-list')
    # Crear prerrequisito: SI-401 requiere SI-201
    Prerequisitos.objects.create(
        asignatura_codigo=base_data["asig2"],
        asignatura_requisito=base_data["asig1"]
    )

    # Intento 1: Estudiante sin historial intenta matricularse en SI-401 (grp2) -> Falla 400
    res1 = client.post(url, {"id_estudiante": base_data["est1"].id, "id_grupo": base_data["grp2"].id}, format='json')
    assert res1.status_code == status.HTTP_400_BAD_REQUEST
    assert "prerrequisitos" in str(res1.data).lower()

    # Agregar historial aprobado de SI-201 para Estudiante 1
    HistorialAcademico.objects.create(
        id_estudiante=base_data["est1"],
        id_asignatura=base_data["asig1"],
        id_periodo=base_data["periodo"],
        nota=15.0,
        estado="aprobado"
    )

    # Intento 2: Matrícula exitosa tras cumplir prerrequisitos
    res2 = client.post(url, {"id_estudiante": base_data["est1"].id, "id_grupo": base_data["grp2"].id}, format='json')
    assert res2.status_code == status.HTTP_201_CREATED


# ============================================================================
# REGLA 5: Límite de créditos
# ============================================================================
@pytest.mark.django_db
def test_regla_5_limite_creditos(client, base_data):
    """
    Máximo 22 créditos sin ampliación aprobada, máximo 24 con ampliación aprobada (+2 cr).
    """
    url = reverse('seleccion-list')
    est = base_data["est1"]
    periodo = base_data["periodo"]

    # Crear 5 asignaturas de 5 créditos cada una (Total = 25 cr)
    cursos = []
    grupos = []
    for i in range(1, 6):
        asig = asignatura.objects.create(
            codigo=f"CURSO-{i}",
            nombre=f"Curso Prueba {i}",
            creditos=5,
            horas_teoria=3,
            horas_practica=2,
            ciclo="VI"
        )
        grp = grupo.objects.create(
            turno="Noche",
            seccion="01",
            vacantes=30,
            id_periodo=periodo,
            codigo=asig
        )
        # Bloques en días distintos para evitar cruce de horario
        bloque_horario.objects.create(
            dia_semana=f"DIA_{i}",
            hora_inicio=datetime.time(8, 0),
            hora_fin=datetime.time(10, 0),
            id_grupo=grp,
            id_aula=base_data["aula1"]
        )
        cursos.append(asig)
        grupos.append(grp)

    # Matricular 4 cursos = 20 créditos (dentro del límite de 22)
    for i in range(4):
        res = client.post(url, {"id_estudiante": est.id, "id_grupo": grupos[i].id}, format='json')
        assert res.status_code == status.HTTP_201_CREATED

    # Intentar matricular el 5to curso (+5 cr = 25 cr) -> Supera 22 -> Falla 400
    res_fail = client.post(url, {"id_estudiante": est.id, "id_grupo": grupos[4].id}, format='json')
    assert res_fail.status_code == status.HTTP_400_BAD_REQUEST
    assert "máximo permitido" in str(res_fail.data).lower()

    # Aprobar solicitud de ampliación (+2 créditos -> Máximo 24 cr)
    SolicitudAmpliacion.objects.create(
        id_estudiante=est,
        id_periodo=periodo,
        creditosAdicionales=2,
        estado="aprobada"
    )

    # Intentar matricular curso de 4 créditos (grp3 = 4 cr -> Total 24 cr) -> Debe permitirlo
    res_amp = client.post(url, {"id_estudiante": est.id, "id_grupo": base_data["grp3"].id}, format='json')
    assert res_amp.status_code == status.HTTP_201_CREATED


# ============================================================================
# REGLA 6: Creación del horario general sin docente
# ============================================================================
@pytest.mark.django_db
def test_regla_6_creacion_horario_general_sin_docente(client, base_data):
    """
    POST /api/bloques-horario/ crea el bloque con id_docente = null.
    Valida traslape de aula y disponibilidad_aula.
    """
    url = reverse('bloque-horario-list')
    periodo = base_data["periodo"]
    aula1 = base_data["aula1"]

    # 1. Declarar disponibilidad del Aula1 (Lunes de 08:00 a 12:00)
    disponibilidad_aula.objects.create(
        id_aula=aula1,
        id_periodo=periodo,
        dia_semana="MIERCOLES",
        hora_inicio=datetime.time(8, 0),
        hora_fin=datetime.time(12, 0)
    )

    # 2. Crear bloque dentro del horario disponible (Miércoles 08:00 - 10:00) -> Éxito
    payload_ok = {
        "id_grupo": base_data["grp3"].id,
        "dia_semana": "MIERCOLES",
        "hora_inicio": "08:00:00",
        "hora_fin": "10:00:00",
        "id_aula": aula1.id
    }
    res_ok = client.post(url, payload_ok, format='json')
    assert res_ok.status_code == status.HTTP_201_CREATED
    assert res_ok.data['id_docente'] is None

    # 3. Intentar crear bloque fuera de la disponibilidad (Miércoles 14:00 - 16:00) -> Falla 400
    payload_out = {
        "id_grupo": base_data["grp3"].id,
        "dia_semana": "MIERCOLES",
        "hora_inicio": "14:00:00",
        "hora_fin": "16:00:00",
        "id_aula": aula1.id
    }
    res_out = client.post(url, payload_out, format='json')
    assert res_out.status_code == status.HTTP_400_BAD_REQUEST

    # 4. Intentar crear bloque traslapado en la misma aula (Miércoles 09:00 - 11:00) -> Falla 400
    payload_overlap = {
        "id_grupo": base_data["grp2"].id,
        "dia_semana": "MIERCOLES",
        "hora_inicio": "09:00:00",
        "hora_fin": "11:00:00",
        "id_aula": aula1.id
    }
    res_overlap = client.post(url, payload_overlap, format='json')
    assert res_overlap.status_code == status.HTTP_400_BAD_REQUEST


# ============================================================================
# REGLA 7: Elección de bloque por el docente
# ============================================================================
@pytest.mark.django_db
def test_regla_7_eleccion_bloque_docente(client, base_data):
    """
    PATCH /api/bloques-horario/{id}/asignar-docente/ asigna docente a bloque.
    Valida id_docente is None y traslapes del docente.
    """
    bh3 = base_data["bh3"]  # Martes 14:00 - 16:00, id_docente = None
    doc1 = base_data["doc1"]
    url = reverse('bloque-horario-asignar-docente', kwargs={'pk': bh3.id})

    # 1. Asignar docente exitosamente
    res = client.patch(url, {"id_docente": doc1.id}, format='json')
    assert res.status_code == status.HTTP_200_OK
    assert res.data['id_docente'] == doc1.id

    # 2. Intentar volver a asignar docente a un bloque ya asignado -> Falla 400
    res_repeat = client.patch(url, {"id_docente": base_data["doc2"].id}, format='json')
    assert res_repeat.status_code == status.HTTP_400_BAD_REQUEST

    # 3. Intentar asignar un bloque traslapado al docente 1
    # Crear un bloque nuevo el Lunes 08:00 - 10:00 (doc1 ya tiene bh1 el Lunes 08:00 - 10:00)
    bh_conflict = bloque_horario.objects.create(
        dia_semana="LUNES",
        hora_inicio=datetime.time(8, 30),
        hora_fin=datetime.time(10, 30),
        id_grupo=base_data["grp3"],
        id_aula=base_data["aula2"],
        id_docente=None
    )
    url_conflict = reverse('bloque-horario-asignar-docente', kwargs={'pk': bh_conflict.id})
    res_conflict = client.patch(url_conflict, {"id_docente": doc1.id}, format='json')
    assert res_conflict.status_code == status.HTTP_400_BAD_REQUEST


# ============================================================================
# REGLA 8: Consulta del horario general
# ============================================================================
@pytest.mark.django_db
def test_regla_8_consulta_horario_general(client, base_data):
    """
    GET /api/horario-general/?periodo=&ciclo= devuelve los bloques agrupados por asignatura y grupo.
    """
    url = reverse('horario-general')
    periodo_id = base_data["periodo"].id

    # Consulta con periodo
    res = client.get(f"{url}?periodo={periodo_id}")
    assert res.status_code == status.HTTP_200_OK
    data = res.data
    assert isinstance(data, list)
    assert len(data) >= 3

    # Verificar estructura agrupada
    item = data[0]
    assert "codigo_asignatura" in item
    assert "nombre_asignatura" in item
    assert "ciclo" in item
    assert "grupo_id" in item
    assert "bloques" in item
    assert isinstance(item["bloques"], list)

    # Consulta filtrando por ciclo II
    res_ciclo = client.get(f"{url}?periodo={periodo_id}&ciclo=II")
    assert res_ciclo.status_code == status.HTTP_200_OK
    for elem in res_ciclo.data:
        assert elem["ciclo"] == "II"


# ============================================================================
# TESTS ADICIONALES: Concurrencia e Idempotencia solicitados por el usuario
# ============================================================================
@pytest.mark.django_db
def test_anulacion_idempotente_y_liberacion(client, base_data):
    """
    Valida que anular_seleccion sea idempotente y que, tras anular, los bloques y créditos de la selección
    ya no cuenten para un nuevo cruce ni para la suma de créditos.
    """
    url_sel = reverse('seleccion-list')

    # 1. Crear selección de Grupo 1 (Lunes 08:00 - 10:00, 4 créditos)
    res_crear = client.post(url_sel, {"id_estudiante": base_data["est1"].id, "id_grupo": base_data["grp1"].id}, format='json')
    assert res_crear.status_code == status.HTTP_201_CREATED
    sel_id = res_crear.data['id']

    base_data["grp1"].refresh_from_db()
    assert base_data["grp1"].cupos_ocupados == 1

    # 2. Anular selección por primera vez
    url_anular = reverse('seleccion-anular', kwargs={'pk': sel_id})
    res_anular1 = client.post(url_anular)
    assert res_anular1.status_code == status.HTTP_200_OK
    assert res_anular1.data['estado'] == 'anulada'

    base_data["grp1"].refresh_from_db()
    assert base_data["grp1"].cupos_ocupados == 0

    # 3. Anular por segunda vez -> Debe indicar error 400 y NO decrementar cupos a negativo
    res_anular2 = client.post(url_anular)
    assert res_anular2.status_code == status.HTTP_400_BAD_REQUEST

    base_data["grp1"].refresh_from_db()
    assert base_data["grp1"].cupos_ocupados == 0

    # 4. Verificar que tras anular, Grupo 2 (que se traslapaba con Grupo 1 el Lunes) AHORA SÍ pueda ser seleccionado
    res_grupo2 = client.post(url_sel, {"id_estudiante": base_data["est1"].id, "id_grupo": base_data["grp2"].id}, format='json')
    assert res_grupo2.status_code == status.HTTP_201_CREATED


@pytest.mark.django_db(transaction=True)
def test_concurrencia_docente_bloques_traslapados(base_data):
    """
    Simula a un mismo docente intentando reclamar dos bloques traslapados casi al mismo tiempo.
    El bloqueo con select_for_update() en Docente fuerza la serialización y la segunda asignación debe fallar.
    """
    from horarios.services import asignar_docente_bloque
    from rest_framework.exceptions import ValidationError

    doc = base_data["doc1"]
    bh1 = base_data["bh1"]  # Lunes 08:00 - 10:00

    # Crear otro bloque libre que se traslape con bh1 (Lunes 09:00 - 11:00)
    bh_traslapado = bloque_horario.objects.create(
        dia_semana="LUNES",
        hora_inicio=datetime.time(9, 0),
        hora_fin=datetime.time(11, 0),
        id_grupo=base_data["grp3"],
        id_aula=base_data["aula2"],
        id_docente=None
    )
    # Liberar bh1 para el test
    bh1.id_docente = None
    bh1.save()

    def task1():
        connections.close_all()
        return asignar_docente_bloque(bloque_id=bh1.id, docente_id=doc.id)

    def task2():
        connections.close_all()
        return asignar_docente_bloque(bloque_id=bh_traslapado.id, docente_id=doc.id)

    results = []
    errors = []

    with ThreadPoolExecutor(max_workers=2) as executor:
        f1 = executor.submit(task1)
        f2 = executor.submit(task2)

        for f in [f1, f2]:
            try:
                res = f.result()
                results.append(res)
            except Exception as e:
                errors.append(e)

    assert len(results) == 1
    assert len(errors) == 1
    assert isinstance(errors[0], ValidationError)


@pytest.mark.django_db(transaction=True)
def test_concurrencia_estudiante_cruce_horario(base_data):
    """
    Simula dos selecciones simultáneas del mismo estudiante con grupos traslapados.
    El bloqueo con select_for_update() en Estudiante fuerza la serialización y una de las dos falla por cruce de horario.
    """
    from horarios.services import crear_seleccion
    from rest_framework.exceptions import ValidationError

    est = base_data["est1"]
    grp1 = base_data["grp1"]  # Lunes 08:00 - 10:00
    grp2 = base_data["grp2"]  # Lunes 09:00 - 11:00 (traslapados)

    def select_g1():
        connections.close_all()
        return crear_seleccion(estudiante_id=est.id, grupo_id=grp1.id)

    def select_g2():
        connections.close_all()
        return crear_seleccion(estudiante_id=est.id, grupo_id=grp2.id)

    results = []
    errors = []

    with ThreadPoolExecutor(max_workers=2) as executor:
        f1 = executor.submit(select_g1)
        f2 = executor.submit(select_g2)

        for f in [f1, f2]:
            try:
                res = f.result()
                results.append(res)
            except Exception as e:
                errors.append(e)

    assert len(results) == 1
    assert len(errors) == 1
    assert isinstance(errors[0], ValidationError)
