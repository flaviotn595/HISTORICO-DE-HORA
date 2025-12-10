import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Employee } from './types';
import { STATUS_LIST, MONTHS, WEEK_DAYS } from './constants';
import * as api from './services/api';
import EmployeeModal from './components/EmployeeModal';
import StatsModal, { StatItem } from './components/StatsModal';
import ScheduleCell from './components/ScheduleCell';

function App() {
  // State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [schedules, setSchedules] = useState<Record<string, string>>({}); // Key: "empId-YYYY-MM-DD"
  const [currentDate, setCurrentDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [activeStatType, setActiveStatType] = useState<'TOTAL' | 'PRESENT' | 'ABSENT' | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Refs
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Derived State helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Constants for Table Layout
  // COMPACT LAYOUT ADJUSTMENTS
  const SHIFT_COL_WIDTH = 'w-[35px] min-w-[35px] md:w-[50px] md:min-w-[50px]';
  const NAME_COL_WIDTH = 'w-[100px] min-w-[100px] md:w-[220px] md:min-w-[220px]'; // Reduced mobile width significantly
  const STICKY_NAME_LEFT = 'left-[35px] md:left-[50px]'; // Matches SHIFT_COL_WIDTH

  // Load Data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [emps, scheds] = await Promise.all([
        api.fetchEmployees(),
        api.fetchSchedules(year, month)
      ]);

      setEmployees(emps);

      // Transform schedule array to object map for O(1) lookup
      const scheduleMap: Record<string, string> = {};
      scheds.forEach(s => {
        scheduleMap[`${s.employee_id}-${s.date}`] = s.status;
      });
      setSchedules(scheduleMap);

    } catch (error) {
      console.error("Failed to load data", error);
    } finally {
      setIsLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-scroll to current day logic
  useEffect(() => {
    if (isLoading) return;

    // Small timeout to ensure DOM is fully rendered after loading data
    const timer = setTimeout(() => {
      const today = new Date();
      // Only scroll if we are viewing the current month and year
      if (today.getMonth() === month && today.getFullYear() === year) {
        const dayId = `day-header-${today.getDate()}`;
        const element = document.getElementById(dayId);
        
        if (element && tableContainerRef.current) {
          // Scroll the element into view, centered horizontally
          element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      } else if (tableContainerRef.current) {
        // If viewing another month, reset scroll to start
        tableContainerRef.current.scrollLeft = 0;
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [isLoading, month, year]);

  // Actions
  const handleAddEmployee = async (name: string, shift: string, sector: string) => {
    setIsSaving(true);
    const newEmp = await api.createEmployee({ 
      name: name.toUpperCase(), 
      shift, 
      sector: sector.toUpperCase()
    });
    if (newEmp) {
      setEmployees(prev => [...prev, newEmp]);
      setIsModalOpen(false);
    }
    setIsSaving(false);
  };

  const handleDeleteEmployee = async (id: number) => {
    if (window.confirm('Tem certeza que deseja excluir este funcionário permanentemente?')) {
      const success = await api.deleteEmployee(id);
      if (success) {
        setEmployees(prev => prev.filter(e => e.id !== id));
      }
    }
  };

  const handleMonthChange = (delta: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setCurrentDate(newDate);
  };

  const handleStatusCycle = async (empId: number, day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const key = `${empId}-${dateStr}`;
    
    // Determine next status
    const currentStatus = schedules[key] || '';
    
    const currentIndex = STATUS_LIST.findIndex(s => s.code === currentStatus);
    const nextIndex = (currentIndex + 1) % STATUS_LIST.length;
    const nextStatus = STATUS_LIST[nextIndex].code;

    // Optimistic Update
    setSchedules(prev => ({ ...prev, [key]: nextStatus }));

    // API Call
    await api.upsertSchedule({
      employee_id: empId,
      date: dateStr,
      status: nextStatus
    });
  };

  const handleStatusReset = async (empId: number, day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const key = `${empId}-${dateStr}`;

    // Don't do anything if already empty
    if (!schedules[key]) return;

    // Optimistic Update (Set to empty string)
    setSchedules(prev => ({ ...prev, [key]: '' }));

    // API Call
    await api.upsertSchedule({
      employee_id: empId,
      date: dateStr,
      status: ''
    });
  };

  // Helper for rendering
  const getDayInfo = useCallback((d: number) => {
    const date = new Date(year, month, d);
    const dayOfWeekIdx = date.getDay();
    const isWeekend = dayOfWeekIdx === 0 || dayOfWeekIdx === 6;
    const isSunday = dayOfWeekIdx === 0;
    return { label: WEEK_DAYS[dayOfWeekIdx], isWeekend, isSunday };
  }, [year, month]);

  // Statistics Calculation
  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    let presentToday = 0;
    let absencesMonth = 0;

    employees.forEach(emp => {
      const todayKey = `${emp.id}-${todayStr}`;
      if (schedules[todayKey] === 'P') presentToday++;

      for (let d = 1; d <= daysInMonth; d++) {
        const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const key = `${emp.id}-${dStr}`;
        if (schedules[key] === 'X') absencesMonth++;
      }
    });

    return { total: employees.length, presentToday, absencesMonth };
  }, [employees, schedules, daysInMonth, year, month]);

  // Generate Data for Stats Modal
  const getModalStatsData = (): { title: string; icon: string; data: StatItem[] } => {
    const todayStr = new Date().toISOString().split('T')[0];
    let title = '';
    let icon = '';
    let data: StatItem[] = [];

    switch (activeStatType) {
      case 'TOTAL':
        title = 'Todos os Funcionários';
        icon = '👥';
        data = employees.map(emp => ({
          id: emp.id,
          name: emp.name,
          detail: `${emp.sector} - ${emp.shift}`,
          highlight: false
        }));
        break;
      case 'PRESENT':
        title = `Presentes Hoje (${new Date().toLocaleDateString('pt-BR')})`;
        icon = '✅';
        data = employees
          .filter(emp => schedules[`${emp.id}-${todayStr}`] === 'P')
          .map(emp => ({
            id: emp.id,
            name: emp.name,
            detail: 'Presente',
            highlight: false
          }));
        break;
      case 'ABSENT':
        title = `Faltas em ${MONTHS[month]}`;
        icon = '❌';
        data = employees
          .map(emp => {
            let count = 0;
            for (let d = 1; d <= daysInMonth; d++) {
              const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
              if (schedules[`${emp.id}-${dStr}`] === 'X') count++;
            }
            return { emp, count };
          })
          .filter(item => item.count > 0)
          .sort((a, b) => b.count - a.count)
          .map(item => ({
            id: item.emp.id,
            name: item.emp.name,
            detail: `${item.count} Falta(s)`,
            highlight: true
          }));
        break;
    }
    return { title, icon, data };
  };

  const openStatsModal = (type: 'TOTAL' | 'PRESENT' | 'ABSENT') => {
    setActiveStatType(type);
    setIsStatsModalOpen(true);
  };

  const modalData = getModalStatsData();

  // Filtering for Main Table
  const filteredEmployees = useMemo(() => {
    const lowerTerm = searchTerm.toLowerCase();
    return employees.filter(e => 
      e.name.toLowerCase().includes(lowerTerm) ||
      e.sector.toLowerCase().includes(lowerTerm) ||
      e.shift.toLowerCase().includes(lowerTerm)
    );
  }, [employees, searchTerm]);

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans selection:bg-green-500/30 pb-12 md:pb-0">
      
      {/* Background Gradient Mesh */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-900 to-slate-900 -z-10" />

      <div className="w-full p-1 md:p-6 lg:p-8">
        
        {/* Header */}
        <header className="mb-3 md:mb-6 text-center pt-2">
          <h1 className="text-xl md:text-4xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent mb-1 md:mb-2 drop-shadow-sm">
            📋 Sistema de Escala
          </h1>
          <p className="text-slate-400 text-xs md:text-sm hidden md:block">Gerenciamento de Presença e Turnos</p>
        </header>

        {/* Legend - Responsive Horizontal Scroll */}
        <div className="mb-3 md:mb-8 bg-slate-800/40 p-2 md:p-4 rounded-xl border border-slate-700/50">
          <div className="flex overflow-x-auto pb-2 gap-2 md:gap-3 md:justify-center no-scrollbar snap-x">
            {STATUS_LIST.slice(1).map(status => (
              <div key={status.code} className="flex-shrink-0 snap-start flex items-center gap-1.5 md:gap-2 bg-slate-900/50 p-1.5 md:p-2 rounded-lg border border-slate-700/30">
                <div className={`w-6 h-5 md:w-8 md:h-6 rounded flex items-center justify-center text-[10px] font-bold shadow-sm ${status.color} ${status.textColor}`}>
                  {status.code}
                </div>
                <span className="text-[10px] md:text-xs text-slate-300 font-medium whitespace-nowrap">{status.label}</span>
              </div>
            ))}
          </div>
          <div className="md:hidden text-center text-[9px] text-slate-500 mt-1">Deslize para ver mais →</div>
        </div>

        {/* Statistics Cards - Clickable */}
        <div className="grid grid-cols-3 gap-2 md:gap-4 mb-3 md:mb-8">
          <StatCard 
            title="Total" 
            value={stats.total} 
            icon="👥" 
            color="text-blue-400" 
            onClick={() => openStatsModal('TOTAL')}
          />
          <StatCard 
            title="Presentes" 
            value={stats.presentToday} 
            icon="✅" 
            color="text-green-400" 
            onClick={() => openStatsModal('PRESENT')}
          />
          <StatCard 
            title="Faltas (Mês)" 
            value={stats.absencesMonth} 
            icon="❌" 
            color="text-red-400" 
            onClick={() => openStatsModal('ABSENT')}
          />
        </div>

        {/* Controls Bar */}
        <div className="flex flex-col md:flex-row gap-2 md:gap-4 mb-3 md:mb-6 bg-slate-800/50 p-2 md:p-4 rounded-xl border border-slate-700/50 backdrop-blur-sm">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            <input 
              type="text" 
              placeholder="Buscar..." 
              className="w-full bg-slate-700/50 border-none rounded-lg py-2 md:py-2.5 pl-9 md:pl-10 pr-4 text-sm md:text-base text-white focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex items-center justify-between md:justify-center gap-2 md:gap-4 bg-slate-700/30 rounded-lg p-1">
            <button onClick={() => handleMonthChange(-1)} className="p-2 hover:bg-slate-600 rounded-md transition-colors w-10 text-center">◀</button>
            <span className="flex-1 md:flex-none text-center font-bold text-sm md:text-lg text-slate-200 uppercase md:normal-case min-w-[100px]">
              {MONTHS[month]} <span className="text-slate-400">{year}</span>
            </span>
            <button onClick={() => handleMonthChange(1)} className="p-2 hover:bg-slate-600 rounded-md transition-colors w-10 text-center">▶</button>
          </div>

          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-green-600 hover:bg-green-500 text-white font-semibold py-2 px-4 rounded-lg transition-all shadow-lg shadow-green-900/20 flex items-center justify-center gap-2"
          >
            <span>➕</span> <span>Novo</span>
          </button>
        </div>

        {/* Main Table */}
        <div 
          ref={tableContainerRef} 
          className="relative overflow-x-auto rounded-xl border border-slate-700 shadow-2xl bg-slate-800/30 backdrop-blur-sm min-h-[400px]"
        >
          {isLoading && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
            </div>
          )}

          <table className="w-full text-xs md:text-sm border-collapse">
            <thead>
              <tr>
                <th className={`sticky left-0 z-30 bg-slate-800 p-1 md:p-3 text-center font-semibold text-slate-300 border-b border-slate-600 ${SHIFT_COL_WIDTH}`}>T</th>
                <th className={`sticky ${STICKY_NAME_LEFT} z-30 bg-slate-800 p-2 md:p-3 text-left font-semibold text-slate-300 border-b border-r border-slate-600 ${NAME_COL_WIDTH} shadow-[4px_0_8px_rgba(0,0,0,0.3)]`}>Nome</th>
                <th className="hidden md:table-cell sticky top-0 z-10 bg-slate-800 p-3 text-center font-semibold text-slate-300 border-b border-slate-600 w-[120px]">Setor</th>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
                  const { label, isWeekend } = getDayInfo(d);
                  return (
                    <th 
                      key={d} 
                      id={`day-header-${d}`}
                      className={`sticky top-0 z-10 p-1 md:p-2 border-b border-slate-600 border-l border-slate-700/50 min-w-[32px] md:min-w-[45px] ${isWeekend ? 'bg-purple-900/30' : 'bg-slate-800'}`}
                    >
                      <div className="text-slate-400 text-[8px] md:text-[10px] font-bold uppercase">{label}</div>
                      <div className="text-white font-bold text-xs md:text-sm">{d}</div>
                    </th>
                  );
                })}
                <th className="sticky right-0 top-0 z-30 bg-slate-800 p-2 border-b border-slate-600 min-w-[30px] md:min-w-[40px]"></th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-700/40 transition-colors group">
                  <td className={`sticky left-0 z-20 bg-slate-900 group-hover:bg-slate-800 border-b border-slate-700 p-1 text-center font-mono text-[10px] md:text-sm text-slate-400 ${SHIFT_COL_WIDTH}`}>{emp.shift}</td>
                  <td className={`sticky ${STICKY_NAME_LEFT} z-20 bg-slate-900 group-hover:bg-slate-800 border-b border-r border-slate-700 p-1 md:p-2 font-medium text-slate-200 shadow-[4px_0_8px_rgba(0,0,0,0.3)] ${NAME_COL_WIDTH}`}>
                    <div className="whitespace-normal line-clamp-2 w-full text-[10px] md:text-sm leading-tight" title={emp.name}>
                      {emp.name}
                    </div>
                  </td>
                  <td className="hidden md:table-cell border-b border-slate-700 p-2 text-center text-slate-400 text-xs truncate max-w-[120px]">{emp.sector}</td>
                  
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                    const key = `${emp.id}-${dateStr}`;
                    const status = schedules[key];
                    const { isWeekend, isSunday } = getDayInfo(d);
                    
                    let displayStatus = status;
                    let displayClass = '';
                    
                    if (status) {
                      const sDef = STATUS_LIST.find(s => s.code === status);
                      displayClass = sDef ? `${sDef.color} ${sDef.textColor}` : '';
                    } else if (isSunday) {
                      displayClass = 'bg-purple-900/60 text-purple-200';
                      displayStatus = 'DOM';
                    } else if (isWeekend) {
                      displayClass = 'bg-purple-900/20';
                    }

                    return (
                      <ScheduleCell 
                        key={d}
                        displayStatus={displayStatus}
                        displayClass={displayClass}
                        onCycle={() => handleStatusCycle(emp.id, d)}
                        onReset={() => handleStatusReset(emp.id, d)}
                      />
                    );
                  })}
                  
                  <td className="sticky right-0 z-20 bg-slate-900 group-hover:bg-slate-800 border-b border-slate-700 p-1 text-center">
                    <button 
                      onClick={() => handleDeleteEmployee(emp.id)}
                      className="flex items-center justify-center w-6 h-6 md:w-8 md:h-8 rounded-full hover:bg-red-500/20 text-slate-600 hover:text-red-500 transition-all mx-auto"
                      title="Excluir funcionário"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18"></path>
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
              
              {filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan={daysInMonth + 4} className="p-8 text-center text-slate-500 italic">
                    Nenhum funcionário encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <EmployeeModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleAddEmployee}
        isLoading={isSaving}
      />

      {/* Stats Detail Modal */}
      <StatsModal 
        isOpen={isStatsModalOpen}
        onClose={() => setIsStatsModalOpen(false)}
        title={modalData.title}
        icon={modalData.icon}
        data={modalData.data}
      />
    </div>
  );
}

const StatCard = ({ title, value, icon, color, onClick }: { title: string, value: number, icon: string, color: string, onClick?: () => void }) => (
  <div 
    onClick={onClick}
    className="bg-slate-800/60 border border-slate-700 p-2 md:p-4 rounded-xl flex flex-col md:flex-row items-center md:items-start justify-center md:justify-start gap-1 md:gap-4 hover:bg-slate-800 hover:scale-[1.02] transition-all cursor-pointer shadow-lg active:scale-95 touch-manipulation h-full"
  >
    <div className="text-xl md:text-3xl bg-slate-900/80 p-2 md:p-3 rounded-lg">{icon}</div>
    <div className="text-center md:text-left">
      <div className={`text-lg md:text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-slate-400 text-[9px] md:text-xs uppercase tracking-wider font-semibold leading-tight">{title}</div>
    </div>
  </div>
);

export default App;