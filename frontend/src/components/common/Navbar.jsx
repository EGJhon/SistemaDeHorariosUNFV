import React from 'react';
import { Shield, User, GraduationCap, LogOut, Calendar } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const { currentUser, logout } = useAuth();

  const getRoleBadge = (rol) => {
    if (rol === 'ADMINISTRADOR' || rol === 'ADMIN') {
      return (
        <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <Shield size={12} /> ADMINISTRADOR
        </span>
      );
    }
    if (rol === 'DOCENTE') {
      return (
        <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <User size={12} /> DOCENTE
        </span>
      );
    }
    return (
      <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        <GraduationCap size={12} /> ESTUDIANTE
      </span>
    );
  };

  const getPortalTitle = (rol) => {
    if (rol === 'ADMINISTRADOR' || rol === 'ADMIN') {
      return 'Creación y Gestión del Horario General';
    }
    if (rol === 'DOCENTE') {
      return 'Portal de Asignación y Carga Lectiva del Docente';
    }
    return 'Portal de Matrícula e Horario del Estudiante';
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

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        {currentUser && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: 'var(--bg-card)',
                padding: '0.4rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
              }}
            >
              {getRoleBadge(currentUser.rol)}
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{currentUser.nombres || currentUser.username}</span>
            </div>

            <button className="btn btn-secondary" onClick={logout} title="Cerrar Sesión">
              <LogOut size={16} />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
