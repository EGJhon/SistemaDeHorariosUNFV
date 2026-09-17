import React, { useState } from 'react';
import { X, UserPlus, AlertCircle, Shield, User, GraduationCap } from 'lucide-react';
import { api } from '../../api';

const CYCLES = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

export default function CrearUsuarioModal({ onClose, onSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [rol, setRol] = useState('ESTUDIANTE');
  const [codigoUni, setCodigoUni] = useState('');
  const [cicloActual, setCicloActual] = useState('I');

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await api.crearUsuario({
        username,
        password,
        email,
        first_name: firstName,
        last_name: lastName,
        rol,
        codigo_universitario: codigoUni || username,
        ciclo_actual: cicloActual,
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
      <div className="modal-card" style={{ maxWidth: '520px' }}>
        <div className="modal-header">
          <h3 className="card-title" style={{ margin: 0 }}>
            <UserPlus className="text-primary" size={20} />
            Crear Nuevo Usuario Institucional
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
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (!codigoUni) setCodigoUni(e.target.value);
                  }}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Contraseña *</label>
                <input
                  type="password"
                  className="text-input"
                  placeholder="Contraseña inicial"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
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
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creando Usuario...' : 'Crear Usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
