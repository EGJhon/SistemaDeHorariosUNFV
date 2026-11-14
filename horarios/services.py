from django.db import transaction, IntegrityError
from rest_framework.exceptions import ValidationError
from .models import (
    estudiante,
    asignatura,
    grupo,
    seleccion,
    bloque_horario,
    disponibilidad_aula,
    Prerequisitos,
    HistorialAcademico,
    SolicitudAmpliacion,
    docente,
    aula,
    Periodo_Academico,
)


def crear_seleccion(estudiante_id, grupo_id):
    """
    Crea una selección de grupo para un estudiante ejecutando las 5 reglas de negocio.
    Usa transacciones y select_for_update() en Estudiante y Grupo para evitar condiciones de carrera.
    """
    with transaction.atomic():
        try:
            est = estudiante.objects.select_for_update().get(pk=estudiante_id)
        except estudiante.DoesNotExist:
            raise ValidationError({"estudiante": "El estudiante especificado no existe."})

        try:
            g = grupo.objects.select_for_update().get(pk=grupo_id)
        except grupo.DoesNotExist:
            raise ValidationError({"grupo": "El grupo especificado no existe."})

        periodo = g.id_periodo
        asig = g.codigo

        # REGLA 0: La asignatura debe pertenecer a la malla curricular del estudiante
        if asig.malla != est.malla:
            raise ValidationError(
                f"La asignatura {asig.codigo} pertenece a la malla {asig.malla}, "
                f"mientras que el estudiante cursa la malla {est.malla}."
            )

        # REGLA 1: Unicidad de selección activa por asignatura en el mismo periodo
        if seleccion.objects.filter(
            id_estudiante=est,
            id_asignatura=asig,
            id_periodo=periodo,
            estado__in=['pendiente', 'confirmada']
        ).exists():
            raise ValidationError("El estudiante ya tiene una selección activa para esta asignatura en este periodo.")

        # REGLA 2: Cruce de horario del estudiante con sus selecciones activas
        nuevos_bloques = list(g.bloques.all())
        selecciones_activas = seleccion.objects.filter(
            id_estudiante=est,
            id_periodo=periodo,
            estado__in=['pendiente', 'confirmada']
        )
        grupos_activos_ids = selecciones_activas.values_list('id_grupo_id', flat=True)
        bloques_existentes = bloque_horario.objects.filter(id_grupo_id__in=grupos_activos_ids)

        for nb in nuevos_bloques:
            for be in bloques_existentes:
                if nb.dia_semana.upper() == be.dia_semana.upper():
                    if nb.hora_inicio < be.hora_fin and nb.hora_fin > be.hora_inicio:
                        raise ValidationError(
                            f"Existe un cruce de horario el día {nb.dia_semana} "
                            f"({nb.hora_inicio}-{nb.hora_fin}) con otra asignatura ya seleccionada."
                        )

        # REGLA 3: Cupo del grupo
        if g.cupos_ocupados >= g.vacantes:
            raise ValidationError("El grupo seleccionado no cuenta con vacantes disponibles.")

        # REGLA 4: Prerrequisitos
        reqs = list(Prerequisitos.objects.filter(asignatura_codigo=asig).values_list('asignatura_requisito_id', flat=True))
        if reqs:
            aprobadas = set(
                HistorialAcademico.objects.filter(
                    id_estudiante=est,
                    id_asignatura_id__in=reqs,
                    estado='aprobado'
                ).values_list('id_asignatura_id', flat=True)
            )
            faltantes = set(reqs) - aprobadas
            if faltantes:
                raise ValidationError(f"El estudiante no cumple con los prerrequisitos aprobados ({', '.join(faltantes)}).")

        # REGLA 5: Límite de créditos
        creditos_actuales = sum(s.id_grupo.codigo.creditos for s in selecciones_activas.select_related('id_grupo__codigo'))
        creditos_totales = creditos_actuales + asig.creditos

        ampliacion = SolicitudAmpliacion.objects.filter(
            id_estudiante=est,
            id_periodo=periodo,
            estado='aprobada'
        ).first()

        max_creditos = 22
        if ampliacion:
            max_creditos = min(22 + ampliacion.creditosAdicionales, 24)

        if creditos_totales > max_creditos:
            raise ValidationError(
                f"La suma total de créditos ({creditos_totales}) excede el máximo permitido ({max_creditos})."
            )

        # Modificar cupo de grupo y guardar selección dentro de un savepoint anidado
        g.cupos_ocupados += 1
        g.save()

        try:
            with transaction.atomic():
                sel = seleccion.objects.create(
                    id_estudiante=est,
                    id_grupo=g,
                    id_periodo=periodo,
                    id_asignatura=asig,
                    estado='confirmada'
                )
        except IntegrityError:
            raise ValidationError("El estudiante ya cuenta con una selección activa para esta asignatura en este periodo.")

        return sel


def anular_seleccion(seleccion_id):
    """
    Anula una selección existente y decrementa los cupos ocupados del grupo.
    Es idempotente si la selección ya está anulada.
    """
    with transaction.atomic():
        try:
            sel = seleccion.objects.select_for_update().get(pk=seleccion_id)
        except seleccion.DoesNotExist:
            raise ValidationError({"seleccion": "La selección especificada no existe."})

        if sel.estado not in ['pendiente', 'confirmada']:
            raise ValidationError("La selección no se encuentra activa o ya fue anulada.")

        g = grupo.objects.select_for_update().get(pk=sel.id_grupo_id)
        sel.estado = 'anulada'
        sel.save()

        if g.cupos_ocupados > 0:
            g.cupos_ocupados -= 1
            g.save()

        return sel


def crear_bloque_horario(grupo_id, dia_semana, hora_inicio, hora_fin, aula_id, malla=None):
    """
    REGLA 6: Crea un bloque de horario general sin docente (id_docente = null).
    Valida traslapes en el aula y disponibilidad declarada del aula.
    Si se especifica `malla`, valida que el grupo pertenezca a ese plan de estudios.
    """
    with transaction.atomic():
        try:
            g = grupo.objects.get(pk=grupo_id)
        except grupo.DoesNotExist:
            raise ValidationError({"grupo": "El grupo especificado no existe."})

        if malla and g.codigo.malla != malla:
            raise ValidationError(
                f"El grupo seleccionado pertenece a la malla {g.codigo.malla}, "
                f"no a la malla {malla}."
            )

        try:
            a = aula.objects.get(pk=aula_id)
        except aula.DoesNotExist:
            raise ValidationError({"aula": "El aula especificada no existe."})

        periodo = g.id_periodo

        # Validar traslape del aula en el mismo periodo
        bloques_existentes = bloque_horario.objects.filter(
            id_aula=a,
            dia_semana__iexact=dia_semana,
            id_grupo__id_periodo=periodo
        )
        for b in bloques_existentes:
            if hora_inicio < b.hora_fin and hora_fin > b.hora_inicio:
                raise ValidationError(
                    f"El aula {a.codigo} ya está ocupada el {dia_semana} en el rango {b.hora_inicio}-{b.hora_fin}."
                )

        # Validar disponibilidad declarada de aula
        disps = disponibilidad_aula.objects.filter(
            id_aula=a,
            id_periodo=periodo,
            dia_semana__iexact=dia_semana
        )
        if disps.exists():
            dentro_de_rango = False
            for d in disps:
                if hora_inicio >= d.hora_inicio and hora_fin <= d.hora_fin:
                    dentro_de_rango = True
                    break
            if not dentro_de_rango:
                raise ValidationError(
                    f"El horario {hora_inicio}-{hora_fin} no se encuentra dentro de la disponibilidad declarada del aula."
                )

        bloque = bloque_horario.objects.create(
            id_grupo=g,
            dia_semana=dia_semana,
            hora_inicio=hora_inicio,
            hora_fin=hora_fin,
            id_aula=a,
            id_docente=None
        )
        return bloque


def asignar_docente_bloque(bloque_id, docente_id):
    """
    REGLA 7: Asigna un docente a un bloque de horario.
    Usa select_for_update() en Docente y BloqueHorario.
    Valida que id_docente sea None y que no tenga traslapes.
    """
    with transaction.atomic():
        try:
            d = docente.objects.select_for_update().get(pk=docente_id)
        except docente.DoesNotExist:
            raise ValidationError({"docente": "El docente especificado no existe."})

        try:
            b = bloque_horario.objects.select_for_update().get(pk=bloque_id)
        except bloque_horario.DoesNotExist:
            raise ValidationError({"bloque": "El bloque de horario especificado no existe."})

        if b.id_docente is not None:
            raise ValidationError("El bloque de horario ya tiene un docente asignado.")

        periodo = b.id_grupo.id_periodo

        # Validar que el docente no tenga otro bloque traslapado en el mismo periodo
        bloques_docente = bloque_horario.objects.filter(
            id_docente=d,
            dia_semana__iexact=b.dia_semana,
            id_grupo__id_periodo=periodo
        ).exclude(pk=b.pk)

        for bd in bloques_docente:
            if b.hora_inicio < bd.hora_fin and b.hora_fin > bd.hora_inicio:
                raise ValidationError(
                    f"El docente {d.nombre} ya tiene un bloque asignado el {b.dia_semana} "
                    f"en el rango {bd.hora_inicio}-{bd.hora_fin} en este periodo."
                )

        b.id_docente = d
        b.save()
        return b


def modificar_bloque_horario(
    bloque_id,
    dia_semana=None,
    hora_inicio=None,
    hora_fin=None,
    aula_id=None,
    docente_id=None,
    desasignar_docente=False
):
    """
    Modifica un bloque de horario existente:
    - Valida que el aula no tenga traslapes en el mismo periodo (excluyendo este bloque).
    - Valida que el horario esté dentro de la disponibilidad del aula si existe.
    - Valida que el docente asignado no tenga traslapes (excluyendo este bloque).
    - Permite cambiar día, horario, aula o docente, o desasignar docente.
    """
    with transaction.atomic():
        try:
            b = bloque_horario.objects.select_for_update().get(pk=bloque_id)
        except bloque_horario.DoesNotExist:
            raise ValidationError({"bloque": "El bloque de horario especificado no existe."})

        periodo = b.id_grupo.id_periodo

        nuevo_dia = dia_semana if dia_semana is not None else b.dia_semana
        nueva_hora_inicio = hora_inicio if hora_inicio is not None else b.hora_inicio
        nueva_hora_fin = hora_fin if hora_fin is not None else b.hora_fin

        if nueva_hora_inicio >= nueva_hora_fin:
            raise ValidationError("La hora de inicio debe ser anterior a la hora de fin.")

        nueva_aula = b.id_aula
        if aula_id is not None:
            try:
                nueva_aula = aula.objects.get(pk=aula_id)
            except aula.DoesNotExist:
                raise ValidationError({"aula": "El aula especificada no existe."})

        # Validar traslape del aula en el mismo periodo (excluyendo este bloque)
        traslapes_aula = bloque_horario.objects.filter(
            id_aula=nueva_aula,
            dia_semana__iexact=nuevo_dia,
            id_grupo__id_periodo=periodo
        ).exclude(pk=b.pk)

        for ta in traslapes_aula:
            if nueva_hora_inicio < ta.hora_fin and nueva_hora_fin > ta.hora_inicio:
                raise ValidationError(
                    f"El aula {nueva_aula.codigo} ya está ocupada el {nuevo_dia} en el rango {ta.hora_inicio}-{ta.hora_fin}."
                )

        # Validar disponibilidad declarada de aula
        disps = disponibilidad_aula.objects.filter(
            id_aula=nueva_aula,
            id_periodo=periodo,
            dia_semana__iexact=nuevo_dia
        )
        if disps.exists():
            dentro_de_rango = False
            for d in disps:
                if nueva_hora_inicio >= d.hora_inicio and nueva_hora_fin <= d.hora_fin:
                    dentro_de_rango = True
                    break
            if not dentro_de_rango:
                raise ValidationError(
                    f"El horario {nueva_hora_inicio}-{nueva_hora_fin} no se encuentra dentro de la disponibilidad declarada del aula."
                )

        # Manejo del docente
        nuevo_docente = b.id_docente
        if desasignar_docente:
            nuevo_docente = None
        elif docente_id is not None:
            try:
                nuevo_docente = docente.objects.get(pk=docente_id)
            except docente.DoesNotExist:
                raise ValidationError({"docente": "El docente especificado no existe."})

        # Si hay docente asignado, validar traslapes de docente
        if nuevo_docente is not None:
            traslapes_docente = bloque_horario.objects.filter(
                id_docente=nuevo_docente,
                dia_semana__iexact=nuevo_dia,
                id_grupo__id_periodo=periodo
            ).exclude(pk=b.pk)

            for td in traslapes_docente:
                if nueva_hora_inicio < td.hora_fin and nueva_hora_fin > td.hora_inicio:
                    raise ValidationError(
                        f"El docente {nuevo_docente.nombre} ya tiene un bloque asignado el {nuevo_dia} "
                        f"en el rango {td.hora_inicio}-{td.hora_fin} en este periodo."
                    )

        b.dia_semana = nuevo_dia
        b.hora_inicio = nueva_hora_inicio
        b.hora_fin = nueva_hora_fin
        b.id_aula = nueva_aula
        b.id_docente = nuevo_docente
        b.save()
        return b


def eliminar_bloque_horario(bloque_id):
    """
    Elimina un bloque de horario de forma atómica.
    """
    with transaction.atomic():
        try:
            b = bloque_horario.objects.select_for_update().get(pk=bloque_id)
        except bloque_horario.DoesNotExist:
            raise ValidationError({"bloque": "El bloque de horario especificado no existe."})

        b.delete()
        return True


def obtener_horario_general(periodo_id, ciclo=None, malla=None):
    """
    REGLA 8: Devuelve los bloques de horario general agrupados por asignatura y grupo.
    """
    qs = bloque_horario.objects.filter(id_grupo__id_periodo_id=periodo_id).select_related(
        'id_grupo', 'id_grupo__codigo', 'id_aula', 'id_docente'
    )
    if ciclo:
        qs = qs.filter(id_grupo__codigo__ciclo=ciclo)
    if malla:
        qs = qs.filter(id_grupo__codigo__malla=malla)

    resultado = {}
    for b in qs:
        asig_code = b.id_grupo.codigo.codigo
        asig_nombre = b.id_grupo.codigo.nombre
        asig_ciclo = b.id_grupo.codigo.ciclo
        asig_malla = b.id_grupo.codigo.malla
        grupo_id = b.id_grupo.id
        seccion = b.id_grupo.seccion
        turno = b.id_grupo.turno

        key = (asig_code, grupo_id)
        if key not in resultado:
            ht = getattr(b.id_grupo.codigo, 'horas_teoria', 2)
            hp = getattr(b.id_grupo.codigo, 'horas_practica', 2)
            cr = getattr(b.id_grupo.codigo, 'creditos', 4)
            resultado[key] = {
                "codigo_asignatura": asig_code,
                "nombre_asignatura": asig_nombre,
                "ciclo": asig_ciclo,
                "malla": asig_malla,
                "creditos": cr,
                "horas_teoria": ht,
                "horas_practica": hp,
                "total_horas": ht + hp,
                "grupo_id": grupo_id,
                "seccion": seccion,
                "turno": turno,
                "vacantes": b.id_grupo.vacantes,
                "cupos_ocupados": b.id_grupo.cupos_ocupados,
                "bloques": []
            }

        hora_ini_str = b.hora_inicio.strftime("%H:%M") if hasattr(b.hora_inicio, 'strftime') else str(b.hora_inicio)
        hora_fin_str = b.hora_fin.strftime("%H:%M") if hasattr(b.hora_fin, 'strftime') else str(b.hora_fin)

        resultado[key]["bloques"].append({
            "id_bloque": b.id,
            "dia_semana": b.dia_semana,
            "hora_inicio": hora_ini_str,
            "hora_fin": hora_fin_str,
            "aula": b.id_aula.codigo,
            "tipo_aula": b.id_aula.tipo,
            "docente": b.id_docente.nombre if b.id_docente else None,
            "id_docente": b.id_docente.id if b.id_docente else None
        })

    return list(resultado.values())


def obtener_historial_estudiante(estudiante_id):
    """
    Retorna los registros de HistorialAcademico del estudiante con notas y detalle de asignatura.
    """
    return HistorialAcademico.objects.filter(
        id_estudiante_id=estudiante_id
    ).select_related('id_asignatura', 'id_periodo').order_by('id_asignatura__ciclo', 'id_asignatura__codigo')


def obtener_estado_malla_estudiante(estudiante_id):
    """
    Retorna la malla curricular completa organizada por ciclo, indicando para cada asignatura:
    - estado: 'aprobado' | 'habilitado' | 'bloqueado' | 'matriculado'
    - nota: nota obtenida si está aprobada
    - prerrequisitos: lista de asignaturas requeridas
    - prerrequisitos_faltantes: prerrequisitos que aún no ha aprobado
    """
    try:
        est = estudiante.objects.get(pk=estudiante_id)
    except estudiante.DoesNotExist:
        raise ValidationError({"estudiante": "El estudiante especificado no existe."})

    # Asignaturas aprobadas por el estudiante
    aprobados_qs = HistorialAcademico.objects.filter(
        id_estudiante=est,
        estado='aprobado'
    ).select_related('id_asignatura', 'id_periodo')

    aprobados_map = {ha.id_asignatura_id: ha for ha in aprobados_qs}

    # Selecciones activas actuales
    selecciones_activas = set(
        seleccion.objects.filter(
            id_estudiante=est,
            estado__in=['pendiente', 'confirmada']
        ).values_list('id_asignatura_id', flat=True)
    )

    # Prerrequisitos de todas las asignaturas
    prereqs_dict = {}
    for p in Prerequisitos.objects.all().select_related('asignatura_requisito'):
        cod = p.asignatura_codigo_id
        if cod not in prereqs_dict:
            prereqs_dict[cod] = []
        prereqs_dict[cod].append({
            "codigo": p.asignatura_requisito.codigo,
            "nombre": p.asignatura_requisito.nombre,
        })

    # Todas las asignaturas de la malla del estudiante
    asignaturas = asignatura.objects.filter(malla=est.malla).order_by('ciclo', 'codigo')

    malla = []
    for asig in asignaturas:
        reqs = prereqs_dict.get(asig.codigo, [])
        faltantes = [r for r in reqs if r["codigo"] not in aprobados_map]

        if asig.codigo in aprobados_map:
            hist_item = aprobados_map[asig.codigo]
            estado = 'aprobado'
            nota = hist_item.nota
            periodo = hist_item.id_periodo.nombre
        elif asig.codigo in selecciones_activas:
            estado = 'matriculado'
            nota = None
            periodo = None
        elif len(faltantes) == 0:
            estado = 'habilitado'
            nota = None
            periodo = None
        else:
            estado = 'bloqueado'
            nota = None
            periodo = None

        malla.append({
            "codigo": asig.codigo,
            "nombre": asig.nombre,
            "creditos": asig.creditos,
            "horas_teoria": asig.horas_teoria,
            "horas_practica": asig.horas_practica,
            "ciclo": asig.ciclo,
            "estado": estado,
            "nota": nota,
            "periodo_aprobado": periodo,
            "prerrequisitos": reqs,
            "prerrequisitos_faltantes": faltantes,
        })

    return malla


def obtener_oferta_habilitada_estudiante(estudiante_id, periodo_id):
    """
    Retorna la oferta del horario general para el periodo dado, clasificando cada grupo:
    - habilitado_para_matricula: cumple todos los prerrequisitos y NO la tiene aprobada previamente.
    - incluye detalle de prerrequisitos aprobados/faltantes y estado del estudiante frente al curso.
    """
    try:
        est = estudiante.objects.get(pk=estudiante_id)
    except estudiante.DoesNotExist:
        raise ValidationError({"estudiante": "El estudiante especificado no existe."})

    # Cursos aprobados
    aprobados_map = {
        ha.id_asignatura_id: ha.nota
        for ha in HistorialAcademico.objects.filter(id_estudiante=est, estado='aprobado')
    }

    # Selecciones activas
    selecciones_activas = set(
        seleccion.objects.filter(
            id_estudiante=est,
            id_periodo_id=periodo_id,
            estado__in=['pendiente', 'confirmada']
        ).values_list('id_asignatura_id', flat=True)
    )

    # Prerrequisitos de la malla
    prereqs_dict = {}
    for p in Prerequisitos.objects.all().select_related('asignatura_requisito'):
        cod = p.asignatura_codigo_id
        if cod not in prereqs_dict:
            prereqs_dict[cod] = []
        prereqs_dict[cod].append({
            "codigo": p.asignatura_requisito.codigo,
            "nombre": p.asignatura_requisito.nombre,
        })

    oferta_general = obtener_horario_general(periodo_id=periodo_id)
    oferta_general = [item for item in oferta_general if item.get("malla") == est.malla]

    oferta_evaluada = []
    for item in oferta_general:
        cod = item["codigo_asignatura"]
        reqs = prereqs_dict.get(cod, [])

        faltantes = [r for r in reqs if r["codigo"] not in aprobados_map]
        cumplidos = [
            {**r, "nota": aprobados_map[r["codigo"]]}
            for r in reqs if r["codigo"] in aprobados_map
        ]

        ya_aprobado = cod in aprobados_map
        matriculado = cod in selecciones_activas
        cumple_prerrequisitos = len(faltantes) == 0
        habilitado_para_matricula = cumple_prerrequisitos and not ya_aprobado

        oferta_evaluada.append({
            **item,
            "cumple_prerrequisitos": cumple_prerrequisitos,
            "habilitado_para_matricula": habilitado_para_matricula,
            "ya_aprobado": ya_aprobado,
            "nota_aprobada": aprobados_map.get(cod),
            "matriculado_activo": matriculado,
            "prerrequisitos_requeridos": reqs,
            "prerrequisitos_cumplidos": cumplidos,
            "prerrequisitos_faltantes": faltantes,
        })

    return oferta_evaluada
