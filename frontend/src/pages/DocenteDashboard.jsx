import React, { useState, useEffect } from 'react';
import { UserCheck, Calendar, AlertCircle, BookOpen, Clock, CheckCircle } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import TimetableGrid from '../components/timetable/TimetableGrid';
import AlertBanner from '../components/common/AlertBanner';

export default function DocenteDashboard() {
  const { currentUser } = useAuth();
  const [periodos, setPeriodos] = useState([]);
  const [selectedPeriodo, setSelectedPeriodo] = useState('');
  const [horarioGeneral, setHorarioGeneral] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    loadPeriodos();
  }, []);

  useEffect(() => {
    if (selectedPeriodo) {
      loadSchedule();
    }
  }, [selectedPeriodo]);

  const loadPeriodos = async () => {
    try {
      const pRes = await api.getPeriodos();
      setPeriodos(pRes);
      if (pRes.length > 0) setSelectedPeriodo(String(pRes[0].id));
    } catch (err) {
      console.error('Error cargando periodos:', err);
    }
  };

  const loadSchedule = async () => {
    setLoading(true);
    try {
      const data = await api.getHorarioGeneral(selectedPeriodo, '');
      setHorarioGeneral(data);
    } catch (err) {
      console.error('Error cargando horario general:', err);
    } finally {
      setLoading(false);
    }
  };

  const docenteId = currentUser?.docente_id;
  const docenteNombre = currentUser?.nombres || currentUser?.nombre || 'Docente';

  // My assigned blocks and unassigned blocks
  const myAssignedBlocks = [];
  const unassignedBlocks = [];

  horarioGeneral.forEach((item) => {
    item.bloques.forEach((b) => {
      const blockItem = {
        ...b,
        codigo_asignatura: item.codigo_asignatura,
        nombre_asignatura: item.nombre_asignatura,
        seccion: item.seccion,
        turno: item.turno,
        ciclo: item.ciclo,
        grupo_id: item.grupo_id,
      };

      const isMyBlock =
        (docenteId && (b.id_docente === docenteId || String(b.id_docente) === String(docenteId))) ||
        (b.docente && docenteNombre && b.docente.toLowerCase().trim() === docenteNombre.toLowerCase().trim());

      if (isMyBlock) {
        myAssignedBlocks.push(blockItem);
      } else if (!b.id_docente && !b.docente) {
        unassignedBlocks.push(blockItem);
      }
    });
  });

  const handleClaimBlock = async (bloqueId) => {
    setAlert(null);
    if (!docenteId) {
      setAlert({ type: 'danger', message: 'No se encontró el ID de docente asociado a esta cuenta de usuario.' });
      return;
    }

    try {
      await api.asignarDocenteBloque(bloqueId, docenteId);
      setAlert({ type: 'success', message: '¡Bloque asignado a tu carga horaria exitosamente!' });
      loadSchedule();
    } catch (err) {
      setAlert({ type: 'danger', message: err.message });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>
            Portal de Carga Lectiva del Docente
          </h2>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Bienvenido(a), <strong>{docenteNombre}</strong>. Consulta tu horario asignado y toma bloques de horario disponibles (**Regla 7**).
          </p>
        </div>

        <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
          <label className="form-label">Periodo Académico:</label>
          <select
            className="select-input"
            value={selectedPeriodo}
            onChange={(e) => setSelectedPeriodo(e.target.value)}
          >
            {periodos.map((p) => (
              <option key={p.id} value={String(p.id)}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {alert && (
        <AlertBanner
          type={alert.type}
          title={alert.type === 'danger' ? 'Error al Asignar Bloque:' : 'Operación Exitosa:'}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      {/* Summary Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--success)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Mi Carga Horaria Asignada
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--success)', marginTop: '0.2rem' }}>
            {myAssignedBlocks.length} Bloques de Clase
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--warning)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Bloques Disponibles (Sin Docente)
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--warning)', marginTop: '0.2rem' }}>
            {unassignedBlocks.length} Bloques
          </div>
        </div>
      </div>

      {/* Teacher Assigned Timetable */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Calendar className="text-primary" size={22} />
            <span>Mi Horario Semanal de Clases ({myAssignedBlocks.length} Bloques Asignados)</span>
          </div>
        </div>

        {myAssignedBlocks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
            Aún no tienes bloques de clase asignados en el periodo {selectedPeriodo}. Puedes elegir bloques libres de la lista inferior (Regla 7).
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Table summary of teacher blocks */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.6rem 0.75rem' }}>Ciclo</th>
                    <th style={{ padding: '0.6rem 0.75rem' }}>Código / Asignatura</th>
                    <th style={{ padding: '0.6rem 0.75rem' }}>Sección / Turno</th>
                    <th style={{ padding: '0.6rem 0.75rem' }}>Día y Rango Horario</th>
                    <th style={{ padding: '0.6rem 0.75rem' }}>Aula</th>
                  </tr>
                </thead>
                <tbody>
                  {myAssignedBlocks.map((b) => (
                    <tr key={b.id_bloque} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.6rem 0.75rem', fontWeight: 700, color: 'var(--primary-light)' }}>
                        Ciclo {b.ciclo}
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem' }}>
                        <div style={{ fontWeight: 700 }}>{b.codigo_asignatura}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{b.nombre_asignatura}</div>
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem' }}>
                        <span className="badge badge-info">Sec {b.seccion}</span> ({b.turno})
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>
                        {b.dia_semana}: {b.hora_inicio} - {b.hora_fin}
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem', fontWeight: 700, color: 'var(--success)' }}>
                        Aula {b.aula}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Visual Timetable Grid */}
            <TimetableGrid blocks={myAssignedBlocks} />
          </div>
        )}
      </div>

      {/* Available Unassigned Blocks (Claiming Rule 7) */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <UserCheck className="text-warning" size={22} />
            <span>Regla 7: Bloques de Horario Libres Pendientes de Elección</span>
          </div>
          <span className="badge badge-warning">{unassignedBlocks.length} Disponibles</span>
        </div>

        {unassignedBlocks.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No hay bloques libres pendientes de docente en este periodo.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {unassignedBlocks.map((b) => (
              <div
                key={b.id_bloque}
                style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="badge badge-info">Ciclo {b.ciclo} - Sec {b.seccion}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Aula {b.aula}</span>
                </div>

                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                  {b.codigo_asignatura} - {b.nombre_asignatura}
                </div>

                <div style={{ fontSize: '0.85rem', color: 'var(--primary-light)', fontWeight: 600 }}>
                  {b.dia_semana}: {b.hora_inicio} - {b.hora_fin}
                </div>

                <button
                  className="btn btn-primary"
                  style={{ marginTop: '0.5rem', width: '100%', justifyContent: 'center' }}
                  onClick={() => handleClaimBlock(b.id_bloque)}
                >
                  <UserCheck size={16} />
                  <span>Tomar este Bloque (Regla 7)</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
