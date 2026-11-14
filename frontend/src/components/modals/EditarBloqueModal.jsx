import React, { useState } from 'react';
import { X, Edit3, Trash2, AlertCircle, Save, UserX } from 'lucide-react';
import { api } from '../../api';

const DAYS = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];

export default function EditarBloqueModal({ bloque, aulas = [], docentes = [], onClose, onSuccess }) {
  // Normalize initial times to HH:MM
  const initialHoraInicio = bloque.hora_inicio?.substring(0, 5) || '08:00';
  const initialHoraFin = bloque.hora_fin?.substring(0, 5) || '09:40';

  const [diaSemana, setDiaSemana] = useState(bloque.dia_semana?.toUpperCase() || 'LUNES');
  const [horaInicio, setHoraInicio] = useState(initialHoraInicio);
  const [horaFin, setHoraFin] = useState(initialHoraFin);

  // Find matching aula ID if not directly present
  const matchingAula = aulas.find((a) => a.codigo === bloque.aula);
  const [aulaId, setAulaId] = useState(bloque.id_aula || matchingAula?.id || aulas[0]?.id || '');

  // Teacher selection
  const [docenteId, setDocenteId] = useState(bloque.id_docente ? String(bloque.id_docente) : '');

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload = {
        dia_semana: diaSemana,
        hora_inicio: horaInicio.length === 5 ? `${horaInicio}:00` : horaInicio,
        hora_fin: horaFin.length === 5 ? `${horaFin}:00` : horaFin,
        id_aula: parseInt(aulaId, 10),
      };

      if (!docenteId || docenteId === '') {
        payload.desasignar_docente = true;
      } else {
        payload.id_docente = parseInt(docenteId, 10);
      }

      await api.actualizarBloqueHorario(bloque.id_bloque, payload);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Error al actualizar el bloque');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setError(null);
    setLoading(true);

    try {
      await api.eliminarBloqueHorario(bloque.id_bloque);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Error al eliminar el bloque');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <h3 className="card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Edit3 className="text-primary" size={20} />
            Modificar Bloque de Horario
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {error && (
            <div className="alert-banner alert-banner-danger" style={{ marginBottom: '1rem' }}>
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>{error}</div>
            </div>
          )}

          {/* Context information */}
          <div
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'var(--bg-main)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              marginBottom: '1.25rem',
              fontSize: '0.85rem',
            }}
          >
            <div style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: 4 }}>
              {bloque.codigo_asignatura} — {bloque.nombre_asignatura}
            </div>
            <div style={{ color: 'var(--text-muted)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <span><strong>Sección:</strong> {bloque.seccion}</span>
              <span><strong>Turno:</strong> {bloque.turno}</span>
              <span><strong>Ciclo:</strong> {bloque.ciclo || 'N/A'}</span>
            </div>
          </div>

          {!confirmDelete ? (
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">Día de Semana</label>
                    <select
                      className="select-input"
                      value={diaSemana}
                      onChange={(e) => setDiaSemana(e.target.value)}
                      required
                    >
                      {DAYS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Hora Inicio</label>
                    <input
                      type="time"
                      className="text-input"
                      value={horaInicio}
                      onChange={(e) => setHoraInicio(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Hora Fin</label>
                    <input
                      type="time"
                      className="text-input"
                      value={horaFin}
                      onChange={(e) => setHoraFin(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Aula Asignada</label>
                  <select
                    className="select-input"
                    value={aulaId}
                    onChange={(e) => setAulaId(e.target.value)}
                    required
                  >
                    {aulas.map((a) => (
                      <option key={a.id} value={a.id}>
                        Aula {a.codigo} ({a.tipo})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Docente Asignado</label>
                  <select
                    className="select-input"
                    value={docenteId}
                    onChange={(e) => setDocenteId(e.target.value)}
                  >
                    <option value="">-- Sin Docente Asignado --</option>
                    {docentes.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nombre} ({d.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '1.25rem',
                    paddingTop: '1rem',
                    borderTop: '1px solid var(--border-color)',
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => setConfirmDelete(true)}
                    disabled={loading}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <Trash2 size={16} />
                    Eliminar Bloque
                  </button>

                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={onClose}
                      disabled={loading}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={loading}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <Save size={16} />
                      {loading ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          ) : (
            <div
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
                textAlign: 'center',
              }}
            >
              <Trash2 className="text-danger" size={36} style={{ margin: '0 auto 0.75rem auto' }} />
              <h4 style={{ color: 'var(--danger)', marginBottom: '0.5rem', fontWeight: 700 }}>
                ¿Confirmas la eliminación de este bloque?
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                Se eliminará el bloque del <strong>{diaSemana}</strong> de <strong>{horaInicio} a {horaFin}</strong> en el aula <strong>{bloque.aula}</strong>. Esta acción no se puede deshacer.
              </p>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setConfirmDelete(false)}
                  disabled={loading}
                >
                  No, volver
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleDelete}
                  disabled={loading}
                >
                  {loading ? 'Eliminando...' : 'Sí, Eliminar Bloque'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}