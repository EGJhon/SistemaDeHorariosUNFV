import React from 'react';
import { UserCheck, PlusCircle } from 'lucide-react';

const DAYS = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];

export default function UnfvOfficialScheduleTable({ horarioGeneral = [], onAssignDocente }) {
  // Group and sort items by Cycle (I-X) and Section (A, B, C)
  const cycleOrder = { 'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6, 'VII': 7, 'VIII': 8, 'IX': 9, 'X': 10 };
  const sectionOrder = { 'A': 1, 'B': 2, 'C': 3 };

  const sortedItems = [...horarioGeneral].sort((a, b) => {
    const cA = cycleOrder[a.ciclo] || 99;
    const cB = cycleOrder[b.ciclo] || 99;
    if (cA !== cB) return cA - cB;
    const sA = sectionOrder[a.seccion] || 99;
    const sB = sectionOrder[b.seccion] || 99;
    if (sA !== sB) return sA - sB;
    return a.codigo_asignatura.localeCompare(b.codigo_asignatura);
  });

  const getSectionStyle = (seccion) => {
    switch (seccion) {
      case 'A':
        return { backgroundColor: 'rgba(59, 130, 246, 0.12)', borderColor: 'rgba(59, 130, 246, 0.3)' };
      case 'B':
        return { backgroundColor: 'rgba(236, 72, 153, 0.12)', borderColor: 'rgba(236, 72, 153, 0.3)' };
      case 'C':
        return { backgroundColor: 'rgba(34, 197, 94, 0.12)', borderColor: 'rgba(34, 197, 94, 0.3)' };
      default:
        return { backgroundColor: 'transparent', borderColor: 'var(--border-color)' };
    }
  };

  const getTurnoCode = (turno, seccion) => {
    if (turno === 'Mañana' || seccion === 'A') return 'M';
    if (turno === 'Tarde' || seccion === 'B') return 'T';
    return 'N';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* UNFV Institutional Document Header */}
      <div
        style={{
          textAlign: 'center',
          padding: '1.25rem',
          backgroundColor: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
        }}
      >
        <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Universidad Nacional Federico Villarreal
        </h2>
        <h3 style={{ margin: '0.2rem 0 0 0', fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary-light)', textTransform: 'uppercase' }}>
          Facultad de Ingeniería Industrial y de Sistemas — EPIS
        </h3>
        <div style={{ margin: '0.35rem 0 0 0', fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-muted)' }}>
          HORARIO ACADÉMICO OFICIAL — PERIODO 2026-2
        </div>
      </div>

      {/* Official UNFV Schedule Table */}
      <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.78rem',
            textAlign: 'center',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <thead>
            <tr
              style={{
                backgroundColor: 'var(--bg-card)',
                borderBottom: '2px solid var(--border-color)',
                fontWeight: 700,
                textTransform: 'uppercase',
                color: 'var(--text-main)',
              }}
            >
              <th style={{ padding: '0.6rem 0.4rem', borderRight: '1px solid var(--border-color)', width: '65px' }}>Código</th>
              <th style={{ padding: '0.6rem 0.5rem', borderRight: '1px solid var(--border-color)', textAlign: 'left', minWidth: '180px' }}>Asignatura</th>
              <th style={{ padding: '0.6rem 0.3rem', borderRight: '1px solid var(--border-color)', title: 'Capacidad' }}>C</th>
              <th style={{ padding: '0.6rem 0.3rem', borderRight: '1px solid var(--border-color)', title: 'Turno' }}>T</th>
              <th style={{ padding: '0.6rem 0.3rem', borderRight: '1px solid var(--border-color)', title: 'Sección' }}>S</th>
              <th style={{ padding: '0.6rem 0.3rem', borderRight: '1px solid var(--border-color)', title: 'Créditos' }}>CR</th>
              <th style={{ padding: '0.6rem 0.3rem', borderRight: '1px solid var(--border-color)', title: 'Horas Teoría' }}>HT</th>
              <th style={{ padding: '0.6rem 0.3rem', borderRight: '1px solid var(--border-color)', title: 'Horas Práctica' }}>HP</th>
              <th style={{ padding: '0.6rem 0.3rem', borderRight: '1px solid var(--border-color)', title: 'Total Horas' }}>TH</th>
              <th style={{ padding: '0.6rem 0.3rem', borderRight: '1px solid var(--border-color)' }}>Ciclo</th>
              {DAYS.map((d) => (
                <th key={d} style={{ padding: '0.6rem 0.4rem', borderRight: '1px solid var(--border-color)', minWidth: '95px' }}>
                  {d}
                </th>
              ))}
              <th style={{ padding: '0.6rem 0.5rem', borderRight: '1px solid var(--border-color)', textAlign: 'left', minWidth: '150px' }}>Docente</th>
              <th style={{ padding: '0.6rem 0.4rem', minWidth: '70px' }}>Aulas</th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.length === 0 ? (
              <tr>
                <td colSpan={17} style={{ padding: '2rem', color: 'var(--text-muted)' }}>
                  No hay asignaturas registradas para este filtro.
                </td>
              </tr>
            ) : (
              sortedItems.map((item) => {
                const secStyle = getSectionStyle(item.seccion);
                const turnoCode = getTurnoCode(item.turno, item.seccion);

                // Map blocks by day
                const blocksByDay = {};
                item.bloques.forEach((b) => {
                  const dayKey = b.dia_semana.toUpperCase();
                  if (!blocksByDay[dayKey]) blocksByDay[dayKey] = [];
                  blocksByDay[dayKey].push(b);
                });

                // Extract docentes and aulas list
                const docentesSet = new Set();
                const aulasSet = new Set();
                item.bloques.forEach((b) => {
                  if (b.docente) docentesSet.add(b.docente);
                  if (b.aula) aulasSet.add(b.aula);
                });

                const docentesList = Array.from(docentesSet);
                const aulasList = Array.from(aulasSet).join(', ');

                return (
                  <tr
                    key={`${item.codigo_asignatura}_${item.grupo_id}`}
                    style={{
                      backgroundColor: secStyle.backgroundColor,
                      borderBottom: '1px solid var(--border-color)',
                      transition: 'background-color 0.2s',
                    }}
                  >
                    <td style={{ padding: '0.55rem 0.4rem', borderRight: '1px solid var(--border-color)', fontWeight: 700 }}>
                      {item.codigo_asignatura}
                    </td>

                    <td style={{ padding: '0.55rem 0.5rem', borderRight: '1px solid var(--border-color)', textAlign: 'left', fontWeight: 600 }}>
                      {item.nombre_asignatura}
                    </td>

                    <td style={{ padding: '0.55rem 0.3rem', borderRight: '1px solid var(--border-color)', fontWeight: 700 }}>
                      {item.vacantes}
                    </td>

                    <td style={{ padding: '0.55rem 0.3rem', borderRight: '1px solid var(--border-color)', fontWeight: 800, color: 'var(--primary-light)' }}>
                      {turnoCode}
                    </td>

                    <td style={{ padding: '0.55rem 0.3rem', borderRight: '1px solid var(--border-color)', fontWeight: 800 }}>
                      {item.seccion}
                    </td>

                    <td style={{ padding: '0.55rem 0.3rem', borderRight: '1px solid var(--border-color)' }}>
                      {item.creditos || 4}
                    </td>

                    <td style={{ padding: '0.55rem 0.3rem', borderRight: '1px solid var(--border-color)' }}>
                      {item.horas_teoria || 2}
                    </td>

                    <td style={{ padding: '0.55rem 0.3rem', borderRight: '1px solid var(--border-color)' }}>
                      {item.horas_practica || 2}
                    </td>

                    <td style={{ padding: '0.55rem 0.3rem', borderRight: '1px solid var(--border-color)', fontWeight: 700 }}>
                      {item.total_horas || 4}
                    </td>

                    <td style={{ padding: '0.55rem 0.3rem', borderRight: '1px solid var(--border-color)', fontWeight: 700 }}>
                      {item.ciclo}
                    </td>

                    {/* Day Schedule Columns */}
                    {DAYS.map((d) => {
                      const dayBlocks = blocksByDay[d] || [];
                      return (
                        <td
                          key={d}
                          style={{
                            padding: '0.4rem 0.3rem',
                            borderRight: '1px solid var(--border-color)',
                            fontSize: '0.73rem',
                          }}
                        >
                          {dayBlocks.map((b) => (
                            <div key={b.id_bloque} style={{ fontWeight: 600, margin: '2px 0' }}>
                              {b.hora_inicio} - {b.hora_fin}
                            </div>
                          ))}
                        </td>
                      );
                    })}

                    {/* Docente Column */}
                    <td style={{ padding: '0.55rem 0.5rem', borderRight: '1px solid var(--border-color)', textAlign: 'left' }}>
                      {docentesList.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontWeight: 600 }}>
                          {docentesList.map((doc, idx) => (
                            <span key={idx} style={{ color: 'var(--success)' }}>
                              • {doc}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {item.bloques.map((b) => (
                            <button
                              key={b.id_bloque}
                              className="btn btn-secondary"
                              style={{ padding: '0.15rem 0.4rem', fontSize: '0.7rem', width: '100%', justifyContent: 'center' }}
                              onClick={() => onAssignDocente({ ...b, ...item })}
                            >
                              Asignar Docente
                            </button>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Aulas Column */}
                    <td style={{ padding: '0.55rem 0.4rem', fontWeight: 700, color: 'var(--primary-light)' }}>
                      {aulasList || 'A3-1'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
