import React, { useState, useEffect } from 'react';
import { BookOpen, PlusCircle, UserCheck, Calendar, Table, LayoutGrid } from 'lucide-react';
import { api } from '../api';
import TimetableGrid from './timetable/TimetableGrid';
import UnfvOfficialScheduleTable from './timetable/UnfvOfficialScheduleTable';
import CrearBloqueModal from './modals/CrearBloqueModal';
import AsignarDocenteModal from './modals/AsignarDocenteModal';
import EditarBloqueModal from './modals/EditarBloqueModal';

const ODD_CYCLES = ['TODOS', 'I', 'III', 'V', 'VII', 'IX'];
const EVEN_CYCLES = ['TODOS', 'II', 'IV', 'VI', 'VIII', 'X'];
const ROMAN_ORDER = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
const SECTIONS = ['TODAS', 'A', 'B', 'C'];

export default function HorarioGeneralView() {
  const [periodos, setPeriodos] = useState([]);
  const [mallas, setMallas] = useState([]);
  const [asignaturasMalla, setAsignaturasMalla] = useState([]);
  const [selectedMalla, setSelectedMalla] = useState('');
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
  const [selectedBloqueToEdit, setSelectedBloqueToEdit] = useState(null);
  const [loading, setLoading] = useState(false);

  const selectedPeriodObj = periodos.find((p) => String(p.id) === String(selectedPeriodo));
  const isOddPeriod = selectedPeriodObj?.nombre?.includes('-1') || selectedPeriodObj?.nombre?.endsWith('1');

  // Periodos con horarios registrados para la malla seleccionada
  const periodosDisponibles = React.useMemo(() => {
    if (!selectedMalla || grupos.length === 0) return periodos;
    const ids = new Set(
      grupos
        .filter((g) => String(g.asignatura_malla) === String(selectedMalla))
        .map((g) => String(g.id_periodo))
    );
    return periodos.filter((p) => ids.has(String(p.id)));
  }, [periodos, grupos, selectedMalla]);

  // Ciclos disponibles según la malla seleccionada y la paridad del periodo
  const cyclesList = React.useMemo(() => {
    const set = new Set(asignaturasMalla.map((a) => a.ciclo));
    let cycles = ROMAN_ORDER.filter((c) => set.has(c));
    if (isOddPeriod) {
      cycles = cycles.filter((c) => ODD_CYCLES.includes(c));
    } else {
      cycles = cycles.filter((c) => EVEN_CYCLES.includes(c));
    }
    return ['TODOS', ...cycles];
  }, [asignaturasMalla, isOddPeriod]);

  useEffect(() => {
    loadMetadata();
  }, []);

  useEffect(() => {
    if (selectedMalla) {
      loadAsignaturasMalla(selectedMalla);
    }
  }, [selectedMalla]);

  useEffect(() => {
    if (!cyclesList.includes(selectedCiclo)) {
      setSelectedCiclo('TODOS');
    }
  }, [cyclesList]);

  useEffect(() => {
    if (
      periodosDisponibles.length > 0 &&
      !periodosDisponibles.some((p) => String(p.id) === String(selectedPeriodo))
    ) {
      setSelectedPeriodo(String(periodosDisponibles[0].id));
    }
  }, [periodosDisponibles]);

  useEffect(() => {
    if (selectedPeriodo && selectedMalla) {
      loadHorarioGeneral();
    }
  }, [selectedPeriodo, selectedCiclo, selectedMalla]);

  const loadMetadata = async () => {
    try {
      const [mRes, pRes, gRes, aRes, dRes] = await Promise.all([
        api.getMallas(),
        api.getPeriodos(),
        api.getGrupos(),
        api.getAulas(),
        api.getDocentes(),
      ]);
      setMallas(Array.isArray(mRes) ? mRes : []);
      if (Array.isArray(mRes) && mRes.length > 0) setSelectedMalla(String(mRes[0]));
      setPeriodos(pRes);
      if (pRes.length > 0) setSelectedPeriodo(String(pRes[0].id));
      setGrupos(gRes);
      setAulas(aRes);
      setDocentes(dRes);
    } catch (err) {
      console.error('Error cargando metadata:', err);
    }
  };

  const loadAsignaturasMalla = async (malla) => {
    try {
      const data = await api.getAsignaturas(malla);
      setAsignaturasMalla(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error cargando asignaturas de la malla:', err);
      setAsignaturasMalla([]);
    }
  };

  const loadHorarioGeneral = async () => {
    setLoading(true);
    try {
      const cicloFilter = selectedCiclo === 'TODOS' ? '' : selectedCiclo;
      const data = await api.getHorarioGeneral(selectedPeriodo, cicloFilter, selectedMalla);
      setHorarioGeneral(data);
    } catch (err) {
      console.error('Error cargando horario general:', err);
      setHorarioGeneral([]);
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

  // Grupos disponibles según la malla y el periodo seleccionados
  const gruposFiltrados = grupos.filter((g) => {
    const coincideMalla = !selectedMalla || String(g.asignatura_malla) === String(selectedMalla);
    const coincidePeriodo = !selectedPeriodo || String(g.id_periodo) === String(selectedPeriodo);
    return coincideMalla && coincidePeriodo;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Controls & Actions Card */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <BookOpen className="text-primary" size={22} />
            <span>
              {' '}Oferta Institucional del Horario General UNFV
              {selectedMalla ? ` — Malla ${selectedMalla}` : ''}
              {selectedPeriodObj ? ` (${selectedPeriodObj.nombre})` : ''}
            </span>
          </div>

          <button className="btn btn-primary" onClick={() => setShowCrearBloque(true)}>
            <PlusCircle size={18} />
            <span>Añadir Bloque General </span>
          </button>
        </div>

        {/* Filter & View Mode Controls */}
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
          Selección: Plan de Estudios → Periodo → Ciclo → Horarios
        </div>
        <div className="filter-bar">
          <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
            <label className="form-label">Plan de Estudios (Malla):</label>
            <select
              className="select-input"
              value={selectedMalla}
              onChange={(e) => {
                setSelectedMalla(e.target.value);
                setSelectedCiclo('TODOS');
              }}
            >
              {mallas.length === 0 && <option value="">Sin mallas registradas</option>}
              {mallas.map((m) => (
                <option key={m} value={String(m)}>
                  Malla {m}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
            <label className="form-label">Periodo:</label>
            <select
              className="select-input"
              value={selectedPeriodo}
              onChange={(e) => setSelectedPeriodo(e.target.value)}
            >
              {periodosDisponibles.length === 0 && <option value="">Sin periodos con horarios</option>}
              {periodosDisponibles.map((p) => (
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
      {loading ? (
        <div className="card" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Cargando horarios de la malla {selectedMalla}...
        </div>
      ) : !selectedMalla ? (
        <div className="card" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          No hay mallas curriculares registradas. Registra asignaturas con su malla para visualizar los horarios.
        </div>
      ) : filteredHorarioGeneral.length === 0 ? (
        <div className="card" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          No se encontraron horarios para la <strong>Malla {selectedMalla}</strong> en el periodo{' '}
          {selectedPeriodObj?.nombre || 'seleccionado'}
          {selectedCiclo !== 'TODOS' ? ` y ciclo ${selectedCiclo}` : ''}.
        </div>
      ) : viewFormat === 'table' ? (
        <UnfvOfficialScheduleTable
          horarioGeneral={filteredHorarioGeneral}
          onAssignDocente={setSelectedBloqueToAssign}
          onEditBloque={setSelectedBloqueToEdit}
          periodoNombre={selectedPeriodObj?.nombre}
          mallaNombre={selectedMalla}
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

              <TimetableGrid
                blocks={secBlocks}
                onBlockClick={setSelectedBloqueToEdit}
              />
            </div>
          );
        })
      )}

      {/* Modals */}
      {showCrearBloque && (
        <CrearBloqueModal
          grupos={gruposFiltrados}
          aulas={aulas}
          malla={selectedMalla}
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

      {selectedBloqueToEdit && (
        <EditarBloqueModal
          bloque={selectedBloqueToEdit}
          aulas={aulas}
          docentes={docentes}
          onClose={() => setSelectedBloqueToEdit(null)}
          onSuccess={loadHorarioGeneral}
        />
      )}
    </div>
  );
}
