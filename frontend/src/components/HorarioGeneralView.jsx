import React, { useState, useEffect } from 'react';
import { BookOpen, PlusCircle, UserCheck, Calendar, Table, LayoutGrid } from 'lucide-react';
import { api } from '../api';
import TimetableGrid from './timetable/TimetableGrid';
import UnfvOfficialScheduleTable from './timetable/UnfvOfficialScheduleTable';
import CrearBloqueModal from './modals/CrearBloqueModal';
import AsignarDocenteModal from './modals/AsignarDocenteModal';

const ODD_CYCLES = ['TODOS', 'I', 'III', 'V', 'VII', 'IX'];
const EVEN_CYCLES = ['TODOS', 'II', 'IV', 'VI', 'VIII', 'X'];
const SECTIONS = ['TODAS', 'A', 'B', 'C'];

export default function HorarioGeneralView() {
  const [periodos, setPeriodos] = useState([]);
  const [selectedPeriodo, setSelectedPeriodo] = useState('');
  const [selectedCiclo, setSelectedCiclo] = useState('TODOS');
  const [selectedSeccion, setSelectedSeccion] = useState('TODAS');
  const [viewFormat, setViewFormat] = useState('table'); // 'table' (Official UNFV Table) | 'grid' (Timetable Matrices)

  const [horarioGeneral, setHorarioGeneral] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [aulas, setAulas] = useState([]);
  const [docentes, setDocentes] = useState([]);

  const [showCrearBloque, setShowCrearBloque] = useState(false);
  const [selectedBloqueToAssign, setSelectedBloqueToAssign] = useState(null);
  const [loading, setLoading] = useState(false);

  const selectedPeriodObj = periodos.find((p) => String(p.id) === String(selectedPeriodo));
  const isOddPeriod = selectedPeriodObj?.nombre?.includes('-1') || selectedPeriodObj?.nombre?.endsWith('1');
  const cyclesList = isOddPeriod ? ODD_CYCLES : EVEN_CYCLES;

  useEffect(() => {
    loadMetadata();
  }, []);

  useEffect(() => {
    if (selectedPeriodo) {
      loadHorarioGeneral();
    }
  }, [selectedPeriodo, selectedCiclo]);

  const loadMetadata = async () => {
    try {
      const [pRes, gRes, aRes, dRes] = await Promise.all([
        api.getPeriodos(),
        api.getGrupos(),
        api.getAulas(),
        api.getDocentes(),
      ]);
      setPeriodos(pRes);
      if (pRes.length > 0) setSelectedPeriodo(String(pRes[0].id));
      setGrupos(gRes);
      setAulas(aRes);
      setDocentes(dRes);
    } catch (err) {
      console.error('Error cargando metadata:', err);
    }
  };

  const loadHorarioGeneral = async () => {
    setLoading(true);
    try {
      const cicloFilter = selectedCiclo === 'TODOS' ? '' : selectedCiclo;
      const data = await api.getHorarioGeneral(selectedPeriodo, cicloFilter);
      setHorarioGeneral(data);
    } catch (err) {
      console.error('Error cargando horario general:', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper to extract blocks for a specific section
  const getBlocksForSection = (secLetter) => {
    const blocks = [];
    horarioGeneral.forEach((item) => {
      if (secLetter === 'TODAS' || item.seccion === secLetter) {
        item.bloques.forEach((b) => {
          blocks.push({
            ...b,
            codigo_asignatura: item.codigo_asignatura,
            nombre_asignatura: item.nombre_asignatura,
            seccion: item.seccion,
            turno: item.turno,
          });
        });
      }
    });
    return blocks;
  };

  // Filter items by selected section
  const filteredHorarioGeneral = horarioGeneral.filter(
    (item) => selectedSeccion === 'TODAS' || item.seccion === selectedSeccion
  );

  const sectionsToRender = selectedSeccion === 'TODAS' ? ['A', 'B', 'C'] : [selectedSeccion];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Controls & Actions Card */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <BookOpen className="text-primary" size={22} />
            <span>Regla 8: Oferta Institucional del Horario General UNFV</span>
          </div>

          <button className="btn btn-primary" onClick={() => setShowCrearBloque(true)}>
            <PlusCircle size={18} />
            <span>Añadir Bloque General (Regla 6)</span>
          </button>
        </div>

        {/* Filter & View Mode Controls */}
        <div className="filter-bar">
          <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
            <label className="form-label">Periodo:</label>
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

          <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
            <label className="form-label">Ciclo:</label>
            <div className="cycle-tabs">
              {cyclesList.map((c) => (
                <button
                  key={c}
                  className={`cycle-btn ${selectedCiclo === c ? 'active' : ''}`}
                  onClick={() => setSelectedCiclo(c)}
                >
                  {c === 'TODOS' ? 'TODOS' : `Ciclo ${c}`}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
            <label className="form-label">Sección:</label>
            <div className="cycle-tabs">
              {SECTIONS.map((s) => (
                <button
                  key={s}
                  className={`cycle-btn ${selectedSeccion === s ? 'active' : ''}`}
                  onClick={() => setSelectedSeccion(s)}
                >
                  {s === 'TODAS' ? 'TODAS (A, B, C)' : `Sección ${s}`}
                </button>
              ))}
            </div>
          </div>

          {/* Format Toggle Switch */}
          <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
            <label className="form-label">Formato Vista:</label>
            <div className="cycle-tabs">
              <button
                className={`cycle-btn ${viewFormat === 'table' ? 'active' : ''}`}
                onClick={() => setViewFormat('table')}
                title="Tabla Oficial UNFV (EPIS)"
              >
                <Table size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                Tabla Oficial UNFV
              </button>
              <button
                className={`cycle-btn ${viewFormat === 'grid' ? 'active' : ''}`}
                onClick={() => setViewFormat('grid')}
                title="Matrices por Sección"
              >
                <LayoutGrid size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                Rejillas Semanales
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area based on viewFormat */}
      {viewFormat === 'table' ? (
        <UnfvOfficialScheduleTable
          horarioGeneral={filteredHorarioGeneral}
          onAssignDocente={setSelectedBloqueToAssign}
        />
      ) : (
        sectionsToRender.map((secLetter) => {
          const secBlocks = getBlocksForSection(secLetter);
          const turnoNombre = secLetter === 'A' ? 'Turno Mañana' : secLetter === 'B' ? 'Turno Tarde' : 'Turno Noche';

          return (
            <div key={secLetter} className="card">
              <div className="card-header">
                <div className="card-title">
                  <Calendar className="text-primary" size={22} />
                  <span>
                    Matriz de Horario — Ciclo {selectedCiclo} | <span style={{ color: 'var(--primary-light)' }}>Sección {secLetter}</span> ({turnoNombre})
                  </span>
                </div>
                <span className="badge badge-info">Matriz {secLetter} — {secBlocks.length} Bloques</span>
              </div>

              <TimetableGrid blocks={secBlocks} />
            </div>
          );
        })
      )}

      {/* Modals */}
      {showCrearBloque && (
        <CrearBloqueModal
          grupos={grupos}
          aulas={aulas}
          onClose={() => setShowCrearBloque(false)}
          onSuccess={loadHorarioGeneral}
        />
      )}

      {selectedBloqueToAssign && (
        <AsignarDocenteModal
          bloque={selectedBloqueToAssign}
          docentes={docentes}
          onClose={() => setSelectedBloqueToAssign(null)}
          onSuccess={loadHorarioGeneral}
        />
      )}
    </div>
  );
}
