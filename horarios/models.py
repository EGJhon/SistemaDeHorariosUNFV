from django.db import models
from django.contrib.auth.models import User


class PerfilUsuario(models.Model):
    ROLES = (
        ('ADMIN', 'Administrador / Consejo de Facultad'),
        ('DOCENTE', 'Docente / Profesor'),
        ('ESTUDIANTE', 'Estudiante / Alumno'),
    )

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='perfil')
    rol = models.CharField(max_length=20, choices=ROLES, default='ESTUDIANTE')

    class Meta:
        db_table = 'perfil_usuario'
        verbose_name = 'Perfil de Usuario'
        verbose_name_plural = 'Perfiles de Usuarios'

    def __str__(self):
        return f"{self.user.username} ({self.get_rol_display()})"


class Periodo_Academico(models.Model):
    nombre = models.CharField(max_length=50)
    fecha_inicio = models.DateField()
    fecha_fin = models.DateField()

    class Meta:
        db_table = 'periodo_academico'
        verbose_name = 'Periodo Académico'
        verbose_name_plural = 'Periodos Académicos'

    def __str__(self):
        return self.nombre


class asignatura(models.Model):
    codigo = models.CharField(max_length=20, primary_key=True)
    nombre = models.CharField(max_length=150)
    creditos = models.IntegerField()
    horas_teoria = models.IntegerField()
    horas_practica = models.IntegerField()
    ciclo = models.CharField(max_length=10)

    class Meta:
        db_table = 'asignatura'
        verbose_name = 'Asignatura'
        verbose_name_plural = 'Asignaturas'

    def __str__(self):
        return f"{self.codigo} - {self.nombre}"


class docente(models.Model):
    nombre = models.CharField(max_length=150)
    email = models.EmailField(unique=True)
    usuario = models.OneToOneField(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='docente_profile'
    )

    class Meta:
        db_table = 'docente'
        verbose_name = 'Docente'
        verbose_name_plural = 'Docentes'

    def __str__(self):
        return self.nombre


class aula(models.Model):
    codigo = models.CharField(max_length=20)
    tipo = models.CharField(max_length=50)

    class Meta:
        db_table = 'aula'
        verbose_name = 'Aula'
        verbose_name_plural = 'Aulas'

    def __str__(self):
        return f"{self.codigo} ({self.tipo})"


class grupo(models.Model):
    turno = models.CharField(max_length=20)
    seccion = models.CharField(max_length=10)
    vacantes = models.IntegerField()
    cupos_ocupados = models.IntegerField(default=0)
    id_periodo = models.ForeignKey(
        Periodo_Academico,
        on_delete=models.CASCADE,
        db_column='id_periodo',
        related_name='grupos'
    )
    codigo = models.ForeignKey(
        asignatura,
        on_delete=models.CASCADE,
        db_column='codigo',
        related_name='grupos'
    )

    class Meta:
        db_table = 'grupo'
        verbose_name = 'Grupo'
        verbose_name_plural = 'Grupos'

    def __str__(self):
        return f"{self.codigo.codigo} - Sec {self.seccion} ({self.turno})"


class bloque_horario(models.Model):
    dia_semana = models.CharField(max_length=15)
    hora_inicio = models.TimeField()
    hora_fin = models.TimeField()
    id_grupo = models.ForeignKey(
        grupo,
        on_delete=models.CASCADE,
        db_column='id_grupo',
        related_name='bloques'
    )
    id_docente = models.ForeignKey(
        docente,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='id_docente',
        related_name='bloques'
    )
    id_aula = models.ForeignKey(
        aula,
        on_delete=models.CASCADE,
        db_column='id_aula',
        related_name='bloques'
    )

    class Meta:
        db_table = 'bloque_horario'
        verbose_name = 'Bloque Horario'
        verbose_name_plural = 'Bloques Horarios'

    def __str__(self):
        docente_str = self.id_docente.nombre if self.id_docente else "Sin Docente"
        return f"{self.id_grupo} | {self.dia_semana} {self.hora_inicio}-{self.hora_fin} | {self.id_aula.codigo} | {docente_str}"


class disponibilidad_aula(models.Model):
    dia_semana = models.CharField(max_length=15)
    hora_inicio = models.TimeField()
    hora_fin = models.TimeField()
    id_aula = models.ForeignKey(
        aula,
        on_delete=models.CASCADE,
        db_column='id_aula',
        related_name='disponibilidades'
    )
    id_periodo = models.ForeignKey(
        Periodo_Academico,
        on_delete=models.CASCADE,
        db_column='id_periodo',
        related_name='disponibilidades_aula'
    )

    class Meta:
        db_table = 'disponibilidad_aula'
        verbose_name = 'Disponibilidad Aula'
        verbose_name_plural = 'Disponibilidades Aula'

    def __str__(self):
        return f"Aula {self.id_aula.codigo} - {self.dia_semana} {self.hora_inicio}-{self.hora_fin} ({self.id_periodo.nombre})"


class estudiante(models.Model):
    codigo_universitario = models.CharField(max_length=20, unique=True)
    nombres = models.CharField(max_length=150)
    ciclo_actual = models.CharField(max_length=10)
    usuario = models.OneToOneField(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='estudiante_profile'
    )

    class Meta:
        db_table = 'estudiante'
        verbose_name = 'Estudiante'
        verbose_name_plural = 'Estudiantes'

    def __str__(self):
        return f"{self.codigo_universitario} - {self.nombres}"


class seleccion(models.Model):
    fecha_seleccion = models.DateTimeField(auto_now_add=True)
    estado = models.CharField(max_length=20, default='confirmada')  # 'pendiente' | 'confirmada' | 'anulada'
    id_grupo = models.ForeignKey(
        grupo,
        on_delete=models.CASCADE,
        db_column='id_grupo',
        related_name='selecciones'
    )
    id_estudiante = models.ForeignKey(
        estudiante,
        on_delete=models.CASCADE,
        db_column='id_estudiante',
        related_name='selecciones'
    )
    id_periodo = models.ForeignKey(
        Periodo_Academico,
        on_delete=models.CASCADE,
        db_column='id_periodo',
        related_name='selecciones'
    )
    id_asignatura = models.ForeignKey(
        asignatura,
        on_delete=models.CASCADE,
        db_column='id_asignatura',
        related_name='selecciones'
    )

    class Meta:
        db_table = 'seleccion'
        verbose_name = 'Selección de Horario'
        verbose_name_plural = 'Selecciones de Horarios'
        constraints = [
            models.UniqueConstraint(
                fields=['id_estudiante', 'id_asignatura', 'id_periodo'],
                condition=models.Q(estado__in=['pendiente', 'confirmada']),
                name='unique_active_seleccion_per_period'
            )
        ]

    def __str__(self):
        return f"Estudiante {self.id_estudiante.codigo_universitario} - Grupo {self.id_grupo_id} ({self.estado})"


class Prerequisitos(models.Model):
    asignatura_codigo = models.ForeignKey(
        asignatura,
        on_delete=models.CASCADE,
        db_column='asignatura_codigo',
        related_name='prerequisitos_de'
    )
    asignatura_requisito = models.ForeignKey(
        asignatura,
        on_delete=models.CASCADE,
        db_column='asignatura_requisito',
        related_name='requisito_para'
    )

    class Meta:
        db_table = 'prerequisitos'
        verbose_name = 'Prerrequisito'
        verbose_name_plural = 'Prerrequisitos'

    def __str__(self):
        return f"{self.asignatura_codigo.codigo} requiere {self.asignatura_requisito.codigo}"


class HistorialAcademico(models.Model):
    nota = models.FloatField()
    estado = models.CharField(max_length=20)  # 'aprobado' | 'desaprobado'
    id_estudiante = models.ForeignKey(
        estudiante,
        on_delete=models.CASCADE,
        db_column='id_estudiante',
        related_name='historial'
    )
    id_asignatura = models.ForeignKey(
        asignatura,
        on_delete=models.CASCADE,
        db_column='id_asignatura',
        related_name='historial'
    )
    id_periodo = models.ForeignKey(
        Periodo_Academico,
        on_delete=models.CASCADE,
        db_column='id_periodo',
        related_name='historial'
    )

    class Meta:
        db_table = 'historial_academico'
        verbose_name = 'Historial Académico'
        verbose_name_plural = 'Historiales Académicos'

    def __str__(self):
        return f"{self.id_estudiante.codigo_universitario} - {self.id_asignatura.codigo}: {self.nota} ({self.estado})"


class SolicitudAmpliacion(models.Model):
    creditosAdicionales = models.IntegerField()  # máximo 2
    estado = models.CharField(max_length=20)  # 'pendiente' | 'aprobada' | 'rechazada'
    fechasolicitud = models.DateTimeField(auto_now_add=True)
    id_estudiante = models.ForeignKey(
        estudiante,
        on_delete=models.CASCADE,
        db_column='id_estudiante',
        related_name='solicitudes_ampliacion'
    )
    id_periodo = models.ForeignKey(
        Periodo_Academico,
        on_delete=models.CASCADE,
        db_column='id_periodo',
        related_name='solicitudes_ampliacion'
    )

    class Meta:
        db_table = 'solicitud_ampliacion'
        verbose_name = 'Solicitud de Ampliación'
        verbose_name_plural = 'Solicitudes de Ampliación'

    def __str__(self):
        return f"{self.id_estudiante.codigo_universitario} - +{self.creditosAdicionales} cr ({self.estado})"
