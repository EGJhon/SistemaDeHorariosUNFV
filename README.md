# Sistema de Horarios UNFV - Backend MVP

Backend MVP desarrollado con **Django + Django REST Framework + PostgreSQL** para la Escuela Profesional de Ingeniería de Sistemas (EPIS) de la Universidad Nacional Federico Villarreal (UNFV).

El sistema digitaliza la oferta de horarios generales (Consejo de Facultad y asignación por docentes) y la matrícula individual de estudiantes con validación automática de 8 reglas de negocio.

---

## 🚀 Requisitos e Instalación con Docker Compose

Levantar todo el entorno (Base de Datos PostgreSQL + Servidor Web Django) ejecutando:

```bash
docker compose up --build -d
```

Una vez en ejecución, los servicios estarán disponibles en:
- **API Base**: `http://localhost:8000/api/`
- **Documentación Swagger / OpenAPI**: `http://localhost:8000/api/docs/`
- **Panel de Administración Django**: `http://localhost:8000/admin/`

---

## 🛠️ Comandos Principales

### 1. Migraciones de la Base de Datos

Para aplicar las migraciones dentro del contenedor:

```bash
docker compose exec web python manage.py migrate
```

### 2. Cargar Datos de Prueba Realistas (`seed_data`)

Poblar la base de datos con asignaturas (ciclos II, IV, VI, VIII, X), aulas, docentes, grupos, bloques de horario, historial académico y solicitudes de ampliación para el periodo **2026-2**:

```bash
docker compose exec web python manage.py seed_data
```

### 3. Ejecutar Pruebas Automatizadas (`pytest`)

Ejecutar el suite de pruebas unitarias y de concurrencia que verifica las 8 reglas de negocio:

```bash
docker compose exec web pytest
```

Para crear un superusuario y acceder a `http://localhost:8000/admin/`:

```bash
docker compose exec web python manage.py createsuperuser
```

---

## 📋 Reglas de Negocio Implementadas

1. **Unicidad de Selección**: Un estudiante no puede seleccionar dos grupos activos de la misma asignatura en un mismo periodo. Si cancela (`anulada`), se permite re-seleccionar.
2. **Cruce de Horario del Estudiante**: Valida que ningún bloque del nuevo grupo tenga traslape de horario con los grupos activos previamente seleccionados.
3. **Cupo del Grupo**: Valida `cupos_ocupados < vacantes` e incrementa de forma atómica mediante `select_for_update()`.
4. **Prerrequisitos**: Verifica que todas las asignaturas requeridas estén registradas con `estado = 'aprobado'` en `HistorialAcademico`.
5. **Límite de Créditos**: Máximo 22 créditos en selecciones activas. Si existe una `SolicitudAmpliacion` aprobada para el estudiante y periodo, el máximo absoluto aumenta hasta 24 créditos.
6. **Creación de Horario General (Sin Docente)**: `POST /api/bloques-horario/` registra bloques con `id_docente = null`, verificando traslapes de aula y la disponibilidad declarada del aula (`disponibilidad_aula`).
7. **Elección de Bloque por el Docente**: `PATCH /api/bloques-horario/{id}/asignar-docente/` asigna docente utilizando `select_for_update()` sobre el `bloque_horario` y el `docente`, impidiendo reclamaciones dobles o traslapes.
8. **Consulta del Horario General**: `GET /api/horario-general/?periodo=&ciclo=` retorna la oferta horaria agrupada por asignatura y grupo.

---

## 🔌 Endpoints Principales

| Método | Endpoint | Descripción |
| --- | --- | --- |
| `POST` | `/api/selecciones/` | Crear selección de horario aplicando Reglas 1 a 5. |
| `POST` | `/api/selecciones/{id}/anular/` | Anular selección y liberar cupo de forma idempotente. |
| `POST` | `/api/bloques-horario/` | Regla 6: Crear bloque general sin docente. |
| `PATCH` | `/api/bloques-horario/{id}/asignar-docente/` | Regla 7: Docente elige/reclama bloque de horario. |
| `GET` | `/api/horario-general/?periodo=&ciclo=` | Regla 8: Consultar oferta de horario agrupada. |
| `GET` | `/api/docs/` | Swagger UI interactivo. |