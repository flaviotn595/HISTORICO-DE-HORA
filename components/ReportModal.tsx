import React, { useState, useEffect } from 'react';
import { Employee } from '../types';
import { STATUS_LIST, MONTHS, WEEK_DAYS } from '../constants';
import * as api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

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

  // Filter employees to exclude "TRINO"
  const filteredEmployees = employees.filter(e => !e.name.toUpperCase().includes('TRINO'));

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

  // Calcular estatísticas por funcionário
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

  // Helper to get hex color from Tailwind class (simplified)
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

  // Exportar para Excel (HTML Format)
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
                RELATÓRIO DE FREQUÊNCIA - ${MONTHS[selectedMonth].toUpperCase()} / ${selectedYear}
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
    link.download = `Relatorio_Escala_${MONTHS[selectedMonth]}_${selectedYear}.xls`;
    link.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/98 flex items-center justify-center z-[200] backdrop-blur-xl p-2 md:p-6 overflow-hidden">
      <div className="bg-slate-900 text-white rounded-2xl w-full max-w-[98vw] h-full max-h-[95vh] flex flex-col shadow-2xl border border-slate-700 print:bg-white print:text-black print:m-0 print:p-0 print:shadow-none print:max-h-none print:rounded-none print:border-none">

        {/* Header Superior */}
        <div className="p-3 border-b border-slate-800 flex flex-wrap justify-between items-center bg-slate-900/50 print:hidden gap-3">
          <div className="flex items-center gap-4">
            <h2 className="font-black text-green-400 uppercase text-sm tracking-tighter">📊 Relatório RH</h2>
            <div className="flex gap-2">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-slate-800 border border-slate-700 rounded px-3 py-1 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-green-500"
              >
                {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-slate-800 border border-slate-700 rounded px-3 py-1 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-green-500"
              >
                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportToExcel}
              className="px-4 py-2 bg-blue-600 text-white text-xs font-black rounded-lg shadow-lg hover:bg-blue-500 transition-all active:scale-95"
            >
              📥 EXPORTAR EXCEL
            </button>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-green-600 text-white text-xs font-black rounded-lg shadow-lg hover:bg-green-500 transition-all active:scale-95"
            >
              🖨️ IMPRIMIR
            </button>
            <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors">✕</button>
          </div>
        </div>

        {/* Área da Folha */}
        <div className="flex-1 overflow-auto bg-slate-800/50 p-2 md:p-4 print:bg-white print:p-0">
          <div className="min-w-[1200px] bg-slate-900 p-6 shadow-2xl print:shadow-none print:p-4 mx-auto border border-slate-800 print:border-none print:bg-white">

            {/* Cabeçalho do Relatório */}
            <div className="text-center mb-6 border-b-2 border-slate-700 print:border-black pb-4">
              <h1 className="text-2xl font-black uppercase tracking-tight text-white print:text-black">
                📋 Relatório de Frequência Mensal
              </h1>
              <div className="flex justify-center gap-8 mt-3 font-bold text-xs text-slate-400 print:text-black">
                <span className="bg-slate-800 print:bg-gray-100 px-4 py-2 rounded-lg">
                  📅 Período: <strong className="text-white print:text-black">{MONTHS[selectedMonth]} / {selectedYear}</strong>
                </span>
                <span className="bg-slate-800 print:bg-gray-100 px-4 py-2 rounded-lg">
                  👥 Total: <strong className="text-white print:text-black">{filteredEmployees.length} colaboradores</strong>
                </span>
                <span className="bg-slate-800 print:bg-gray-100 px-4 py-2 rounded-lg">
                  📆 Dias: <strong className="text-white print:text-black">{daysInMonth}</strong>
                </span>
              </div>
            </div>

            {isLoading ? (
              <div className="py-32 text-center">
                <div className="animate-spin inline-block w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full mb-4"></div>
                <p className="font-black text-slate-500 uppercase text-xs tracking-[0.2em]">Carregando dados...</p>
              </div>
            ) : (
              <>
                {/* Tabela Principal */}
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
                              className={`border border-slate-600 print:border-black p-1 text-center min-w-[22px] ${isSun ? 'bg-red-900/30 print:bg-red-100' : isSat ? 'bg-blue-900/20 print:bg-blue-50' : ''}`}
                            >
                              <div className="text-[6px] font-bold text-slate-500 print:text-gray-600">{WEEK_DAYS[dayOfWeek]}</div>
                              <div className="font-black text-[10px] text-slate-300 print:text-black">{d}</div>
                            </th>
                          );
                        })}
                        {/* Colunas de Totais */}
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
                            Nenhum colaborador cadastrado
                          </td>
                        </tr>
                      ) : (
                        filteredEmployees.map((emp, idx) => {
                          const stats = getEmployeeStats(emp.id);
                          return (
                            <tr key={emp.id} className={`${idx % 2 === 0 ? 'bg-slate-850' : 'bg-slate-800/30'} print:bg-transparent hover:bg-slate-700/30`}>
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
                                      isSun ? 'bg-red-950/20 text-red-300 print:bg-red-50 print:text-red-800' : ''
                                      } print:!bg-transparent print:!text-black`}
                                  >
                                    {status || (isSun ? '—' : '')}
                                  </td>
                                );
                              })}
                              {/* Totais por Status */}
                              {STATUS_LIST.filter(s => s.code).map(s => (
                                <td key={s.code} className="border border-slate-600 print:border-black text-center font-black p-1 bg-slate-700/50 print:bg-gray-50 text-slate-200 print:text-black">
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

                {/* Legendas */}
                <div className="mt-6 p-4 bg-slate-800/50 rounded-lg print:bg-gray-50 print:border print:border-gray-300">
                  <h3 className="font-black text-xs text-slate-400 print:text-black mb-3 uppercase">Legenda dos Status:</h3>
                  <div className="flex flex-wrap gap-4 text-[10px]">
                    {STATUS_LIST.filter(s => s.code).map(s => (
                      <div key={s.code} className="flex items-center gap-2 bg-slate-700/50 print:bg-white px-3 py-1.5 rounded-lg">
                        <span className={`w-5 h-5 rounded flex items-center justify-center font-black ${s.color} ${s.textColor} print:border print:border-black`}>
                          {s.code}
                        </span>
                        <span className="text-slate-300 print:text-black font-medium">{s.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Área de Assinaturas */}
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

                {/* Rodapé */}
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
            zoom: 0.55; /* Adjust scale to fit */
          }
          .print-hidden { display: none !important; }
          
          /* Remove print limits from container */
          .max-h-\[95vh\] { max-height: none !important; height: auto !important; }
          .max-w-\[98vw\] { max-width: none !important; width: 100% !important; }
          .rounded-2xl { border-radius: 0 !important; }
          .border { border: none !important; }
          .shadow-2xl { box-shadow: none !important; }
          .overflow-hidden { overflow: visible !important; }
          .overflow-auto { overflow: visible !important; }
          
          /* Ensure table fits */
          table { width: 100% !important; }
          th, td { padding: 2px !important; }
        }
      `}</style>
    </div>
  );
};

export default ReportModal;