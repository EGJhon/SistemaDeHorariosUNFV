import React, { useState } from 'react';
import { X, PlusCircle, AlertCircle } from 'lucide-react';
import { api } from '../../api';

const DAYS = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];

export default function CrearBloqueModal({ grupos = [], aulas = [], onClose, onSuccess }) {
  const [grupoId, setGrupoId] = useState(grupos[0]?.id || '');
  const [diaSemana, setDiaSemana] = useState('LUNES');
  const [horaInicio, setHoraInicio] = useState('08:00');
  const [horaFin, setHoraFin] = useState('09:40');
  const [aulaId, setAulaId] = useState(aulas[0]?.id || '');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await api.crearBloqueHorario({
        id_grupo: parseInt(grupoId, 10),
        dia_semana: diaSemana,
        hora_inicio: horaInicio.length === 5 ? `${horaInicio}:00` : horaInicio,
        hora_fin: horaFin.length === 5 ? `${horaFin}:00` : horaFin,
        id_aula: parseInt(aulaId, 10),
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <h3 className="card-title" style={{ margin: 0 }}>
            <PlusCircle className="text-primary" size={20} />
            Regla 6: Crear Bloque de Horario General
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="alert-banner alert-banner-danger">
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>{error}</div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Grupo / Asignatura</label>
              <select className="select-input" value={grupoId} onChange={(e) => setGrupoId(e.target.value)} required>
                {grupos.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.codigo} — Sec {g.seccion} ({g.turno})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Día de Semana</label>
                <select className="select-input" value={diaSemana} onChange={(e) => setDiaSemana(e.target.value)}>
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
              <label className="form-label">Aula</label>
              <select className="select-input" value={aulaId} onChange={(e) => setAulaId(e.target.value)} required>
                {aulas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.codigo} ({a.tipo})
                  </option>
                ))}
              </select>
            </div>

            <div className="badge badge-info" style={{ padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)' }}>
              Nota: El bloque nace sin docente asignado (`id_docente = null`), según la Regla 6.
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Guardando...' : 'Crear Bloque'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
