import React, { useState } from 'react';
import { X, UserCheck, AlertCircle } from 'lucide-react';
import { api } from '../api';

export default function AsignarDocenteModal({ bloque, docentes = [], onClose, onSuccess }) {
  const [docenteId, setDocenteId] = useState(docentes[0]?.id || '');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await api.asignarDocenteBloque(bloque.id_bloque, parseInt(docenteId, 10));
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
            <UserCheck className="text-primary" size={20} />
            Regla 7: Elección de Bloque por Docente
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

            <div className="badge badge-info" style={{ padding: '0.6rem 0.85rem', width: '100%', display: 'block' }}>
              <strong>Bloque Seleccionado:</strong> {bloque.codigo_asignatura} - Sec {bloque.seccion} | {bloque.dia_semana} ({bloque.hora_inicio} - {bloque.hora_fin}) | Aula: {bloque.aula}
            </div>

            <div className="form-group">
              <label className="form-label">Docente a Asignar</label>
              <select className="select-input" value={docenteId} onChange={(e) => setDocenteId(e.target.value)} required>
                {docentes.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nombre} ({d.email})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Asignando...' : 'Asignar Docente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
