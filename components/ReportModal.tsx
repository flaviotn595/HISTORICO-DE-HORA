import React, { useState, useEffect } from 'react';
import { Employee } from '../types';
import { STATUS_LIST, MONTHS, WEEK_DAYS } from '../constants';
import * as api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

type ReportFilter = 'todos' | 'trino' | 'casa';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  initialSchedules: Record<string, string>;
  initialMonth: number;
  initialYear: number;
}

const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  employees,
  initialSchedules,
  initialMonth,
  initialYear
}) => {
  const { supervisor } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [selectedYear, setSelectedYear] = useState(initialYear);
  const [fetchedSchedules, setFetchedSchedules] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [reportFilter, setReportFilter] = useState<ReportFilter>('casa');

  // Filter employees based on selected filter
  const filteredEmployees = employees.filter(e => {
    const nameUpper = e.name.toUpperCase();
    const isTrino = nameUpper.includes('TRINO');
    if (reportFilter === 'trino') return isTrino;
    if (reportFilter === 'casa') return !isTrino;
    return true; // 'todos'
  });

  useEffect(() => {
    if (isOpen) {
      setSelectedMonth(initialMonth);
      setSelectedYear(initialYear);
    }
  }, [isOpen, initialMonth, initialYear]);

  const isCurrentView = selectedMonth === initialMonth && selectedYear === initialYear;

  useEffect(() => {
    if (isOpen && !isCurrentView && supervisor) {
      loadReportData();
    }
  }, [isOpen, selectedMonth, selectedYear, isCurrentView, supervisor]);

  const loadReportData = async () => {
    if (!supervisor) return;
    setIsLoading(true);
    try {
      const data = await api.fetchSchedules(selectedYear, selectedMonth, supervisor.id);
      const map: Record<string, string> = {};
      data.forEach(s => {
        if (s.date) {
          const datePart = s.date.split('T')[0];
          map[`${String(s.employee_id)}-${datePart}`] = s.status;
        }
      });
      setFetchedSchedules(map);
    } catch (error) {
      console.error("Erro no relatório:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const activeSchedules = isCurrentView ? initialSchedules : fetchedSchedules;
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();

  const getEmployeeStats = (empId: number) => {
    const stats: Record<string, number> = {};
    STATUS_LIST.forEach(s => { if (s.code) stats[s.code] = 0; });

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const status = activeSchedules[`${empId}-${dateStr}`];
      if (status && stats[status] !== undefined) {
        stats[status]++;
      }
    }
    return stats;
  };

  const getHexColor = (tailwindClass: string) => {
    if (tailwindClass.includes('green-500')) return '#22c55e';
    if (tailwindClass.includes('yellow-400')) return '#facc15';
    if (tailwindClass.includes('orange-500')) return '#f97316';
    if (tailwindClass.includes('red-500')) return '#ef4444';
    if (tailwindClass.includes('lime-500')) return '#84cc16';
    if (tailwindClass.includes('blue-500')) return '#3b82f6';
    if (tailwindClass.includes('purple-600')) return '#9333ea';
    if (tailwindClass.includes('cyan-500')) return '#06b6d4';
    if (tailwindClass.includes('pink-500')) return '#ec4899';
    if (tailwindClass.includes('purple-800')) return '#6b21a8';
    return '#ffffff';
  };

  const getTextColor = (tailwindClass: string) => {
    if (tailwindClass.includes('text-black')) return '#000000';
    return '#ffffff';
  };

  const filterLabel = reportFilter === 'trino' ? 'TRINO' : reportFilter === 'casa' ? 'COLABORADORES DA CASA' : 'TODOS';

  const exportToExcel = () => {
    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Relatorio ${MONTHS[selectedMonth]}</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
      </head>
      <body>
        <table border="1" style="border-collapse: collapse;">
          <thead>
            <tr>
              <th colspan="${daysInMonth + 3 + STATUS_LIST.filter(s => s.code).length}" style="background-color: #0f172a; color: white; font-size: 16px; font-weight: bold; text-align: center; padding: 10px;">
                RELATÓRIO DE FREQUÊNCIA — ${filterLabel} — ${MONTHS[selectedMonth].toUpperCase()} / ${selectedYear}
              </th>
            </tr>
            <tr style="background-color: #1e293b; color: white;">
              <th style="padding: 5px;">COLABORADOR</th>
              <th style="padding: 5px;">TURNO</th>
              ${Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1;
      const date = new Date(selectedYear, selectedMonth, d);
      const isSun = date.getDay() === 0;
      const bg = isSun ? '#450a0a' : '#1e293b';
      return `<th style="padding: 5px; background-color: ${bg};">${d}</th>`;
    }).join('')}
              ${STATUS_LIST.filter(s => s.code).map(s => `<th style="padding: 5px; background-color: ${getHexColor(s.color)}; color: ${getTextColor(s.textColor)};">${s.code}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${filteredEmployees.map(emp => {
      const stats = getEmployeeStats(emp.id);
      return `
                <tr>
                  <td style="padding: 5px;">${emp.name}</td>
                  <td style="padding: 5px; text-align: center;">${emp.shift}</td>
                  ${Array.from({ length: daysInMonth }, (_, i) => {
        const d = i + 1;
        const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const status = activeSchedules[`${emp.id}-${dateStr}`];
        const sDef = STATUS_LIST.find(s => s.code === status);
        const bg = sDef ? getHexColor(sDef.color) : 'transparent';
        const color = sDef ? getTextColor(sDef.textColor) : 'black';
        return `<td style="padding: 5px; text-align: center; background-color: ${bg}; color: ${color};">${status || ''}</td>`;
      }).join('')}
                   ${STATUS_LIST.filter(s => s.code).map(s => `<td style="padding: 5px; text-align: center; background-color: #eee; color: black;">${stats[s.code] || 0}</td>`).join('')}
                </tr>
              `;
    }).join('')}
          </tbody>
        </table>
        
        <br><br>
        
        <table border="1" style="border-collapse: collapse; width: 300px;">
            <thead>
                <tr>
                    <th colspan="2" style="background-color: #0f172a; color: white; padding: 5px; text-align: center;">LEGENDA</th>
                </tr>
            </thead>
            <tbody>
                ${STATUS_LIST.filter(s => s.code).map(s => `
                    <tr>
                        <td style="background-color: ${getHexColor(s.color)}; color: ${getTextColor(s.textColor)}; text-align: center; font-weight: bold; width: 50px;">${s.code}</td>
                        <td style="padding: 5px;">${s.label}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Relatorio_${filterLabel.replace(/ /g, '_')}_${MONTHS[selectedMonth]}_${selectedYear}.xls`;
    link.click();
  };

  if (!isOpen) return null;

  const filterOptions: { value: ReportFilter; label: string; icon: string; activeClass: string }[] = [
    { value: 'casa', label: 'Colaboradores da Casa', icon: '🏠', activeClass: 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50' },
    { value: 'trino', label: 'Trino', icon: '🔺', activeClass: 'bg-violet-600 text-white shadow-lg shadow-violet-900/50' },
    { value: 'todos', label: 'Todos', icon: '👥', activeClass: 'bg-sky-600 text-white shadow-lg shadow-sky-900/50' },
  ];

  return (
    <div className="fixed inset-0 bg-slate-950/98 flex items-center justify-center z-[200] backdrop-blur-xl p-2 md:p-6 overflow-hidden">
      <div className="bg-slate-900 text-white rounded-2xl w-full max-w-[98vw] h-full max-h-[95vh] flex flex-col shadow-2xl border border-slate-700/60 print:bg-white print:text-black print:m-0 print:p-0 print:shadow-none print:max-h-none print:rounded-none print:border-none">

        {/* ═══ HEADER ═══ */}
        <div className="print:hidden shrink-0">
          {/* Top bar */}
          <div className="px-4 pt-3 pb-0 flex flex-wrap justify-between items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-green-900/50">
                <span className="text-base leading-none">📊</span>
              </div>
              <div>
                <h2 className="font-black text-white text-sm tracking-tight leading-tight">Relatório de Frequência</h2>
                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">Recursos Humanos</p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={exportToExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-black rounded-lg shadow transition-all duration-150"
              >
                <span>📥</span> EXCEL
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-black rounded-lg shadow transition-all duration-150"
              >
                <span>🖨️</span> IMPRIMIR
              </button>
              <button
                onClick={onClose}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-all text-sm font-bold"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Controls bar */}
          <div className="mx-4 mt-3 mb-3 p-3 rounded-xl bg-slate-800/70 border border-slate-700/50 flex flex-wrap items-center gap-4">

            {/* Month / Year pickers */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Período</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-slate-700/80 border border-slate-600 rounded-lg px-2 py-1 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer transition-colors hover:bg-slate-700"
              >
                {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-slate-700/80 border border-slate-600 rounded-lg px-2 py-1 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer transition-colors hover:bg-slate-700"
              >
                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            {/* Divider */}
            <div className="h-6 w-px bg-slate-700" />

            {/* Filter toggle */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Filtrar por</span>
              <div className="flex gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-700/50">
                {filterOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setReportFilter(opt.value)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black transition-all duration-200 ${
                      reportFilter === opt.value
                        ? opt.activeClass
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                    }`}
                  >
                    <span>{opt.icon}</span>
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Spacer + count badge */}
            <div className="ml-auto flex items-center gap-2">
              <span className="text-[10px] text-slate-500 font-medium">
                <strong className="text-slate-300">{filteredEmployees.length}</strong> colaborador{filteredEmployees.length !== 1 ? 'es' : ''}
              </span>
            </div>
          </div>
        </div>

        {/* ═══ REPORT CONTENT ═══ */}
        <div className="flex-1 overflow-auto bg-slate-800/30 print:bg-white print:p-0">
          <div className="min-w-[1200px] bg-slate-900/80 p-6 shadow-inner print:shadow-none print:p-4 mx-auto border-x border-slate-800/60 print:border-none print:bg-white h-full">

            {/* Report title */}
            <div className="text-center mb-5 border-b-2 border-slate-700 print:border-black pb-4">
              <h1 className="text-xl font-black uppercase tracking-tight text-white print:text-black">
                📋 Relatório de Frequência Mensal
              </h1>
              <p className="text-xs font-bold text-slate-400 print:text-gray-600 mt-1 uppercase tracking-widest">
                {filterLabel}
              </p>
              <div className="flex justify-center gap-6 mt-3 font-bold text-[10px] text-slate-400 print:text-black">
                <span className="bg-slate-800 print:bg-gray-100 px-3 py-1.5 rounded-lg">
                  📅 <strong className="text-white print:text-black">{MONTHS[selectedMonth]} / {selectedYear}</strong>
                </span>
                <span className="bg-slate-800 print:bg-gray-100 px-3 py-1.5 rounded-lg">
                  👥 <strong className="text-white print:text-black">{filteredEmployees.length} colaboradores</strong>
                </span>
                <span className="bg-slate-800 print:bg-gray-100 px-3 py-1.5 rounded-lg">
                  📆 <strong className="text-white print:text-black">{daysInMonth} dias</strong>
                </span>
              </div>
            </div>

            {isLoading ? (
              <div className="py-32 text-center">
                <div className="animate-spin inline-block w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full mb-4"></div>
                <p className="font-black text-slate-500 uppercase text-xs tracking-[0.2em]">Carregando dados...</p>
              </div>
            ) : (
              <>
                {/* Main Table */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-[9px] print:text-[8px]">
                    <thead>
                      <tr className="bg-slate-800 print:bg-gray-200">
                        <th className="border border-slate-600 print:border-black p-2 text-left w-48 text-slate-300 print:text-black font-black">COLABORADOR</th>
                        <th className="border border-slate-600 print:border-black p-2 text-center w-10 text-slate-400 print:text-black">T</th>
                        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
                          const date = new Date(selectedYear, selectedMonth, d);
                          const dayOfWeek = date.getDay();
                          const isSun = dayOfWeek === 0;
                          const isSat = dayOfWeek === 6;
                          return (
                            <th
                              key={d}
                              className={`border border-slate-600 print:border-black p-1 text-center min-w-[22px] ${isSun ? 'bg-red-900/40 print:bg-red-100' : isSat ? 'bg-blue-900/20 print:bg-blue-50' : ''}`}
                            >
                              <div className="text-[6px] font-bold text-slate-500 print:text-gray-600">{WEEK_DAYS[dayOfWeek]}</div>
                              <div className="font-black text-[10px] text-slate-300 print:text-black">{d}</div>
                            </th>
                          );
                        })}
                        {STATUS_LIST.filter(s => s.code).map(s => (
                          <th key={s.code} className={`border border-slate-600 print:border-black p-1 text-center min-w-[24px] ${s.color} print:bg-gray-100`}>
                            <div className="font-black text-[10px]">{s.code}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEmployees.length === 0 ? (
                        <tr>
                          <td colSpan={daysInMonth + 2 + STATUS_LIST.filter(s => s.code).length} className="p-16 text-center font-black text-slate-600 uppercase">
                            Nenhum colaborador encontrado para este filtro
                          </td>
                        </tr>
                      ) : (
                        filteredEmployees.map((emp, idx) => {
                          const stats = getEmployeeStats(emp.id);
                          return (
                            <tr key={emp.id} className={`${idx % 2 === 0 ? 'bg-slate-900/40' : 'bg-slate-800/20'} print:bg-transparent hover:bg-slate-700/30 transition-colors`}>
                              <td className="border border-slate-600 print:border-black p-1.5 font-bold text-slate-300 print:text-black truncate max-w-[180px]" title={emp.name}>
                                {emp.name}
                              </td>
                              <td className="border border-slate-600 print:border-black p-1 text-center font-mono text-slate-500 print:text-black">
                                {emp.shift}
                              </td>
                              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
                                const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                                const status = activeSchedules[`${emp.id}-${dateStr}`];
                                const date = new Date(selectedYear, selectedMonth, d);
                                const isSun = date.getDay() === 0;
                                const statusDef = STATUS_LIST.find(s => s.code === status);

                                return (
                                  <td
                                    key={d}
                                    className={`border border-slate-600 print:border-black text-center font-black p-0.5 ${statusDef ? `${statusDef.color} ${statusDef.textColor}` :
                                      isSun ? 'bg-red-950/30 text-red-400 print:bg-red-50 print:text-red-800' : ''
                                      } print:!bg-transparent print:!text-black`}
                                  >
                                    {status || (isSun ? '—' : '')}
                                  </td>
                                );
                              })}
                              {STATUS_LIST.filter(s => s.code).map(s => (
                                <td key={s.code} className="border border-slate-600 print:border-black text-center font-black p-1 bg-slate-700/40 print:bg-gray-50 text-slate-200 print:text-black">
                                  {stats[s.code] || 0}
                                </td>
                              ))}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Legend */}
                <div className="mt-6 p-4 bg-slate-800/40 rounded-xl border border-slate-700/40 print:bg-gray-50 print:border print:border-gray-300">
                  <h3 className="font-black text-[10px] text-slate-400 print:text-black mb-3 uppercase tracking-widest">Legenda dos Status:</h3>
                  <div className="flex flex-wrap gap-3 text-[10px]">
                    {STATUS_LIST.filter(s => s.code).map(s => (
                      <div key={s.code} className="flex items-center gap-2 bg-slate-700/40 print:bg-white px-3 py-1.5 rounded-lg border border-slate-600/30">
                        <span className={`w-5 h-5 rounded flex items-center justify-center font-black ${s.color} ${s.textColor} print:border print:border-black`}>
                          {s.code}
                        </span>
                        <span className="text-slate-300 print:text-black font-medium">{s.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Signatures */}
                <div className="mt-12 grid grid-cols-3 gap-16 px-8 print:px-4 print:mt-8">
                  <div className="border-t-2 border-slate-600 print:border-black pt-3 text-center">
                    <p className="text-[10px] font-black uppercase text-slate-500 print:text-black">Supervisor Responsável</p>
                  </div>
                  <div className="border-t-2 border-slate-600 print:border-black pt-3 text-center">
                    <p className="text-[10px] font-black uppercase text-slate-500 print:text-black">Gerente de Operações</p>
                  </div>
                  <div className="border-t-2 border-slate-600 print:border-black pt-3 text-center">
                    <p className="text-[10px] font-black uppercase text-slate-500 print:text-black">Recursos Humanos</p>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-8 text-center text-[8px] text-slate-600 print:text-gray-500">
                  Documento gerado em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: landscape; margin: 5mm; }
          body { 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
            background: white !important; 
            zoom: 0.55;
          }
          .print-hidden { display: none !important; }
          .max-h-\\[95vh\\] { max-height: none !important; height: auto !important; }
          .max-w-\\[98vw\\] { max-width: none !important; width: 100% !important; }
          .rounded-2xl { border-radius: 0 !important; }
          .border { border: none !important; }
          .shadow-2xl { box-shadow: none !important; }
          .overflow-hidden { overflow: visible !important; }
          .overflow-auto { overflow: visible !important; }
          table { width: 100% !important; }
          th, td { padding: 2px !important; }
        }
      `}</style>
    </div>
  );
};

export default ReportModal;