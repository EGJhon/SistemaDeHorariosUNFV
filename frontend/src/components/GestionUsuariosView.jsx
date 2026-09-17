import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Search, Shield, GraduationCap, UserCheck, RefreshCw, Mail, Hash, Calendar } from 'lucide-react';
import { api } from '../api';
import CrearUsuarioModal from './modals/CrearUsuarioModal';

export default function GestionUsuariosView() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedRol, setSelectedRol] = useState('TODOS');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const cargarUsuarios = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getUsuarios();
      setUsuarios(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  // Filtered users
  const usuariosFiltrados = usuarios.filter((user) => {
    const matchesRol = selectedRol === 'TODOS' || user.rol === selectedRol;
    const query = search.toLowerCase();
    const matchesSearch =
      !search ||
      user.username.toLowerCase().includes(query) ||
      (user.nombres_completos && user.nombres_completos.toLowerCase().includes(query)) ||
      (user.email && user.email.toLowerCase().includes(query)) ||
      (user.codigo_universitario && user.codigo_universitario.toLowerCase().includes(query));

    return matchesRol && matchesSearch;
  });

  // Metrics
  const totalCount = usuarios.length;
  const adminCount = usuarios.filter((u) => u.rol === 'ADMIN').length;
  const docenteCount = usuarios.filter((u) => u.rol === 'DOCENTE').length;
  const estudianteCount = usuarios.filter((u) => u.rol === 'ESTUDIANTE').length;

  const getRolBadge = (rol) => {
    switch (rol) {
      case 'ADMIN':
        return (
          <span className="badge" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <Shield size={13} /> Admin / Consejo
          </span>
        );
      case 'DOCENTE':
        return (
          <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <UserCheck size={13} /> Docente EPIS
          </span>
        );
      case 'ESTUDIANTE':
      default:
        return (
          <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <GraduationCap size={13} /> Estudiante
          </span>
        );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
            <Users size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Usuarios</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{totalCount}</div>
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' }}>
            <Shield size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Administradores</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ef4444' }}>{adminCount}</div>
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}>
            <UserCheck size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Docentes</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#3b82f6' }}>{docenteCount}</div>
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
            <GraduationCap size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Estudiantes</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981' }}>{estudianteCount}</div>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="card" style={{ padding: '1.5rem' }}>
        {/* Controls Header */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          {/* Search bar */}
          <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: '400px' }}>
            <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="text-input"
              style={{ paddingLeft: '2.5rem', width: '100%' }}
              placeholder="Buscar por usuario, nombre, correo o código..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Role Filter Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {[
              { id: 'TODOS', label: 'Todos' },
              { id: 'ADMIN', label: 'Administradores' },
              { id: 'DOCENTE', label: 'Docentes' },
              { id: 'ESTUDIANTE', label: 'Estudiantes' },
            ].map((tab) => (
              <button
                key={tab.id}
                className={`btn ${selectedRol === tab.id ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem' }}
                onClick={() => setSelectedRol(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button className="btn btn-secondary" onClick={cargarUsuarios} title="Recargar lista">
              <RefreshCw size={16} className={loading ? 'spin' : ''} />
            </button>

            <button className="btn btn-primary" onClick={() => setIsModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UserPlus size={18} />
              Crear Nuevo Usuario
            </button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="alert-banner alert-banner-danger" style={{ marginBottom: '1rem' }}>
            <div>{error}</div>
          </div>
        )}

        {/* Loading state */}
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <RefreshCw size={28} className="spin" style={{ marginBottom: '0.5rem' }} />
            <p>Cargando lista de usuarios del sistema...</p>
          </div>
        ) : usuariosFiltrados.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px border-dashed var(--border-color)' }}>
            <Users size={40} style={{ opacity: 0.4, marginBottom: '0.75rem' }} />
            <h4>No se encontraron usuarios</h4>
            <p style={{ fontSize: '0.9rem' }}>Intenta ajustar tus filtros de búsqueda o crea un nuevo usuario institucional.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="timetable" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Usuario / Nombre Completo</th>
                  <th>Rol Institucional</th>
                  <th>Correo Electrónico</th>
                  <th>Detalles Institucionales</th>
                  <th>Fecha de Registro</th>
                </tr>
              </thead>
              <tbody>
                {usuariosFiltrados.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            backgroundColor: u.rol === 'ADMIN' ? 'rgba(239, 68, 68, 0.2)' : u.rol === 'DOCENTE' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                            color: u.rol === 'ADMIN' ? '#ef4444' : u.rol === 'DOCENTE' ? '#3b82f6' : '#10b981',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.95rem',
                          }}
                        >
                          {u.username.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{u.nombres_completos}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Hash size={12} /> @{u.username}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td>{getRolBadge(u.rol)}</td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                        <Mail size={14} />
                        {u.email || <span style={{ opacity: 0.5 }}>Sin correo</span>}
                      </div>
                    </td>

                    <td>
                      {u.rol === 'ESTUDIANTE' ? (
                        <div style={{ fontSize: '0.85rem' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-color)' }}>Cód: {u.codigo_universitario || u.username}</span>
                          <span className="badge badge-secondary" style={{ marginLeft: '0.5rem' }}>
                            Ciclo {u.ciclo_actual || 'I'}
                          </span>
                        </div>
                      ) : u.rol === 'DOCENTE' ? (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Docente Activo EPIS</div>
                      ) : (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Acceso Administrativo Total</div>
                      )}
                    </td>

                    <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Calendar size={13} />
                        {u.date_joined ? new Date(u.date_joined).toLocaleDateString('es-PE', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Reciente'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {isModalOpen && <CrearUsuarioModal onClose={() => setIsModalOpen(false)} onSuccess={cargarUsuarios} />}
    </div>
  );
}
