from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiTypes

from .models import (
    PerfilUsuario,
    Periodo_Academico,
    asignatura,
    docente,
    aula,
    grupo,
    bloque_horario,
    estudiante,
    seleccion,
)
from .serializers import (
    LoginSerializer,
    PerfilUsuarioSerializer,
    PeriodoAcademicoSerializer,
    AsignaturaSerializer,
    DocenteSerializer,
    AulaSerializer,
    GrupoSerializer,
    BloqueHorarioCreateSerializer,
    BloqueHorarioSerializer,
    AsignarDocenteSerializer,
    SeleccionCreateSerializer,
    SeleccionSerializer,
    EstudianteSerializer,
    UsuarioListSerializer,
    UsuarioCreateSerializer,
)
from .services import (
    crear_seleccion,
    anular_seleccion,
    crear_bloque_horario,
    asignar_docente_bloque,
    obtener_horario_general,
)


class LoginView(APIView):
    """
    Endpoint para autenticación de usuarios y obtención de rol (ADMIN, DOCENTE, ESTUDIANTE).
    """
    @extend_schema(
        request=LoginSerializer,
        responses={200: OpenApiTypes.OBJECT, 400: OpenApiTypes.OBJECT},
        summary="Iniciar sesión de usuario",
        description="Autentica las credenciales y devuelve el perfil del usuario (ADMIN, DOCENTE, ESTUDIANTE) junto con los IDs vinculados."
    )
    def post(self, request, *args, **kwargs):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        username = serializer.validated_data['username']
        password = serializer.validated_data['password']

        user = authenticate(username=username, password=password)
        if not user:
            return Response(
                {"error": "Credenciales inválidas. Compruebe el usuario y la contraseña."},
                status=status.HTTP_400_BAD_REQUEST
            )

        perfil, _ = PerfilUsuario.objects.get_or_create(
            user=user,
            defaults={'rol': 'ADMIN' if user.is_superuser else 'ESTUDIANTE'}
        )

        docente_id = getattr(getattr(user, 'docente_profile', None), 'id', None)
        estudiante_id = getattr(getattr(user, 'estudiante_profile', None), 'id', None)

        return Response({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "nombres": user.get_full_name() or user.username,
            "rol": perfil.rol,
            "rol_display": perfil.get_rol_display(),
            "docente_id": docente_id,
            "estudiante_id": estudiante_id,
        }, status=status.HTTP_200_OK)


class SeleccionViewSet(viewsets.ModelViewSet):
    """
    ViewSet para la gestión de selecciones individuales de horarios.
    `POST /api/selecciones/` evalúa de forma secuencial las 5 reglas de negocio de matrícula.
    `POST /api/selecciones/{id}/anular/` anula una selección previamente realizada.
    """
    queryset = seleccion.objects.all().select_related('id_estudiante', 'id_grupo', 'id_periodo', 'id_asignatura')
    serializer_class = SeleccionSerializer

    @extend_schema(
        request=SeleccionCreateSerializer,
        responses={201: SeleccionSerializer, 400: OpenApiTypes.OBJECT},
        summary="Crear selección de horario (estudiante)",
        description="Aplica de forma secuencial las validaciones: Unicidad (1), Cruce (2), Cupo (3), Prerrequisitos (4) y Límite de Créditos (5)."
    )
    def create(self, request, *args, **kwargs):
        serializer = SeleccionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        estudiante_id = serializer.validated_data['id_estudiante']
        grupo_id = serializer.validated_data['id_grupo']

        nueva_seleccion = crear_seleccion(estudiante_id=estudiante_id, grupo_id=grupo_id)
        output_serializer = SeleccionSerializer(nueva_seleccion)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)

    @extend_schema(
        request=None,
        responses={200: SeleccionSerializer, 400: OpenApiTypes.OBJECT},
        summary="Anular selección de horario",
        description="Anula una selección activa y decremente el cupo ocupado del grupo asociado de forma atómica e idempotente."
    )
    @action(detail=True, methods=['post'], url_path='anular')
    def anular(self, request, pk=None):
        sel_anulada = anular_seleccion(seleccion_id=pk)
        output_serializer = SeleccionSerializer(sel_anulada)
        return Response(output_serializer.data, status=status.HTTP_200_OK)


class BloqueHorarioViewSet(viewsets.ModelViewSet):
    """
    ViewSet para bloques de horario general.
    `POST /api/bloques-horario/` (Regla 6: Consejo de Facultad crea bloques sin docente).
    `PATCH /api/bloques-horario/{id}/asignar-docente/` (Regla 7: Asignación por docente con select_for_update).
    """
    queryset = bloque_horario.objects.all().select_related('id_grupo', 'id_aula', 'id_docente')
    serializer_class = BloqueHorarioSerializer

    def get_serializer_class(self):
        if self.action == 'create':
            return BloqueHorarioCreateSerializer
        if self.action == 'asignar_docente':
            return AsignarDocenteSerializer
        return BloqueHorarioSerializer

    @extend_schema(
        request=BloqueHorarioCreateSerializer,
        responses={201: BloqueHorarioSerializer, 400: OpenApiTypes.OBJECT},
        summary="Crear bloque de horario general (sin docente)",
        description="Regla 6: El Consejo de Facultad crea un bloque en aula. Valida traslapes en el aula y disponibilidad declarada."
    )
    def create(self, request, *args, **kwargs):
        serializer = BloqueHorarioCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        bloque = crear_bloque_horario(
            grupo_id=serializer.validated_data['id_grupo'].id,
            dia_semana=serializer.validated_data['dia_semana'],
            hora_inicio=serializer.validated_data['hora_inicio'],
            hora_fin=serializer.validated_data['hora_fin'],
            aula_id=serializer.validated_data['id_aula'].id
        )
        output_serializer = BloqueHorarioSerializer(bloque)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)

    @extend_schema(
        request=AsignarDocenteSerializer,
        responses={200: BloqueHorarioSerializer, 400: OpenApiTypes.OBJECT},
        summary="Asignar docente a un bloque de horario",
        description="Regla 7: Asigna un docente a un bloque sin docente. Usa select_for_update() y valida id_docente is None y traslapes."
    )
    @action(detail=True, methods=['patch'], url_path='asignar-docente')
    def asignar_docente(self, request, pk=None):
        serializer = AsignarDocenteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        docente_id = serializer.validated_data['id_docente']
        bloque_actualizado = asignar_docente_bloque(bloque_id=pk, docente_id=docente_id)

        output_serializer = BloqueHorarioSerializer(bloque_actualizado)
        return Response(output_serializer.data, status=status.HTTP_200_OK)


class HorarioGeneralView(APIView):
    """
    Regla 8: Consulta del horario general.
    `GET /api/horario-general/?periodo=&ciclo=`
    """
    @extend_schema(
        parameters=[
            OpenApiParameter(name='periodo', description='ID del Periodo Académico', required=True, type=OpenApiTypes.INT),
            OpenApiParameter(name='ciclo', description='Ciclo de la asignatura (ej. II, IV, VI, VIII, X)', required=False, type=OpenApiTypes.STR),
        ],
        responses={200: OpenApiTypes.OBJECT},
        summary="Consultar horario general agrupado",
        description="Regla 8: Devuelve la oferta de horarios agrupada por asignatura y grupo, equivalente a la tabla en el PDF oficial."
    )
    def get(self, request, *args, **kwargs):
        periodo_id = request.query_params.get('periodo')
        ciclo = request.query_params.get('ciclo')

        if not periodo_id:
            return Response(
                {"error": "El parámetro 'periodo' es obligatorio."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            periodo_id = int(periodo_id)
        except ValueError:
            return Response(
                {"error": "El parámetro 'periodo' debe ser un número entero válido."},
                status=status.HTTP_400_BAD_REQUEST
            )

        horario_agrupado = obtener_horario_general(periodo_id=periodo_id, ciclo=ciclo)
        return Response(horario_agrupado, status=status.HTTP_200_OK)


# Additional ViewSets for simple admin / lookup
class PeriodoAcademicoViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Periodo_Academico.objects.all()
    serializer_class = PeriodoAcademicoSerializer


class AsignaturaViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = asignatura.objects.all()
    serializer_class = AsignaturaSerializer


class DocenteViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = docente.objects.all()
    serializer_class = DocenteSerializer


class AulaViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = aula.objects.all()
    serializer_class = AulaSerializer


class GrupoViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = grupo.objects.all()
    serializer_class = GrupoSerializer


class EstudianteViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = estudiante.objects.all()
    serializer_class = EstudianteSerializer


class UsuarioViewSet(viewsets.ModelViewSet):
    """
    ViewSet para la gestión administrativa de usuarios (ADMINISTRADOR, DOCENTE, ESTUDIANTE).
    """
    queryset = User.objects.all().select_related('perfil', 'docente_profile', 'estudiante_profile').order_by('-id')
    serializer_class = UsuarioListSerializer

    @extend_schema(
        request=UsuarioCreateSerializer,
        responses={201: UsuarioListSerializer, 400: OpenApiTypes.OBJECT},
        summary="Crear usuario con perfil y rol",
        description="Crea un nuevo usuario de Django y le asigna su perfil (ADMIN, DOCENTE, ESTUDIANTE) junto con las entidades asociadas."
    )
    def create(self, request, *args, **kwargs):
        serializer = UsuarioCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        username = serializer.validated_data['username']
        password = serializer.validated_data['password']
        email = serializer.validated_data.get('email', '')
        first_name = serializer.validated_data.get('first_name', '')
        last_name = serializer.validated_data.get('last_name', '')
        rol = serializer.validated_data.get('rol', 'ESTUDIANTE')
        codigo_uni = serializer.validated_data.get('codigo_universitario', '') or username
        ciclo = serializer.validated_data.get('ciclo_actual', 'I')

        if User.objects.filter(username=username).exists():
            return Response(
                {"error": f"El nombre de usuario '{username}' ya está registrado."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Crear Usuario de Django
        user = User.objects.create_user(
            username=username,
            password=password,
            email=email,
            first_name=first_name,
            last_name=last_name,
            is_staff=(rol == 'ADMIN'),
            is_superuser=(rol == 'ADMIN')
        )

        # Crear PerfilUsuario
        PerfilUsuario.objects.get_or_create(user=user, defaults={'rol': rol})

        # Nombre completo
        nombres_completos = user.get_full_name() or f"{first_name} {last_name}".strip() or username

        # Crear Perfil específico según Rol
        if rol == 'ESTUDIANTE':
            estudiante.objects.get_or_create(
                codigo_universitario=codigo_uni,
                defaults={
                    'nombres': nombres_completos,
                    'ciclo_actual': ciclo,
                    'usuario': user
                }
            )
        elif rol == 'DOCENTE':
            docente.objects.get_or_create(
                email=email or f"{username}@unfv.edu.pe",
                defaults={
                    'nombre': nombres_completos,
                    'usuario': user
                }
            )

        output_serializer = UsuarioListSerializer(user)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)


