from rest_framework import serializers
from django.contrib.auth.models import User
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


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(required=True)
    password = serializers.CharField(required=True)


class PerfilUsuarioSerializer(serializers.ModelSerializer):
    username = serializers.ReadOnlyField(source='user.username')
    email = serializers.ReadOnlyField(source='user.email')

    class Meta:
        model = PerfilUsuario
        fields = ['id', 'username', 'email', 'rol']


class PeriodoAcademicoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Periodo_Academico
        fields = '__all__'


class AsignaturaSerializer(serializers.ModelSerializer):
    class Meta:
        model = asignatura
        fields = '__all__'


class DocenteSerializer(serializers.ModelSerializer):
    class Meta:
        model = docente
        fields = '__all__'


class AulaSerializer(serializers.ModelSerializer):
    class Meta:
        model = aula
        fields = '__all__'


class GrupoSerializer(serializers.ModelSerializer):
    asignatura_nombre = serializers.ReadOnlyField(source='codigo.nombre')
    periodo_nombre = serializers.ReadOnlyField(source='id_periodo.nombre')

    class Meta:
        model = grupo
        fields = '__all__'


class BloqueHorarioCreateSerializer(serializers.ModelSerializer):
    """
    Serializer para creación de bloque_horario por Consejo de Facultad.
    id_docente queda excluido del payload de entrada.
    """
    id_grupo = serializers.PrimaryKeyRelatedField(queryset=grupo.objects.all())
    id_aula = serializers.PrimaryKeyRelatedField(queryset=aula.objects.all())

    class Meta:
        model = bloque_horario
        fields = ['id', 'dia_semana', 'hora_inicio', 'hora_fin', 'id_grupo', 'id_aula']


class BloqueHorarioSerializer(serializers.ModelSerializer):
    grupo_detail = GrupoSerializer(source='id_grupo', read_only=True)
    aula_codigo = serializers.ReadOnlyField(source='id_aula.codigo')
    docente_nombre = serializers.ReadOnlyField(source='id_docente.nombre', default=None)

    class Meta:
        model = bloque_horario
        fields = '__all__'


class AsignarDocenteSerializer(serializers.Serializer):
    id_docente = serializers.IntegerField(required=True)


class SeleccionCreateSerializer(serializers.Serializer):
    """
    Serializer para crear una selección de horario.
    Solo acepta id_estudiante e id_grupo; id_periodo e id_asignatura son derivados.
    """
    id_estudiante = serializers.IntegerField(required=True)
    id_grupo = serializers.IntegerField(required=True)


class SeleccionSerializer(serializers.ModelSerializer):
    estudiante_nombres = serializers.ReadOnlyField(source='id_estudiante.nombres')
    asignatura_nombre = serializers.ReadOnlyField(source='id_asignatura.nombre')
    grupo_seccion = serializers.ReadOnlyField(source='id_grupo.seccion')
    periodo_nombre = serializers.ReadOnlyField(source='id_periodo.nombre')

    class Meta:
        model = seleccion
        fields = '__all__'


class PrerequisitosSerializer(serializers.ModelSerializer):
    class Meta:
        model = Prerequisitos
        fields = '__all__'


class HistorialAcademicoSerializer(serializers.ModelSerializer):
    class Meta:
        model = HistorialAcademico
        fields = '__all__'


class SolicitudAmpliacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = SolicitudAmpliacion
        fields = '__all__'


class EstudianteSerializer(serializers.ModelSerializer):
    class Meta:
        model = estudiante
        fields = '__all__'


class UsuarioListSerializer(serializers.ModelSerializer):
    rol = serializers.SerializerMethodField()
    rol_display = serializers.SerializerMethodField()
    codigo_universitario = serializers.SerializerMethodField()
    ciclo_actual = serializers.SerializerMethodField()
    nombres_completos = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'nombres_completos', 'rol', 'rol_display', 'codigo_universitario', 'ciclo_actual', 'date_joined']

    def get_rol(self, obj):
        perfil = getattr(obj, 'perfil', None)
        return perfil.rol if perfil else ('ADMIN' if obj.is_superuser else 'ESTUDIANTE')

    def get_rol_display(self, obj):
        perfil = getattr(obj, 'perfil', None)
        return perfil.get_rol_display() if perfil else ('Administrador / Consejo de Facultad' if obj.is_superuser else 'Estudiante / Alumno')

    def get_codigo_universitario(self, obj):
        est = getattr(obj, 'estudiante_profile', None)
        return est.codigo_universitario if est else None

    def get_ciclo_actual(self, obj):
        est = getattr(obj, 'estudiante_profile', None)
        return est.ciclo_actual if est else None

    def get_nombres_completos(self, obj):
        full = obj.get_full_name().strip()
        if full:
            return full
        est = getattr(obj, 'estudiante_profile', None)
        if est:
            return est.nombres
        doc = getattr(obj, 'docente_profile', None)
        if doc:
            return doc.nombre
        return obj.username


class UsuarioCreateSerializer(serializers.Serializer):
    username = serializers.CharField(required=True)
    password = serializers.CharField(required=True, write_only=True)
    email = serializers.EmailField(required=False, allow_blank=True, default='')
    first_name = serializers.CharField(required=False, allow_blank=True, default='')
    last_name = serializers.CharField(required=False, allow_blank=True, default='')
    rol = serializers.ChoiceField(choices=['ADMIN', 'DOCENTE', 'ESTUDIANTE'], default='ESTUDIANTE')
    codigo_universitario = serializers.CharField(required=False, allow_blank=True, default='')
    ciclo_actual = serializers.CharField(required=False, allow_blank=True, default='I')


