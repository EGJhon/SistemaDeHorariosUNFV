from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    LoginView,
    SeleccionViewSet,
    BloqueHorarioViewSet,
    HorarioGeneralView,
    PeriodoAcademicoViewSet,
    AsignaturaViewSet,
    DocenteViewSet,
    AulaViewSet,
    GrupoViewSet,
    EstudianteViewSet,
    UsuarioViewSet,
)

router = DefaultRouter()
router.register(r'selecciones', SeleccionViewSet, basename='seleccion')
router.register(r'bloques-horario', BloqueHorarioViewSet, basename='bloque-horario')
router.register(r'periodos', PeriodoAcademicoViewSet, basename='periodo')
router.register(r'asignaturas', AsignaturaViewSet, basename='asignatura')
router.register(r'docentes', DocenteViewSet, basename='docente')
router.register(r'aulas', AulaViewSet, basename='aula')
router.register(r'grupos', GrupoViewSet, basename='grupo')
router.register(r'estudiantes', EstudianteViewSet, basename='estudiante')
router.register(r'usuarios', UsuarioViewSet, basename='usuario')

urlpatterns = [
    path('auth/login/', LoginView.as_view(), name='login'),
    path('horario-general/', HorarioGeneralView.as_view(), name='horario-general'),
    path('', include(router.urls)),
]
