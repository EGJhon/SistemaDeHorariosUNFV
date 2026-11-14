import React, { useState, useEffect } from 'react';
import { Award, BookOpen, CheckCircle, GraduationCap, Calendar, BarChart2 } from 'lucide-react';
import { api } from '../api';

export default function HistorialNotasView({ estudianteId, currentEstudiante }) {
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtroCiclo, setFiltroCiclo] = useState('TODOS');

  useEffect(() => {
    if (estudianteId) {
      cargarHistorial();
    }
  }, [estudianteId]);

  const cargarHistorial = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getHistorialEstudiante(estudianteId);
      setHistorial(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Error al cargar el historial académico');
    } finally {
      setLoading(false);
    }
  };

  // Calculations
  const asignaturasAprobadas = historial.filter((h) => h.estado === 'aprobado');
  const totalCreditos = asignaturasAprobadas.reduce((acc, h) => acc + (h.asignatura_creditos || 4), 0);
  
  const sumaPonderada = asignaturasAprobadas.reduce((acc, h) => acc + (h.nota * (h.asignatura_creditos || 4)), 0);
  const promedioPonderado = totalCreditos > 0 ? (sumaPonderada / totalCreditos).toFixed(2) : '0.00';

  // Filtered list
  const historialFiltrado = historial.filter((h) => {
    if (filtroCiclo === 'TODOS') return true;
    return h.asignatura_ciclo === filtroCiclo;
  });

  const getNotaBadgeStyle = (nota) => {
    if (nota >= 16) {
      return { backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' };
    }
    if (nota >= 11) {
      return { backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)' };
    }
    return { backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Student Academic Summary Card */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <GraduationCap className="text-primary" size={24} />
              <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>
                Récord Académico e Historial de Notas
              </h3>
            </div>
            <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Estudiante: <strong>{currentEstudiante?.nombres}</strong> | Código: <strong>{currentEstudiante?.codigo_universitario}</strong> | Ciclo Actual: <strong>{currentEstudiante?.ciclo_actual}</strong>
            </p>
          </div>

          <span className="badge badge-info" style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>
            EPIS — Universidad Nacional Federico Villarreal
          </span>
        </div>

        {/* Academic Metrics Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div style={{ backgroundColor: 'var(--bg-main)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>
              <CheckCircle size={16} className="text-success" />
              CURSOS APROBADOS
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '0.35rem', color: 'var(--success)' }}>
              {asignaturasAprobadas.length}
            </div>
          </div>

          <div style={{ backgroundColor: 'var(--bg-main)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>
              <Award size={16} className="text-primary" />
              CRÉDITOS ACUMULADOS
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '0.35rem', color: 'var(--primary-light)' }}>
              {totalCreditos} <span style={{ fontSize: '0.9rem', color: 'var(--text-dim)' }}>cr.</span>
            </div>
          </div>

          <div style={{ backgroundColor: 'var(--bg-main)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>
              <BarChart2 size={16} style={{ color: '#f59e0b' }} />
              PROMEDIO PONDERADO
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '0.35rem', color: '#f59e0b' }}>
              {promedioPonderado}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Grades Table Card */}
      <div className="card">
        <div className="card-header">
          <div className="card-title" style={{ fontSize: '1.05rem' }}>
            <BookOpen size={18} className="text-primary" />
            <span>Detalle de Asignaturas Cursadas</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Filtrar por Ciclo:</span>
            <div className="cycle-tabs">
              {['TODOS', 'I', 'II', 'III', 'IV', 'V'].map((c) => (
                <button
                  key={c}
                  className={`cycle-btn ${filtroCiclo === c ? 'active' : ''}`}
                  onClick={() => setFiltroCiclo(c)}
                  style={{ padding: '0.2rem 0.55rem', fontSize: '0.75rem' }}
                >
                  {c === 'TODOS' ? 'TODOS' : `Ciclo ${c}`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Cargando historial de notas...
          </div>
        ) : error ? (
          <div style={{ padding: '1.5rem', color: 'var(--danger)' }}>{error}</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-main)', borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', textAlign: 'left' }}>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Ciclo</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Código</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Asignatura</th>
                  <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>Créditos</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Periodo Cursado</th>
                  <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>Nota Final</th>
                  <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>Condición</th>
                </tr>
              </thead>
              <tbody>
                {historialFiltrado.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No se encontraron asignaturas registradas para este filtro.
                    </td>
                  </tr>
                ) : (
                  historialFiltrado.map((h) => {
                    const notaBadge = getNotaBadgeStyle(h.nota);
                    return (
                      <tr key={h.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.65rem 0.85rem', fontWeight: 700 }}>
                          Ciclo {h.asignatura_ciclo || 'I'}
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem', fontWeight: 600, color: 'var(--primary-light)' }}>
                          {h.asignatura_codigo}
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem', fontWeight: 600 }}>
                          {h.asignatura_nombre}
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>
                          {h.asignatura_creditos || 4}
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem', color: 'var(--text-muted)' }}>
                          {h.periodo_nombre || '2024-1'}
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>
                          <span
                            style={{
                              ...notaBadge,
                              padding: '0.2rem 0.55rem',
                              borderRadius: 'var(--radius-sm)',
                              fontWeight: 800,
                              fontSize: '0.85rem',
                              display: 'inline-block',
                            }}
                          >
                            {Number(h.nota).toFixed(1)}
                          </span>
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>
                          <span className="badge badge-success" style={{ textTransform: 'capitalize' }}>
                            {h.estado}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}