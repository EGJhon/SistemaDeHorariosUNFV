import React, { useState } from 'react';
import { Shield, User, GraduationCap, LogIn, Key, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (usr, pwd) => {
    setError(null);
    setLoading(true);
    try {
      await login(usr, pwd);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', background: 'radial-gradient(circle at top, #1e293b 0%, #090d16 100%)' }}>
      <div style={{ width: '100%', maxWidth: '480px' }} className="card">
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div className="navbar-logo-badge" style={{ display: 'inline-block', fontSize: '1.5rem', padding: '0.5rem 1.25rem', marginBottom: '0.75rem' }}>
            UNFV EPIS
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Sistema de Horarios</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
            Inicia sesión con tu perfil institucional
          </p>
        </div>

        {error && (
          <div className="alert-banner alert-banner-danger" style={{ marginBottom: '1.25rem' }}>
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>{error}</div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          <div className="form-group">
            <label className="form-label">Usuario / Código Universitario</label>
            <input
              type="text"
              className="text-input"
              placeholder="ej. admin o 2021001001"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <input
              type="password"
              className="text-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem', fontSize: '0.95rem' }} disabled={loading}>
            <LogIn size={18} />
            <span>{loading ? 'Ingresando...' : 'Iniciar Sesión'}</span>
          </button>
        </form>

        {/* Quick Access Roles */}
        <div style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', textAlign: 'center', marginBottom: '0.85rem', fontWeight: 600 }}>
            ACCESO RÁPIDO PARA EVALUADORES (3 ROLES):
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ flexDirection: 'column', padding: '0.7rem 0.4rem', fontSize: '0.78rem', gap: 4 }}
              onClick={() => handleQuickLogin('admin', 'admin123')}
            >
              <Shield size={18} className="text-primary" />
              <strong>Admin</strong>
              <span style={{ fontSize: '0.65rem', opacity: 0.65 }}>admin / admin123</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              style={{ flexDirection: 'column', padding: '0.7rem 0.4rem', fontSize: '0.78rem', gap: 4 }}
              onClick={() => handleQuickLogin('cmendoza', 'docente123')}
            >
              <User size={18} style={{ color: 'var(--warning)' }} />
              <strong>Docente</strong>
              <span style={{ fontSize: '0.65rem', opacity: 0.65 }}>cmendoza / docente123</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              style={{ flexDirection: 'column', padding: '0.7rem 0.4rem', fontSize: '0.78rem', gap: 4 }}
              onClick={() => handleQuickLogin('2021001001', 'estudiante123')}
            >
              <GraduationCap size={18} style={{ color: 'var(--success)' }} />
              <strong>Estudiante</strong>
              <span style={{ fontSize: '0.65rem', opacity: 0.65 }}>2021001001 / estudiante123</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
