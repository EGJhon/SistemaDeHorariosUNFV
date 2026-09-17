from django.db import transaction, IntegrityError
from rest_framework.exceptions import ValidationError
from .models import (
    estudiante,
    grupo,
    seleccion,
    bloque_horario,
    disponibilidad_aula,
    Prerequisitos,
    HistorialAcademico,
    SolicitudAmpliacion,
    docente,
    aula,
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


def crear_bloque_horario(grupo_id, dia_semana, hora_inicio, hora_fin, aula_id):
    """
    REGLA 6: Crea un bloque de horario general sin docente (id_docente = null).
    Valida traslapes en el aula y disponibilidad declarada del aula.
    """
    with transaction.atomic():
        try:
            g = grupo.objects.get(pk=grupo_id)
        except grupo.DoesNotExist:
            raise ValidationError({"grupo": "El grupo especificado no existe."})

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


def obtener_horario_general(periodo_id, ciclo=None):
    """
    REGLA 8: Devuelve los bloques de horario general agrupados por asignatura y grupo.
    """
    qs = bloque_horario.objects.filter(id_grupo__id_periodo_id=periodo_id).select_related(
        'id_grupo', 'id_grupo__codigo', 'id_aula', 'id_docente'
    )
    if ciclo:
        qs = qs.filter(id_grupo__codigo__ciclo=ciclo)

    resultado = {}
    for b in qs:
        asig_code = b.id_grupo.codigo.codigo
        asig_nombre = b.id_grupo.codigo.nombre
        asig_ciclo = b.id_grupo.codigo.ciclo
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
