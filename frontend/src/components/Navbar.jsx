import React, { useState } from 'react';
import { UserCheck, BookOpen, Shield, GraduationCap, User, LogIn, Key } from 'lucide-react';
import { api } from '../api';

export default function Navbar({ activeTab, setActiveTab, currentUser, setCurrentUser }) {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (usr, pwd) => {
    setError(null);
    setLoading(true);
    try {
      const data = await api.login(usr || username, pwd || password);
      setCurrentUser(data);
      setShowLoginModal(false);

      // Automatically switch tab based on role
      if (data.rol === 'ESTUDIANTE') {
        setActiveTab('matricula');
      } else {
        setActiveTab('general');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadge = (rol) => {
    if (rol === 'ADMIN') return <span className="badge badge-danger"><Shield size={12} /> ADMINISTRADOR</span>;
    if (rol === 'DOCENTE') return <span className="badge badge-warning"><User size={12} /> DOCENTE</span>;
    return <span className="badge badge-success"><GraduationCap size={12} /> ESTUDIANTE</span>;
  };

  return (
    <header className="navbar">
      <div className="navbar-brand">
        <div className="navbar-logo-badge">UNFV</div>
        <div>
          <h1 className="navbar-title">Sistema de Horarios EPIS</h1>
          <div className="navbar-subtitle">Escuela Profesional de Ingeniería de Sistemas — Periodo 2026-2</div>
        </div>
      </div>

      <nav className="navbar-tabs">
        <button
          className={`tab-btn ${activeTab === 'general' ? 'active' : ''}`}
          onClick={() => setActiveTab('general')}
        >
          <BookOpen size={18} />
          <span>Horario General</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'matricula' ? 'active' : ''}`}
          onClick={() => setActiveTab('matricula')}
        >
          <UserCheck size={18} />
          <span>Matrícula Estudiante</span>
        </button>
      </nav>

      {/* User Session Profile & Role Switcher */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {currentUser ? (
          <div
            onClick={() => setShowLoginModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: 'var(--bg-card)',
              padding: '0.4rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              cursor: 'pointer',
            }}
          >
            {getRoleBadge(currentUser.rol)}
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{currentUser.nombres}</span>
          </div>
        ) : (
          <button className="btn btn-primary" onClick={() => setShowLoginModal(true)}>
            <LogIn size={16} />
            <span>Iniciar Sesión</span>
          </button>
        )}
      </div>

      {/* Login / Role Switcher Modal */}
      {showLoginModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3 className="card-title" style={{ margin: 0 }}>
                <Key className="text-primary" size={20} />
                Autenticación y Cambio de Rol (3 Tipos de Usuario)
              </h3>
              <button onClick={() => setShowLoginModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              {error && (
                <div className="alert-banner alert-banner-danger">
                  <div>{error}</div>
                </div>
              )}

              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>Aceso Rápido por Rol:</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: '0.78rem', flexDirection: 'column', gap: 2, padding: '0.6rem' }}
                    onClick={() => handleLogin('admin', 'admin123')}
                  >
                    <Shield size={16} className="text-primary" />
                    <strong>Admin</strong>
                    <span style={{ fontSize: '0.68rem', opacity: 0.7 }}>admin / admin123</span>
                  </button>

                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: '0.78rem', flexDirection: 'column', gap: 2, padding: '0.6rem' }}
                    onClick={() => handleLogin('cmendoza', 'docente123')}
                  >
                    <User size={16} style={{ color: 'var(--warning)' }} />
                    <strong>Docente</strong>
                    <span style={{ fontSize: '0.68rem', opacity: 0.7 }}>cmendoza / docente123</span>
                  </button>

                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: '0.78rem', flexDirection: 'column', gap: 2, padding: '0.6rem' }}
                    onClick={() => handleLogin('2021001001', 'estudiante123')}
                  >
                    <GraduationCap size={16} style={{ color: 'var(--success)' }} />
                    <strong>Estudiante</strong>
                    <span style={{ fontSize: '0.68rem', opacity: 0.7 }}>2021001001 / estudiante123</span>
                  </button>
                </div>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
                <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                  <label className="form-label">Usuario / Código</label>
                  <input
                    type="text"
                    className="text-input"
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
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="modal-footer" style={{ marginTop: '1.25rem', padding: 0, background: 'none', border: 'none' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowLoginModal(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Autenticando...' : 'Iniciar Sesión'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
