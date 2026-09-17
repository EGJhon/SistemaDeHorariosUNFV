import React from 'react';
import { MapPin, User, Clock } from 'lucide-react';

const DAYS = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];

const UNFV_SLOTS = [
  { id: '08:00', label: '08:00 - 08:50 (1ª h.a.)' },
  { id: '08:50', label: '08:50 - 09:40 (2ª h.a.)' },
  { id: '09:40', label: '09:40 - 10:30 (3ª h.a.)' },
  { id: '10:30', label: '10:30 - 11:20 (4ª h.a.)' },
  { id: '11:20', label: '11:20 - 12:10 (5ª h.a.)' },
  { id: '12:10', label: '12:10 - 13:00 (6ª h.a.)' },
  { id: '14:00', label: '14:00 - 14:50 (7ª h.a.)' },
  { id: '14:50', label: '14:50 - 15:40 (8ª h.a.)' },
  { id: '15:40', label: '15:40 - 16:30 (9ª h.a.)' },
  { id: '16:30', label: '16:30 - 17:20 (10ª h.a.)' },
  { id: '18:00', label: '18:00 - 18:50 (11ª h.a.)' },
  { id: '18:50', label: '18:50 - 19:40 (12ª h.a.)' },
  { id: '19:40', label: '19:40 - 20:30 (13ª h.a.)' },
  { id: '20:30', label: '20:30 - 21:20 (14ª h.a.)' },
];

const COURSE_COLORS = {
  'SI-201': { bg: 'linear-gradient(135deg, #0284c7, #0369a1)', border: '#38bdf8' },
  'MAT-202': { bg: 'linear-gradient(135deg, #7c3aed, #5b21b6)', border: '#c084fc' },
  'SI-401': { bg: 'linear-gradient(135deg, #059669, #047857)', border: '#34d399' },
  'SI-402': { bg: 'linear-gradient(135deg, #d97706, #b45309)', border: '#fbbf24' },
  'SI-601': { bg: 'linear-gradient(135deg, #db2777, #be185d)', border: '#f472b6' },
  'SI-602': { bg: 'linear-gradient(135deg, #2563eb, #1d4ed8)', border: '#60a5fa' },
  'SI-801': { bg: 'linear-gradient(135deg, #0891b2, #0e7490)', border: '#22d3ee' },
  'SI-802': { bg: 'linear-gradient(135deg, #4f46e5, #4338ca)', border: '#818cf8' },
  'SI-1001': { bg: 'linear-gradient(135deg, #ca8a04, #a16207)', border: '#fde047' },
  'SI-1002': { bg: 'linear-gradient(135deg, #e11d48, #be123c)', border: '#fb7185' },
};

function getCourseColor(code) {
  return COURSE_COLORS[code] || { bg: 'linear-gradient(135deg, #475569, #334155)', border: '#94a3b8' };
}

function formatShortTime(tStr) {
  if (!tStr) return '';
  return tStr.substring(0, 5);
}

function getSlotDuration(horaIni, horaFin) {
  if (!horaIni || !horaFin) return 2;
  const iniMin = parseInt(horaIni.split(':')[0], 10) * 60 + parseInt(horaIni.split(':')[1], 10);
  const finMin = parseInt(horaFin.split(':')[0], 10) * 60 + parseInt(horaFin.split(':')[1], 10);
  const totalMin = finMin - iniMin;
  return Math.max(1, Math.round(totalMin / 50));
}

export default function TimetableGrid({ blocks = [] }) {
  const blockGrid = {};

  blocks.forEach((b) => {
    const day = (b.dia_semana || '').toUpperCase();
    const startTimeKey = formatShortTime(b.hora_inicio);
    const duration = getSlotDuration(b.hora_inicio, b.hora_fin);

    const key = `${day}_${startTimeKey}`;
    blockGrid[key] = { ...b, duration };
  });

  return (
    <div className="timetable-container">
      <div className="timetable-grid" style={{ gridTemplateColumns: '150px repeat(6, 1fr)' }}>
        <div className="timetable-header">Hora Académica (50m)</div>
        {DAYS.map((day) => (
          <div key={day} className="timetable-header">
            {day}
          </div>
        ))}

        {UNFV_SLOTS.map((slot) => (
          <React.Fragment key={slot.id}>
            <div className="timetable-time-cell" style={{ fontSize: '0.73rem', textAlign: 'left', paddingLeft: '0.5rem' }}>
              {slot.label}
            </div>

            {DAYS.map((day) => {
              const cellKey = `${day}_${slot.id}`;
              const block = blockGrid[cellKey];

              return (
                <div key={cellKey} className="timetable-slot">
                  {block && (
                    <div
                      className="timetable-card"
                      style={{
                        background: getCourseColor(block.codigo_asignatura).bg,
                        borderLeftColor: getCourseColor(block.codigo_asignatura).border,
                        height: `calc(${block.duration * 48}px - 4px)`,
                      }}
                    >
                      <div>
                        <div className="timetable-card-title">
                          {block.codigo_asignatura} - Sec {block.seccion || 'A'}
                        </div>
                        <div style={{ fontSize: '0.72rem', opacity: 0.95, fontWeight: 600 }}>
                          {block.nombre_asignatura}
                        </div>
                      </div>

                      <div>
                        <div className="timetable-card-info">
                          <MapPin size={12} />
                          <span>{block.aula || 'Sin aula'}</span>
                        </div>
                        <div className="timetable-card-info">
                          <User size={12} />
                          <span>{block.docente || 'Sin docente'}</span>
                        </div>
                        <div className="timetable-card-info" style={{ fontSize: '0.68rem', opacity: 0.85 }}>
                          <Clock size={11} />
                          <span>{block.hora_inicio} - {block.hora_fin}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
