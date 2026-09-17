from django.contrib import admin
from .models import (
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


@admin.register(PerfilUsuario)
class PerfilUsuarioAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'rol')
    list_filter = ('rol',)
    search_fields = ('user__username', 'user__email')


@admin.register(Periodo_Academico)
class PeriodoAcademicoAdmin(admin.ModelAdmin):
    list_display = ('id', 'nombre', 'fecha_inicio', 'fecha_fin')
    search_fields = ('nombre',)


@admin.register(asignatura)
class AsignaturaAdmin(admin.ModelAdmin):
    list_display = ('codigo', 'nombre', 'creditos', 'horas_teoria', 'horas_practica', 'ciclo')
    list_filter = ('ciclo',)
    search_fields = ('codigo', 'nombre')


@admin.register(docente)
class DocenteAdmin(admin.ModelAdmin):
    list_display = ('id', 'nombre', 'email', 'usuario')
    search_fields = ('nombre', 'email', 'usuario__username')


@admin.register(aula)
class AulaAdmin(admin.ModelAdmin):
    list_display = ('id', 'codigo', 'tipo')
    list_filter = ('tipo',)
    search_fields = ('codigo',)


@admin.register(grupo)
class GrupoAdmin(admin.ModelAdmin):
    list_display = ('id', 'codigo', 'seccion', 'turno', 'vacantes', 'cupos_ocupados', 'id_periodo')
    list_filter = ('turno', 'id_periodo', 'codigo__ciclo')
    search_fields = ('codigo__codigo', 'codigo__nombre', 'seccion')


@admin.register(bloque_horario)
class BloqueHorarioAdmin(admin.ModelAdmin):
    list_display = ('id', 'id_grupo', 'dia_semana', 'hora_inicio', 'hora_fin', 'id_aula', 'id_docente')
    list_filter = ('dia_semana', 'id_grupo__id_periodo', 'id_aula')
    search_fields = ('id_grupo__codigo__nombre', 'id_docente__nombre', 'id_aula__codigo')


@admin.register(disponibilidad_aula)
class DisponibilidadAulaAdmin(admin.ModelAdmin):
    list_display = ('id', 'id_aula', 'dia_semana', 'hora_inicio', 'hora_fin', 'id_periodo')
    list_filter = ('dia_semana', 'id_periodo', 'id_aula')


@admin.register(estudiante)
class EstudianteAdmin(admin.ModelAdmin):
    list_display = ('id', 'codigo_universitario', 'nombres', 'ciclo_actual', 'usuario')
    list_filter = ('ciclo_actual',)
    search_fields = ('codigo_universitario', 'nombres', 'usuario__username')


@admin.register(seleccion)
class SeleccionAdmin(admin.ModelAdmin):
    list_display = ('id', 'id_estudiante', 'id_asignatura', 'id_grupo', 'id_periodo', 'estado', 'fecha_seleccion')
    list_filter = ('estado', 'id_periodo', 'id_asignatura__ciclo')
    search_fields = ('id_estudiante__codigo_universitario', 'id_estudiante__nombres', 'id_asignatura__nombre')


@admin.register(Prerequisitos)
class PrerequisitosAdmin(admin.ModelAdmin):
    list_display = ('id', 'asignatura_codigo', 'asignatura_requisito')
    search_fields = ('asignatura_codigo__codigo', 'asignatura_requisito__codigo')


@admin.register(HistorialAcademico)
class HistorialAcademicoAdmin(admin.ModelAdmin):
    list_display = ('id', 'id_estudiante', 'id_asignatura', 'nota', 'estado', 'id_periodo')
    list_filter = ('estado', 'id_periodo')
    search_fields = ('id_estudiante__codigo_universitario', 'id_asignatura__codigo')


@admin.register(SolicitudAmpliacion)
class SolicitudAmpliacionAdmin(admin.ModelAdmin):
    list_display = ('id', 'id_estudiante', 'creditosAdicionales', 'estado', 'fechasolicitud', 'id_periodo')
    list_filter = ('estado', 'id_periodo')
    search_fields = ('id_estudiante__codigo_universitario',)
