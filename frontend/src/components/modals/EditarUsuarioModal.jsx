import React, { useState } from 'react';
import { X, UserCog, AlertCircle } from 'lucide-react';
import { api } from '../../api';

const CYCLES = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

export default function EditarUsuarioModal({ usuario, onClose, onSuccess }) {
  const [username, setUsername] = useState(usuario.username || '');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState(usuario.first_name || '');
  const [lastName, setLastName] = useState(usuario.last_name || '');
  const [email, setEmail] = useState(usuario.email || '');
  const [rol, setRol] = useState(usuario.rol || 'ESTUDIANTE');
  const [codigoUni, setCodigoUni] = useState(
    usuario.codigo_universitario || usuario.username || ''
  );
  const [cicloActual, setCicloActual] = useState(usuario.ciclo_actual || 'I');
  const [malla, setMalla] = useState(usuario.malla || '2021');

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload = {
        username: username.trim(),
        email,
        first_name: firstName,
        last_name: lastName,
        rol,
        codigo_universitario: codigoUni || username,
        ciclo_actual: cicloActual,
        malla,
      };
      if (password.trim()) {
        payload.password = password;
      }

      await api.actualizarUsuario(usuario.id, payload);
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
      <div className="modal-card" style={{ maxWidth: '520px' }}>
        <div className="modal-header">
          <h3 className="card-title" style={{ margin: 0 }}>
            <UserCog className="text-primary" size={20} />
            Editar Usuario Institucional
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Nombre de Usuario *</label>
                <input
                  type="text"
                  className="text-input"
                  placeholder="ej. 2024001001 o jmarquez"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Nueva Contraseña</label>
                <input
                  type="password"
                  className="text-input"
                  placeholder="Dejar vacío para mantener"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Nombres</label>
                <input
                  type="text"
                  className="text-input"
                  placeholder="ej. Juan Alberto"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Apellidos</label>
                <input
                  type="text"
                  className="text-input"
                  placeholder="ej. Márquez Ramos"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Correo Institucional</label>
              <input
                type="email"
                className="text-input"
                placeholder="ej. usuario@unfv.edu.pe"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Rol Institucional *</label>
              <select className="select-input" value={rol} onChange={(e) => setRol(e.target.value)}>
                <option value="ESTUDIANTE">Estudiante / Alumno</option>
                <option value="DOCENTE">Docente / Profesor</option>
                <option value="ADMIN">Administrador / Consejo de Facultad</option>
              </select>
            </div>

            {rol === 'ESTUDIANTE' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', backgroundColor: 'var(--bg-card)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <div className="form-group">
                  <label className="form-label">Código Universitario</label>
                  <input
                    type="text"
                    className="text-input"
                    placeholder="ej. 2024001001"
                    value={codigoUni}
                    onChange={(e) => setCodigoUni(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Ciclo Actual</label>
                  <select className="select-input" value={cicloActual} onChange={(e) => setCicloActual(e.target.value)}>
                    {CYCLES.map((c) => (
                      <option key={c} value={c}>
                        Ciclo {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Malla Curricular</label>
                  <input
                    type="text"
                    className="text-input"
                    placeholder="ej. 2021"
                    value={malla}
                    onChange={(e) => setMalla(e.target.value)}
                  />
                </div>
              </div>
            )}

            {rol !== (usuario.rol || 'ESTUDIANTE') && (
              <div className="alert-banner" style={{ backgroundColor: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.35)', color: 'var(--text-color)' }}>
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: '0.85rem' }}>
                  Cambiarás el rol de <strong>{usuario.rol}</strong> a <strong>{rol}</strong>.
                  Se sincronizarán los perfiles de estudiante/docente automáticamente.
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
