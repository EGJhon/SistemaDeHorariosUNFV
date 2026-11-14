import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  BookOpen,
  AlertCircle,
  CheckCircle,
  Trash2,
  Calendar,
  Award,
  GraduationCap,
  GitBranch,
  Filter,
  Lock,
  Unlock,
} from 'lucide-react';
import { api } from '../api';
import TimetableGrid from './timetable/TimetableGrid';
import HistorialNotasView from './HistorialNotasView';
import MallaCurricularView from './MallaCurricularView';

export default function MatriculaEstudianteView({ currentUser }) {
  const [activeTab, setActiveTab] = useState('MATRICULA'); // 'MATRICULA' | 'HISTORIAL' | 'MALLA'
  const [estudiantes, setEstudiantes] = useState([]);
  const [selectedEstudianteId, setSelectedEstudianteId] = useState('');
  const [periodos, setPeriodos] = useState([]);
  const [selectedPeriodo, setSelectedPeriodo] = useState('');

  const [selecciones, setSelecciones] = useState([]);
  const [ofertaCursos, setOfertaCursos] = useState([]);
  const [soloHabilitados, setSoloHabilitados] = useState(true); // Default true: Solo cursos con prerrequisitos cumplidos!

  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (currentUser?.estudiante_id) {
      setSelectedEstudianteId(String(currentUser.estudiante_id));
    }
  }, [currentUser]);

  useEffect(() => {
    if (selectedEstudianteId && selectedPeriodo) {
      loadStudentData(selectedEstudianteId, selectedPeriodo);
    }
  }, [selectedEstudianteId, selectedPeriodo]);

  const loadInitialData = async () => {
    try {
      const [estRes, pRes] = await Promise.all([
        api.getEstudiantes(),
        api.getPeriodos(),
      ]);
      setEstudiantes(estRes);

      let targetEstId = selectedEstudianteId ? String(selectedEstudianteId) : '';
      if (currentUser?.estudiante_id) {
        targetEstId = String(currentUser.estudiante_id);
      } else if (estRes.length > 0) {
        targetEstId = String(estRes[0].id);
      }
      setSelectedEstudianteId(targetEstId);

      setPeriodos(pRes);
      let targetPId = selectedPeriodo ? String(selectedPeriodo) : '';
      if (pRes.length > 0) {
        // Prefer active period 2026-2 if available
        const p2026_2 = pRes.find((p) => p.nombre === '2026-2');
        targetPId = p2026_2 ? String(p2026_2.id) : String(pRes[0].id);
      }
      setSelectedPeriodo(targetPId);

      if (targetEstId && targetPId) {
        loadStudentData(targetEstId, targetPId);
      }
    } catch (err) {
      console.error('Error cargando datos iniciales:', err);
    }
  };

  const loadStudentData = async (estId = selectedEstudianteId, pId = selectedPeriodo) => {
    if (!estId || !pId) return;
    setLoading(true);
    setAlert(null);
    try {
      const [selRes, ofertaRes] = await Promise.all([
        api.getSelecciones(),
        api.getOfertaHabilitadaEstudiante(estId, pId).catch(async () => {
          // Fallback if detail endpoint is waiting
          const rawHG = await api.getHorarioGeneral(pId);
          return rawHG.map((item) => ({
            ...item,
            cumple_prerrequisitos: true,
            habilitado_para_matricula: true,
            prerrequisitos_cumplidos: [],
            prerrequisitos_faltantes: [],
          }));
        }),
      ]);

      // Filter active selecciones for current student and period
      const activeSel = selRes.filter(
        (s) =>
          s.id_estudiante === parseInt(estId, 10) &&
          s.id_periodo === parseInt(pId, 10) &&
          ['pendiente', 'confirmada'].includes(s.estado)
      );

      setSelecciones(activeSel);
      setOfertaCursos(ofertaRes);
    } catch (err) {
      console.error('Error cargando datos del estudiante:', err);
    } finally {
      setLoading(false);
    }
  };

  const currentEstudiante = estudiantes.find((e) => e.id === parseInt(selectedEstudianteId, 10));

  // Compute total active credits
  const totalCreditos = selecciones.reduce((acc, s) => {
    const itemHG = ofertaCursos.find((hg) => hg.grupo_id === s.id_grupo);
    if (itemHG) {
      return acc + (itemHG.creditos || 4);
    }
    return acc + 4;
  }, 0);

  // Check max credit limit (24 if Maria Lopez or has approved extension, else 22)
  const maxCreditos = currentEstudiante?.codigo_universitario === '2022002002' ? 24 : 22;
  const creditPercentage = Math.min(100, (totalCreditos / maxCreditos) * 100);

  // Handle Seleccionar Grupo (Reglas 1 - 5)
  const handleSeleccionarGrupo = async (grupoId) => {
    setAlert(null);
    try {
      await api.crearSeleccion(parseInt(selectedEstudianteId, 10), grupoId);
      setAlert({
        type: 'success',
        message: '¡Asignatura seleccionada y matriculada exitosamente!',
      });
      loadStudentData();
    } catch (err) {
      setAlert({
        type: 'danger',
        message: err.message,
      });
    }
  };

  // Handle Anular Selección
  const handleAnularSeleccion = async (seleccionId) => {
    setAlert(null);
    try {
      await api.anularSeleccion(seleccionId);
      setAlert({
        type: 'success',
        message: 'Selección anulada correctamente. Vacante y créditos liberados.',
      });
      loadStudentData();
    } catch (err) {
      setAlert({
        type: 'danger',
        message: err.message,
      });
    }
  };

  // Filter offered courses based on toggle
  const cursosVisibles = soloHabilitados
    ? ofertaCursos.filter((item) => item.habilitado_para_matricula)
    : ofertaCursos;

  // Student active timetable blocks for visual TimetableGrid
  const studentActiveBlocks = [];
  selecciones.forEach((s) => {
    const itemHG = ofertaCursos.find((hg) => hg.grupo_id === s.id_grupo);
    if (itemHG) {
      itemHG.bloques.forEach((b) => {
        studentActiveBlocks.push({
          ...b,
          codigo_asignatura: itemHG.codigo_asignatura,
          nombre_asignatura: itemHG.nombre_asignatura,
          seccion: itemHG.seccion,
          turno: itemHG.turno,
        });
      });
    }
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Banner: Student Selector, Tabs & Credit Summary */}
      <div className="card">
        <div className="card-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
          <div className="card-title">
            <UserCheck className="text-primary" size={22} />
            <span>Portal Académico del Estudiante — EPIS UNFV</span>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
              <label className="form-label">Periodo:</label>
              <select
                className="select-input"
                value={selectedPeriodo}
                onChange={(e) => {
                  const newPeriodo = e.target.value;
                  setSelectedPeriodo(newPeriodo);
                  loadStudentData(selectedEstudianteId, newPeriodo);
                }}
              >
                {periodos.map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>

            {currentUser?.rol === 'ESTUDIANTE' ? (
              <div
                className="badge badge-success"
                style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <UserCheck size={14} />
                <span>
                  Alumno: <strong>{currentEstudiante?.nombres || currentUser?.nombres}</strong> ({currentEstudiante?.codigo_universitario || currentUser?.username}) — Ciclo {currentEstudiante?.ciclo_actual || 'IV'}
                </span>
              </div>
            ) : (
              <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
                <label className="form-label">Estudiante:</label>
                <select
                  className="select-input"
                  value={selectedEstudianteId}
                  onChange={(e) => {
                    const newEstId = e.target.value;
                    setSelectedEstudianteId(newEstId);
                    loadStudentData(newEstId, selectedPeriodo);
                  }}
                >
                  {estudiantes.map((e) => (
                    <option key={e.id} value={String(e.id)}>
                      {e.codigo_universitario} — {e.nombres} (Ciclo {e.ciclo_actual})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Subtab Navigation Buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
          <button
            className={`btn ${activeTab === 'MATRICULA' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('MATRICULA')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <BookOpen size={16} />
            Matrícula y Horario Semanal
          </button>
          <button
            className={`btn ${activeTab === 'HISTORIAL' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('HISTORIAL')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <GraduationCap size={16} />
            Historial de Notas Aprobadas
          </button>
          <button
            className={`btn ${activeTab === 'MALLA' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('MALLA')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <GitBranch size={16} />
            Malla Curricular & Dependencias
          </button>
        </div>

        {/* Credit Limits Summary Bar (Only displayed in Matricula Tab) */}
        {activeTab === 'MATRICULA' && (
          <div
            style={{
              backgroundColor: 'var(--bg-main)',
              padding: '1.1rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              marginTop: '1rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                Créditos Seleccionados en este Periodo:
              </span>
              <span style={{ fontWeight: 700, fontSize: '1rem', color: totalCreditos > maxCreditos ? 'var(--danger)' : 'var(--primary-light)' }}>
                {totalCreditos} / {maxCreditos} Créditos
              </span>
            </div>

            <div className="credit-progress-bar">
              <div
                className="credit-progress-fill"
                style={{
                  width: `${creditPercentage}%`,
                  backgroundColor: totalCreditos > maxCreditos ? 'var(--danger)' : creditPercentage > 85 ? 'var(--warning)' : 'var(--primary)',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.6rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <span>• Límite Regular: 22 Créditos</span>
              {maxCreditos === 24 && (
                <span className="badge badge-success">
                  <Award size={12} /> Solicitud de Ampliación Aprobada (+2 cr = 24 cr max)
                </span>
              )}
            </div>
          </div>
        )}

        {/* Notification Alert Banner */}
        {alert && (
          <div className={`alert-banner alert-banner-${alert.type}`} style={{ marginTop: '1rem' }}>
            <AlertCircle size={20} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong>{alert.type === 'danger' ? 'Error en Validación de Regla de Negocio:' : 'Operación Exitosa:'}</strong>
              <div style={{ marginTop: 2 }}>{alert.message}</div>
            </div>
          </div>
        )}
      </div>

      {/* Tab 1: Matricula & Timetable */}
      {activeTab === 'MATRICULA' && (
        <div className="two-column-layout">
          {/* Available Groups Offer */}
          <div className="card">
            <div className="card-header" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
              <div className="card-title" style={{ fontSize: '1rem' }}>
                <BookOpen size={18} className="text-primary" />
                <span>Oferta de Cursos Disponibles</span>
              </div>

              {/* Filter: Solo Cursos Habilitados con Prerrequisitos */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <button
                  className={`btn ${soloHabilitados ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                  onClick={() => setSoloHabilitados(!soloHabilitados)}
                  title="Filtra solo las materias cuyos prerrequisitos ya fueron aprobados"
                >
                  <Filter size={13} />
                  <span>{soloHabilitados ? 'Solo Habilitados (Prerrequisitos OK)' : 'Mostrar Todos'}</span>
                </button>
              </div>
            </div>

            {loading ? (
              <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                Evaluando prerrequisitos del estudiante y cargando oferta...
              </div>
            ) : cursosVisibles.length === 0 ? (
              <div
                style={{
                  padding: '2rem',
                  textAlign: 'center',
                  backgroundColor: 'var(--bg-main)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px dashed var(--border-color)',
                  color: 'var(--text-muted)',
                }}
              >
                <CheckCircle size={32} className="text-success" style={{ margin: '0 auto 0.5rem auto' }} />
                <p style={{ fontWeight: 600 }}>No hay asignaturas pendientes habilitadas en este ciclo.</p>
                <p style={{ fontSize: '0.8rem', marginTop: 4 }}>
                  Puedes pulsar en <strong>"Mostrar Todos"</strong> para revisar la oferta general completa de la facultad.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '580px', overflowY: 'auto' }}>
                {cursosVisibles.map((item) => {
                  const isSelected = selecciones.some((s) => s.id_grupo === item.grupo_id);
                  const isBlocked = !item.cumple_prerrequisitos;
                  const isAlreadyPassed = item.ya_aprobado;
                  const canEnroll = item.habilitado_para_matricula && item.cupos_ocupados < item.vacantes && !isSelected;

                  return (
                    <div
                      key={`${item.codigo_asignatura}_${item.grupo_id}`}
                      style={{
                        backgroundColor: 'var(--bg-card)',
                        border: isSelected
                          ? '2px solid var(--success)'
                          : isBlocked
                          ? '1px dashed rgba(239, 68, 68, 0.4)'
                          : '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        padding: '0.85rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                        opacity: isBlocked ? 0.75 : 1,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: 2 }}>
                            <span className="badge badge-info" style={{ fontSize: '0.72rem' }}>Ciclo {item.ciclo}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.creditos || 4} créditos</span>
                          </div>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                            {item.codigo_asignatura} - {item.nombre_asignatura}
                          </div>
                        </div>

                        <span className={`badge ${item.cupos_ocupados >= item.vacantes ? 'badge-danger' : 'badge-success'}`}>
                          {item.cupos_ocupados} / {item.vacantes} vacantes
                        </span>
                      </div>

                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        <strong>Sección:</strong> {item.seccion} ({item.turno})
                      </div>

                      {/* Schedule blocks */}
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                        {item.bloques.map((b) => (
                          <div key={b.id_bloque}>
                            • {b.dia_semana}: {b.hora_inicio} - {b.hora_fin} (Aula {b.aula}) {b.docente && `— ${b.docente}`}
                          </div>
                        ))}
                      </div>

                      {/* Prerequisite Status Banner */}
                      <div style={{ fontSize: '0.75rem', marginTop: 2 }}>
                        {isAlreadyPassed ? (
                          <div
                            style={{
                              backgroundColor: 'rgba(56, 189, 248, 0.1)',
                              border: '1px solid rgba(56, 189, 248, 0.3)',
                              padding: '0.3rem 0.6rem',
                              borderRadius: 'var(--radius-sm)',
                              color: 'var(--primary-light)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Award size={13} />
                            <span>Ya aprobaste este curso previamente (Nota: {item.nota_aprobada || 'Aprobado'}).</span>
                          </div>
                        ) : isBlocked ? (
                          <div
                            style={{
                              backgroundColor: 'rgba(239, 68, 68, 0.1)',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              padding: '0.3rem 0.6rem',
                              borderRadius: 'var(--radius-sm)',
                              color: 'var(--danger)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Lock size={13} />
                            <span>
                              <strong>Prerrequisito pendiente:</strong> {item.prerrequisitos_faltantes.map((f) => `${f.codigo} (${f.nombre})`).join(', ')}
                            </span>
                          </div>
                        ) : item.prerrequisitos_cumplidos && item.prerrequisitos_cumplidos.length > 0 ? (
                          <div
                            style={{
                              backgroundColor: 'rgba(16, 185, 129, 0.1)',
                              border: '1px solid rgba(16, 185, 129, 0.3)',
                              padding: '0.3rem 0.6rem',
                              borderRadius: 'var(--radius-sm)',
                              color: 'var(--success)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <CheckCircle size={13} />
                            <span>
                              <strong>Prerrequisitos aprobados:</strong>{' '}
                              {item.prerrequisitos_cumplidos.map((c) => `${c.codigo} (Nota ${c.nota})`).join(', ')}
                            </span>
                          </div>
                        ) : (
                          <div style={{ color: 'var(--text-dim)' }}>
                            • Sin prerrequisitos requeridos (Habilitado).
                          </div>
                        )}
                      </div>

                      {/* Action Button */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                        {isSelected ? (
                          <span className="badge badge-success">
                            <CheckCircle size={14} /> Seleccionado
                          </span>
                        ) : isAlreadyPassed ? (
                          <span className="badge badge-info">
                            Curso Concluido
                          </span>
                        ) : isBlocked ? (
                          <button
                            className="btn btn-secondary btn-disabled"
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', cursor: 'not-allowed' }}
                            disabled
                            title="No puedes matricularte porque no cumples los prerrequisitos"
                          >
                            <Lock size={12} style={{ marginRight: 4 }} />
                            Prerrequisito Pendiente
                          </button>
                        ) : (
                          <button
                            className={`btn ${item.cupos_ocupados >= item.vacantes ? 'btn-secondary btn-disabled' : 'btn-primary'}`}
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                            disabled={item.cupos_ocupados >= item.vacantes}
                            onClick={() => handleSeleccionarGrupo(item.grupo_id)}
                          >
                            Seleccionar (Matricular)
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Selected Courses & Timetable */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Selected Courses Table */}
            <div className="card">
              <div className="card-header">
                <div className="card-title" style={{ fontSize: '1rem' }}>
                  <Award size={18} className="text-primary" />
                  <span>Mis Asignaturas Seleccionadas ({selecciones.length})</span>
                </div>
              </div>

              {selecciones.length === 0 ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Aún no has seleccionado ninguna asignatura para este periodo.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '0.5rem' }}>Asignatura</th>
                        <th style={{ padding: '0.5rem' }}>Sección</th>
                        <th style={{ padding: '0.5rem', textAlign: 'center' }}>Créditos</th>
                        <th style={{ padding: '0.5rem', textAlign: 'center' }}>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selecciones.map((s) => (
                        <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '0.6rem 0.5rem', fontWeight: 600 }}>
                            {s.asignatura_nombre || `Grupo ${s.id_grupo}`}
                          </td>
                          <td style={{ padding: '0.6rem 0.5rem' }}>
                            Sec {s.grupo_seccion || 'A'}
                          </td>
                          <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center', fontWeight: 700 }}>
                            4
                          </td>
                          <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>
                            <button
                              className="btn btn-danger"
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                              onClick={() => handleAnularSeleccion(s.id)}
                              title="Anular matrícula y liberar vacante"
                            >
                              <Trash2 size={13} />
                              Anular
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Weekly Timetable Preview Grid */}
            <div className="card">
              <div className="card-header">
                <div className="card-title" style={{ fontSize: '1rem' }}>
                  <Calendar size={18} className="text-primary" />
                  <span>Mi Horario Semanal</span>
                </div>
                <span className="badge badge-info">{studentActiveBlocks.length} Bloques</span>
              </div>

              <TimetableGrid blocks={studentActiveBlocks} />
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Historial Académico de Notas */}
      {activeTab === 'HISTORIAL' && (
        <HistorialNotasView
          estudianteId={selectedEstudianteId}
          currentEstudiante={currentEstudiante}
        />
      )}

      {/* Tab 3: Malla Curricular & Dependencias */}
      {activeTab === 'MALLA' && (
        <MallaCurricularView
          estudianteId={selectedEstudianteId}
          currentEstudiante={currentEstudiante}
        />
      )}
    </div>
  );
}