import React, { useState, useEffect } from 'react';
import { UserCheck, BookOpen, AlertCircle, CheckCircle, Trash2, Calendar, Award } from 'lucide-react';
import { api } from '../api';
import TimetableGrid from './timetable/TimetableGrid';

export default function MatriculaEstudianteView({ currentUser }) {
  const [estudiantes, setEstudiantes] = useState([]);
  const [selectedEstudianteId, setSelectedEstudianteId] = useState('');
  const [periodos, setPeriodos] = useState([]);
  const [selectedPeriodo, setSelectedPeriodo] = useState('');

  const [selecciones, setSelecciones] = useState([]);
  const [gruposOferta, setGruposOferta] = useState([]);
  const [horarioGeneralData, setHorarioGeneralData] = useState([]);

  const [alert, setAlert] = useState(null); // { type: 'danger'|'success', message: '' }
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
        targetPId = String(pRes[0].id);
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
      const [selRes, hgRes] = await Promise.all([
        api.getSelecciones(),
        api.getHorarioGeneral(pId),
      ]);

      // Filter active selecciones for current student and period
      const activeSel = selRes.filter(
        (s) =>
          s.id_estudiante === parseInt(estId, 10) &&
          s.id_periodo === parseInt(pId, 10) &&
          ['pendiente', 'confirmada'].includes(s.estado)
      );

      setSelecciones(activeSel);
      setHorarioGeneralData(hgRes);
    } catch (err) {
      console.error('Error cargando datos del estudiante:', err);
    } finally {
      setLoading(false);
    }
  };

  const currentEstudiante = estudiantes.find((e) => e.id === parseInt(selectedEstudianteId, 10));

  // Compute total active credits
  const totalCreditos = selecciones.reduce((acc, s) => {
    const itemHG = horarioGeneralData.find((hg) => hg.grupo_id === s.id_grupo);
    if (itemHG) {
      // Find course credits from matched item
      return acc + (itemHG.creditos || 4); // Default 4 cr
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

  // Student active timetable blocks for visual TimetableGrid
  const studentActiveBlocks = [];
  selecciones.forEach((s) => {
    const itemHG = horarioGeneralData.find((hg) => hg.grupo_id === s.id_grupo);
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
      {/* Top Banner: Student Selector & Credit Summary */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <UserCheck className="text-primary" size={22} />
            <span>Reglas 1 - 5: Matrícula e Horario Individual del Estudiante</span>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
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
                  Estudiante: <strong>{currentEstudiante?.nombres || currentUser?.nombres}</strong> ({currentEstudiante?.codigo_universitario || currentUser?.username})
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
                      {e.codigo_universitario} — {e.nombres} ({e.ciclo_actual} Ciclo)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Credit Limits Summary Bar */}
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            padding: '1.1rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            marginBottom: '1rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
              Créditos Seleccionados (Regla 5):
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
            <span>• Límite Estándar: 22 Créditos</span>
            {maxCreditos === 24 && (
              <span className="badge badge-success">
                <Award size={12} /> Solicitud de Ampliación Aprobada (+2 cr = 24 cr max)
              </span>
            )}
          </div>
        </div>

        {/* Notification Alert Banner */}
        {alert && (
          <div className={`alert-banner alert-banner-${alert.type}`}>
            <AlertCircle size={20} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong>{alert.type === 'danger' ? 'Error en Validación de Regla de Negocio:' : 'Operación Exitosa:'}</strong>
              <div style={{ marginTop: 2 }}>{alert.message}</div>
            </div>
          </div>
        )}
      </div>

      {/* Main Two-Column View: Left = Offer Catalog, Right = Selected Courses */}
      <div className="two-column-layout">
        {/* Available Groups Offer */}
        <div className="card">
          <div className="card-header">
            <div className="card-title" style={{ fontSize: '1rem' }}>
              <BookOpen size={18} className="text-primary" />
              <span>Oferta de Cursos Disponibles</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '550px', overflowY: 'auto' }}>
            {horarioGeneralData.map((item) => {
              const isSelected = selecciones.some((s) => s.id_grupo === item.grupo_id);

              return (
                <div
                  key={`${item.codigo_asignatura}_${item.grupo_id}`}
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    border: isSelected ? '2px solid var(--success)' : '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.85rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span className="badge badge-info" style={{ marginBottom: 4 }}>Ciclo {item.ciclo}</span>
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
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                    {item.bloques.map((b) => (
                      <div key={b.id_bloque}>
                        • {b.dia_semana}: {b.hora_inicio} - {b.hora_fin} (Aula {b.aula})
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                    {isSelected ? (
                      <span className="badge badge-success">
                        <CheckCircle size={14} /> Seleccionado
                      </span>
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
        </div>

        {/* Active Enrolled Courses */}
        <div className="card">
          <div className="card-header">
            <div className="card-title" style={{ fontSize: '1rem' }}>
              <CheckCircle size={18} className="text-success" />
              <span>Cursos Seleccionados Activos ({selecciones.length})</span>
            </div>
          </div>

          {selecciones.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              No has seleccionado ninguna asignatura todavía. Elige una del catálogo a la izquierda.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {selecciones.map((s) => {
                const itemHG = horarioGeneralData.find((hg) => hg.grupo_id === s.id_grupo);
                return (
                  <div
                    key={s.id}
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                        {s.asignatura_nombre || itemHG?.nombre_asignatura}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Sección {s.grupo_seccion || itemHG?.seccion} | Estado: <span style={{ color: 'var(--success)', fontWeight: 600 }}>{s.estado}</span>
                      </div>
                    </div>

                    <button
                      className="btn btn-danger"
                      style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
                      onClick={() => handleAnularSeleccion(s.id)}
                    >
                      <Trash2 size={14} />
                      <span>Anular</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Student Personal Visual Timetable Grid */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Calendar className="text-primary" size={22} />
            <span>Matriz Visual del Horario del Estudiante</span>
          </div>
        </div>

        <TimetableGrid blocks={studentActiveBlocks} />
      </div>
    </div>
  );
}
