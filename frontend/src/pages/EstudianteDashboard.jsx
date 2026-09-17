import React from 'react';
import { useAuth } from '../context/AuthContext';
import MatriculaEstudianteView from '../components/MatriculaEstudianteView';

export default function EstudianteDashboard() {
  const { currentUser } = useAuth();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>
            Portal de Matrícula del Estudiante
          </h2>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Bienvenido(a), <strong>{currentUser?.nombre || 'Estudiante'}</strong>. Inscríbete en asignaturas respetando prerrequisitos, cruces de horario y límites de créditos (Reglas 1-5).
          </p>
        </div>
      </div>

      <MatriculaEstudianteView currentUser={currentUser} />
    </div>
  );
}
