import React, { useState } from 'react';
import { Calendar, ShieldCheck, Users, Clock } from 'lucide-react';
import HorarioGeneralView from '../components/HorarioGeneralView';
import GestionUsuariosView from '../components/GestionUsuariosView';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('HORARIOS'); // 'HORARIOS' | 'USUARIOS'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Admin Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          backgroundColor: 'var(--bg-card)',
          padding: '1.25rem 1.5rem',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <ShieldCheck className="text-danger" size={24} />
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>
              Panel de Administración Institucional (Consejo de Facultad EPIS)
            </h2>
          </div>
          <p style={{ margin: '0.35rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Módulo central para estructurar la oferta horaria de la EPIS - UNFV y administrar las cuentas de usuarios (Administradores, Docentes y Estudiantes).
          </p>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: 'var(--bg-main)', padding: '0.35rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          <button
            className={`btn ${activeTab === 'HORARIOS' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('HORARIOS')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', border: activeTab === 'HORARIOS' ? undefined : 'none' }}
          >
            <Clock size={16} />
            Horario General UNFV
          </button>
          <button
            className={`btn ${activeTab === 'USUARIOS' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('USUARIOS')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', border: activeTab === 'USUARIOS' ? undefined : 'none' }}
          >
            <Users size={16} />
            Gestión de Usuarios
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'HORARIOS' ? <HorarioGeneralView /> : <GestionUsuariosView />}
    </div>
  );
}

