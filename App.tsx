import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Employee } from './types';
import { STATUS_LIST, MONTHS, WEEK_DAYS } from './constants';
import * as api from './services/api';
import EmployeeModal from './components/EmployeeModal';
import ScheduleCell from './components/ScheduleCell';
import ReportModal from './components/ReportModal';
import Login from './components/Login';
import AdminPanel from './components/AdminPanel';
import { AuthProvider, useAuth } from './contexts/AuthContext';

function AppContent() {
  const { supervisor, signOut, loading: authLoading } = useAuth();
  const [view, setView] = useState<'dashboard' | 'admin'>('dashboard');

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [schedules, setSchedules] = useState<Record<string, string>>({});
  const [currentDate, setCurrentDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const tableContainerRef = useRef<HTMLDivElement>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const SHIFT_COL_WIDTH = 'w-[30px] min-w-[30px] md:w-[50px] md:min-w-[50px]';
  const NAME_COL_WIDTH = 'w-[85px] min-w-[85px] md:w-[200px] md:min-w-[200px]';
  const STICKY_NAME_LEFT = 'left-[30px] md:left-[50px]';

  const loadData = useCallback(async () => {
    if (!supervisor) return;
    setIsLoading(true);
    try {
      const [emps, scheds] = await Promise.all([
        api.fetchEmployees(supervisor.id),
        api.fetchSchedules(year, month, supervisor.id)
      ]);

      setEmployees(emps);

      const scheduleMap: Record<string, string> = {};
      scheds.forEach(s => {
        if (s.date) {
          const datePart = s.date.includes('T') ? s.date.split('T')[0] : s.date;
          scheduleMap[`${s.employee_id}-${datePart}`] = s.status;
        }
      });
      setSchedules(scheduleMap);

    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setIsLoading(false);
    }
  }, [year, month, supervisor]);

  useEffect(() => {
    if (supervisor) {
      loadData();
    }
  }, [loadData, supervisor]);

  const handleAddEmployee = async (name: string, shift: string, sector: string) => {
    if (!supervisor) return;
    setIsSaving(true);
    const newEmp = await api.createEmployee(
      { name: name.toUpperCase(), shift, sector: sector.toUpperCase() },
      supervisor.id
    );
    if (newEmp) {
      setEmployees(prev => [...prev, newEmp]);
      setIsModalOpen(false);
    }
    setIsSaving(false);
  };

  const handleMonthChange = (delta: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setCurrentDate(newDate);
  };

  const handleStatusCycle = async (empId: number, day: number) => {
    if (!supervisor) return;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const key = `${empId}-${dateStr}`;
    const currentStatus = schedules[key] || '';
    const currentIndex = STATUS_LIST.findIndex(s => s.code === currentStatus);
    const nextIndex = (currentIndex + 1) % STATUS_LIST.length;
    const nextStatus = STATUS_LIST[nextIndex].code;

    setSchedules(prev => ({ ...prev, [key]: nextStatus }));
    await api.upsertSchedule({ employee_id: empId, date: dateStr, status: nextStatus }, supervisor.id);
  };

  const handleStatusReset = async (empId: number, day: number) => {
    if (!supervisor) return;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const key = `${empId}-${dateStr}`;
    if (!schedules[key]) return;
    setSchedules(prev => ({ ...prev, [key]: '' }));
    await api.upsertSchedule({ employee_id: empId, date: dateStr, status: '' }, supervisor.id);
  };

  const getDayInfo = useCallback((d: number) => {
    const date = new Date(year, month, d);
    const dayIdx = date.getDay();
    return { label: WEEK_DAYS[dayIdx], isWeekend: dayIdx === 0 || dayIdx === 6, isSunday: dayIdx === 0 };
  }, [year, month]);

  const stats = useMemo(() => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    let presentToday = 0;
    let absencesMonth = 0;

    employees.forEach(emp => {
      if (schedules[`${emp.id}-${todayStr}`] === 'P') presentToday++;
      for (let d = 1; d <= daysInMonth; d++) {
        const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        if (schedules[`${emp.id}-${dStr}`] === 'X') absencesMonth++;
      }
    });
    return { total: employees.length, presentToday, absencesMonth };
  }, [employees, schedules, daysInMonth, year, month]);

  const filteredEmployees = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return employees.filter(e => e.name.toLowerCase().includes(term) || e.sector.toLowerCase().includes(term));
  }, [employees, searchTerm]);

  if (authLoading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Carregando...</div>;
  if (!supervisor) return <Login />;

  if (view === 'admin') {
    return <AdminPanel onBack={() => setView('dashboard')} supervisorId={supervisor.id} />;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white selection:bg-green-500/30">
      <div className="w-full p-2 md:p-6 lg:p-8">
        <header className="mb-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <h1 className="text-2xl md:text-4xl font-black bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
            CONTROLE DE ESCALA
          </h1>
          <div className="flex items-center gap-4 bg-slate-800 p-2 rounded-xl border border-slate-700">
            <div className="text-xs md:text-sm text-slate-400 px-2">
              👤 {supervisor.email}
            </div>
            <button
              onClick={() => setView('admin')}
              className="p-2 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors"
              title="Painel Admin"
            >
              ⚙️
            </button>
            <button
              onClick={signOut}
              className="p-2 hover:bg-red-900/30 text-red-400 hover:text-red-300 rounded-lg transition-colors text-xs font-bold uppercase"
            >
              Sair
            </button>
          </div>
        </header>

        <div className="grid grid-cols-3 gap-2 md:gap-4 mb-4">
          <StatCard title="Total" value={stats.total} icon="👥" color="text-blue-400" />
          <StatCard title="Presentes" value={stats.presentToday} icon="✅" color="text-green-400" />
          <StatCard title="Faltas" value={stats.absencesMonth} icon="❌" color="text-red-400" />
        </div>

        <div className="flex flex-col md:flex-row gap-2 mb-4">
          <input
            type="text" placeholder="Buscar funcionário..."
            className="flex-1 bg-slate-800 border-none rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="flex items-center justify-between gap-4 bg-slate-800 rounded-lg px-4 py-2">
            <button onClick={() => handleMonthChange(-1)} className="hover:text-green-400 transition-colors">◀</button>
            <span className="font-bold text-xs md:text-sm uppercase whitespace-nowrap">{MONTHS[month]} {year}</span>
            <button onClick={() => handleMonthChange(1)} className="hover:text-green-400 transition-colors">▶</button>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setIsReportModalOpen(true)} className="flex-1 bg-slate-700 p-3 rounded-lg font-bold text-xs md:text-sm hover:bg-slate-600 transition-colors">📄 RELATÓRIO RH</button>
            <button onClick={() => setIsModalOpen(true)} className="flex-1 bg-green-600 p-3 rounded-lg font-bold text-xs md:text-sm hover:bg-green-500 transition-colors">➕ NOVO</button>
          </div>
        </div>

        <div ref={tableContainerRef} className="relative overflow-x-auto rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
          {isLoading && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-500"></div>
            </div>
          )}

          <table className="w-full text-[10px] md:text-sm border-collapse table-fixed">
            <thead>
              <tr className="bg-slate-800">
                <th className={`sticky left-0 z-30 bg-slate-800 p-2 text-center text-slate-400 border-b border-slate-700 ${SHIFT_COL_WIDTH}`}>T</th>
                <th className={`sticky ${STICKY_NAME_LEFT} z-30 bg-slate-800 p-2 text-left text-slate-300 border-b border-r border-slate-700 ${NAME_COL_WIDTH} shadow-lg`}>Nome</th>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
                  const { label, isWeekend } = getDayInfo(d);
                  return (
                    <th key={d} id={`day-header-${d}`} className={`p-1 border-b border-slate-700 border-l border-slate-800 min-w-[32px] md:min-w-[42px] ${isWeekend ? 'bg-indigo-900/30' : ''}`}>
                      <div className="text-[7px] md:text-[9px] text-slate-500 leading-none">{label}</div>
                      <div className="font-bold">{d}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-800/40 border-b border-slate-800/50 group">
                  <td className={`sticky left-0 z-20 bg-slate-900 group-hover:bg-slate-800 p-2 text-center font-mono text-slate-500 ${SHIFT_COL_WIDTH}`}>{emp.shift}</td>
                  <td className={`sticky ${STICKY_NAME_LEFT} z-20 bg-slate-900 group-hover:bg-slate-800 p-2 border-r border-slate-700 font-bold text-slate-300 shadow-lg ${NAME_COL_WIDTH}`}>
                    <div className="line-clamp-2 leading-tight" title={emp.name}>{emp.name}</div>
                  </td>
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                    const status = schedules[`${emp.id}-${dateStr}`];
                    const { isWeekend, isSunday } = getDayInfo(d);
                    let displayStatus = status;
                    let displayClass = '';
                    if (status) {
                      const sDef = STATUS_LIST.find(s => s.code === status);
                      displayClass = sDef ? `${sDef.color} ${sDef.textColor}` : '';
                    } else if (isSunday) {
                      displayClass = 'bg-indigo-900/40 text-indigo-300';
                      displayStatus = 'DOM';
                    } else if (isWeekend) {
                      displayClass = 'bg-slate-800/30';
                    }
                    return (
                      <ScheduleCell key={d} displayStatus={displayStatus} displayClass={displayClass} onCycle={() => handleStatusCycle(emp.id, d)} onReset={() => handleStatusReset(emp.id, d)} />
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <EmployeeModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleAddEmployee} isLoading={isSaving} />
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        employees={employees}
        initialSchedules={schedules}
        initialMonth={month}
        initialYear={year}
      />
    </div>
  );
}

const StatCard = ({ title, value, icon, color }: any) => (
  <div className="bg-slate-800/50 border border-slate-700 p-2 md:p-4 rounded-xl flex flex-col items-center justify-center">
    <div className="text-lg md:text-2xl">{icon}</div>
    <div className={`text-sm md:text-xl font-black ${color}`}>{value}</div>
    <div className="text-[8px] md:text-xs text-slate-500 uppercase font-bold">{title}</div>
  </div>
);

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}