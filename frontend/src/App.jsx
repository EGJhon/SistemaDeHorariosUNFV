import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/common/Navbar';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import DocenteDashboard from './pages/DocenteDashboard';
import EstudianteDashboard from './pages/EstudianteDashboard';

function MainApp() {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <LoginPage />;
  }

  const renderRoleDashboard = () => {
    switch (currentUser.rol) {
      case 'ADMINISTRADOR':
      case 'ADMIN':
        return <AdminDashboard />;
      case 'DOCENTE':
        return <DocenteDashboard />;
      case 'ESTUDIANTE':
      default:
        return <EstudianteDashboard />;
    }
  };

  return (
    <div className="app-container">
      <Navbar />

      <main className="main-content">
        {renderRoleDashboard()}
      </main>

      <footer
        style={{
          textAlign: 'center',
          padding: '1.5rem',
          color: 'var(--text-dim)',
          fontSize: '0.8rem',
          borderTop: '1px solid var(--border-color)',
          marginTop: '2rem',
        }}
      >
        Universidad Nacional Federico Villarreal — Escuela Profesional de Ingeniería de Sistemas (EPIS) © 2026
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
