import React, { useState, useEffect } from 'react';
import { GitBranch, CheckCircle2, Lock, Unlock, BookOpen, AlertTriangle } from 'lucide-react';
import { api } from '../api';

const CYCLES = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

export default function MallaCurricularView({ estudianteId, currentEstudiante }) {
  const [malla, setMalla] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCiclo, setSelectedCiclo] = useState('TODOS');

  useEffect(() => {
    if (estudianteId) {
      cargarMalla();
    }
  }, [estudianteId]);

  const cargarMalla = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getMallaCurricularEstudiante(estudianteId);
      setMalla(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Error al cargar la malla curricular');
    } finally {
      setLoading(false);
    }
  };

  // Group courses by cycle
  const coursesByCycle = {};
  CYCLES.forEach((c) => {
    coursesByCycle[c] = malla.filter((m) => m.ciclo === c);
  });

  const getStatusBadge = (item) => {
    switch (item.estado) {
      case 'aprobado':
        return (
          <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            <CheckCircle2 size={12} /> Aprobado ({item.nota ? Number(item.nota).toFixed(1) : 'OK'})
          </span>
        );
      case 'matriculado':
        return (
          <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            <BookOpen size={12} /> Matriculado
          </span>
        );
      case 'habilitado':
        return (
          <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            <Unlock size={12} /> Habilitado
          </span>
        );
      case 'bloqueado':
      default:
        return (
          <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            <Lock size={12} /> Bloqueado
          </span>
        );
    }
  };

  const getCardBorder = (estado) => {
    switch (estado) {
      case 'aprobado':
        return '1px solid rgba(16, 185, 129, 0.4)';
      case 'matriculado':
        return '1px solid rgba(245, 158, 11, 0.4)';
      case 'habilitado':
        return '1px solid rgba(56, 189, 248, 0.5)';
      case 'bloqueado':
      default:
        return '1px solid var(--border-color)';
    }
  };

  const cyclesToDisplay = selectedCiclo === 'TODOS' ? CYCLES : [selectedCiclo];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header and Legend Card */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <GitBranch className="text-primary" size={24} />
              <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>
                Malla Curricular EPIS y Grafo de Dependencias
              </h3>
            </div>
            <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Visualiza los prerrequisitos académicos de cada asignatura y tu estado de elegibilidad para matricularte.
            </p>
            <span className="badge badge-info" style={{ marginTop: '0.5rem', display: 'inline-block' }}>
              Malla Curricular: {currentEstudiante?.malla || '2021'}
            </span>
          </div>

          {/* Filter tabs */}
          <div className="cycle-tabs" style={{ flexWrap: 'wrap' }}>
            <button
              className={`cycle-btn ${selectedCiclo === 'TODOS' ? 'active' : ''}`}
              onClick={() => setSelectedCiclo('TODOS')}
            >
              Todos los Ciclos
            </button>
            {CYCLES.map((c) => (
              <button
                key={c}
                className={`cycle-btn ${selectedCiclo === c ? 'active' : ''}`}
                onClick={() => setSelectedCiclo(c)}
              >
                Ciclo {c}
              </button>
            ))}
          </div>
        </div>

        {/* Status Legend */}
        <div
          style={{
            display: 'flex',
            gap: '1.5rem',
            flexWrap: 'wrap',
            padding: '0.75rem 1rem',
            backgroundColor: 'var(--bg-main)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            fontSize: '0.8rem',
          }}
        >
          <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>Leyenda de Estado:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#10b981' }} />
            <span>Aprobado (Nota registrada)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#38bdf8' }} />
            <span>Habilitado (Prerrequisitos aprobados)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#ef4444' }} />
            <span>Bloqueado (Faltan prerrequisitos)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#f59e0b' }} />
            <span>Matriculado en Periodo Activo</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Cargando estructura de la malla curricular...
        </div>
      ) : error ? (
        <div className="alert-banner alert-banner-danger">{error}</div>
      ) : (
        /* Cycles Grid Layout */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: selectedCiclo === 'TODOS' ? 'repeat(auto-fill, minmax(280px, 1fr))' : '1fr',
            gap: '1.25rem',
            alignItems: 'start',
          }}
        >
          {cyclesToDisplay.map((ciclo) => {
            const courses = coursesByCycle[ciclo] || [];
            return (
              <div
                key={ciclo}
                className="card"
                style={{
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid var(--border-color)',
                    paddingBottom: '0.5rem',
                  }}
                >
                  <h4 style={{ margin: 0, fontWeight: 800, color: 'var(--primary-light)', fontSize: '1.05rem' }}>
                    CICLO {ciclo}
                  </h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {courses.length} Cursos
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {courses.map((c) => (
                    <div
                      key={c.codigo}
                      style={{
                        backgroundColor: 'var(--bg-main)',
                        border: getCardBorder(c.estado),
                        borderRadius: 'var(--radius-md)',
                        padding: '0.75rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.4rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary-light)' }}>
                            {c.codigo}
                          </span>
                          <div style={{ fontWeight: 700, fontSize: '0.85rem', lineHeight: 1.3 }}>
                            {c.nombre}
                          </div>
                        </div>

                        {getStatusBadge(c)}
                      </div>

                      <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        <span><strong>{c.creditos}</strong> créditos</span>
                        <span>{c.horas_teoria}h T / {c.horas_practica}h P</span>
                      </div>

                      {/* Prerequisites Section */}
                      <div
                        style={{
                          marginTop: '0.25rem',
                          paddingTop: '0.4rem',
                          borderTop: '1px dashed var(--border-color)',
                          fontSize: '0.72rem',
                        }}
                      >
                        {c.prerrequisitos.length === 0 ? (
                          <span style={{ color: 'var(--text-dim)' }}>• Sin prerrequisitos requeridos</span>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ color: 'var(--text-dim)', fontWeight: 600 }}>Prerrequisitos:</span>
                            {c.prerrequisitos.map((pr) => {
                              const isMissing = c.prerrequisitos_faltantes.some((f) => f.codigo === pr.codigo);
                              return (
                                <div
                                  key={pr.codigo}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    color: isMissing ? 'var(--danger)' : 'var(--success)',
                                  }}
                                >
                                  {isMissing ? <Lock size={10} /> : <CheckCircle2 size={10} />}
                                  <span>
                                    {pr.codigo} — {pr.nombre}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}