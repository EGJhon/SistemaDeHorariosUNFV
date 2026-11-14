const API_BASE = '/api';

export async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const savedUser = localStorage.getItem('unfv_user');
  if (savedUser) {
    try {
      const parsed = JSON.parse(savedUser);
      if (parsed?.token) {
        headers['Authorization'] = `Token ${parsed.token}`;
      }
    } catch (e) {}
  }

  const response = await fetch(url, { ...options, headers });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.detail || data.error || (typeof data === 'string' ? data : JSON.stringify(data));
    throw new Error(errorMsg || `Error HTTP ${response.status}`);
  }

  if (data && Array.isArray(data.results)) {
    return data.results;
  }

  return data;
}

export const api = {
  login: (username, password) =>
    request('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  getPeriodos: () => request('/periodos/'),
  getMallas: () => request('/asignaturas/mallas/'),
  getAsignaturas: (malla = '') =>
    request(`/asignaturas/${malla ? `?malla=${encodeURIComponent(malla)}` : ''}`),
  getGrupos: () => request('/grupos/'),
  getDocentes: () => request('/docentes/'),
  getCargaDocente: (docenteId, periodoId = '') =>
    request(`/docentes/${docenteId}/carga-lectiva/${periodoId ? `?periodo=${periodoId}` : ''}`),
  getAulas: () => request('/aulas/'),
  getEstudiantes: () => request('/estudiantes/'),
  getSelecciones: () => request('/selecciones/'),
  
  getHorarioGeneral: (periodoId, ciclo = '', malla = '') => {
    let query = `/horario-general/?periodo=${periodoId}`;
    if (ciclo) query += `&ciclo=${encodeURIComponent(ciclo)}`;
    if (malla) query += `&malla=${encodeURIComponent(malla)}`;
    return request(query);
  },

  crearSeleccion: (id_estudiante, id_grupo) =>
    request('/selecciones/', {
      method: 'POST',
      body: JSON.stringify({ id_estudiante, id_grupo }),
    }),

  anularSeleccion: (seleccionId) =>
    request(`/selecciones/${seleccionId}/anular/`, {
      method: 'POST',
    }),

  crearBloqueHorario: (data) =>
    request('/bloques-horario/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  asignarDocenteBloque: (bloqueId, id_docente) =>
    request(`/bloques-horario/${bloqueId}/asignar-docente/`, {
      method: 'PATCH',
      body: JSON.stringify({ id_docente }),
    }),

  actualizarBloqueHorario: (bloqueId, data) =>
    request(`/bloques-horario/${bloqueId}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  eliminarBloqueHorario: (bloqueId) =>
    request(`/bloques-horario/${bloqueId}/`, {
      method: 'DELETE',
    }),

  getHistorialEstudiante: (estudianteId) =>
    request(`/estudiantes/${estudianteId}/historial/`),

  getMallaCurricularEstudiante: (estudianteId) =>
    request(`/estudiantes/${estudianteId}/malla-curricular/`),

  getOfertaHabilitadaEstudiante: (estudianteId, periodoId) =>
    request(`/estudiantes/${estudianteId}/oferta-habilitada/?periodo=${periodoId}`),

  getUsuarios: () => request('/usuarios/'),

  crearUsuario: (data) =>
    request('/usuarios/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  actualizarUsuario: (usuarioId, data) =>
    request(`/usuarios/${usuarioId}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};
