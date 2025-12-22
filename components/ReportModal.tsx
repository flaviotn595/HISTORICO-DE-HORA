import React, { useState, useEffect } from 'react';
import { Employee } from '../types';
import { STATUS_LIST, MONTHS, WEEK_DAYS } from '../constants';
import * as api from '../services/api';

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
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [selectedYear, setSelectedYear] = useState(initialYear);
  const [fetchedSchedules, setFetchedSchedules] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Sincroniza seletores ao abrir
  useEffect(() => {
    if (isOpen) {
      setSelectedMonth(initialMonth);
      setSelectedYear(initialYear);
    }
  }, [isOpen, initialMonth, initialYear]);

  const isCurrentView = selectedMonth === initialMonth && selectedYear === initialYear;

  // Busca dados se mudar o mês/ano
  useEffect(() => {
    if (isOpen && !isCurrentView) {
      loadReportData();
    }
  }, [isOpen, selectedMonth, selectedYear, isCurrentView]);

  const loadReportData = async () => {
    setIsLoading(true);
    try {
      const data = await api.fetchSchedules(selectedYear, selectedMonth);
      const map: Record<string, string> = {};
      data.forEach(s => {
        if (s.date) {
          const datePart = s.date.split('T')[0];
          // Forçamos o ID do funcionário para string para garantir o match no mapeamento
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

  // Consolida dados da tela ou do banco
  const activeSchedules = isCurrentView ? initialSchedules : fetchedSchedules;
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/98 flex items-center justify-center z-[200] backdrop-blur-xl p-2 md:p-6 overflow-hidden">
      <div className="bg-slate-900 text-white rounded-2xl w-full max-w-[95vw] h-full max-h-[95vh] flex flex-col shadow-2xl border border-slate-700 print:bg-white print:text-black print:m-0 print:p-0 print:shadow-none print:max-h-none print:rounded-none print:border-none">
        
        {/* Header Superior */}
        <div className="p-4 border-b border-slate-800 flex flex-wrap justify-between items-center bg-slate-900/50 print:hidden gap-3">
          <div className="flex items-center gap-4">
            <h2 className="font-black text-green-400 uppercase text-sm tracking-tighter">Visualização de Impressão</h2>
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
            <button onClick={onClose} className="px-5 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors">Fechar</button>
            <button 
              onClick={() => window.print()} 
              className="px-6 py-2 bg-green-600 text-white text-xs font-black rounded-lg shadow-lg hover:bg-green-500 transition-all active:scale-95"
            >
              🖨️ IMPRIMIR / SALVAR PDF
            </button>
          </div>
        </div>

        {/* Área da Folha */}
        <div className="flex-1 overflow-auto bg-slate-800/50 p-2 md:p-6 print:bg-white print:p-0">
          <div className="min-w-[1100px] bg-slate-900 p-8 shadow-2xl print:shadow-none print:p-2 mx-auto border border-slate-800 print:border-none print:bg-white">
            
            <div className="text-center mb-8 border-b-2 border-slate-700 print:border-black pb-6">
              <h1 className="text-3xl font-black uppercase tracking-tighter text-white print:text-black">Folha Mensal de Frequência</h1>
              <div className="flex justify-center gap-12 mt-4 font-bold uppercase text-[10px] tracking-widest text-slate-400 print:text-black">
                <span className="bg-slate-800 print:bg-transparent px-3 py-1 rounded">Período: {MONTHS[selectedMonth]} / {selectedYear}</span>
                <span className="bg-slate-800 print:bg-transparent px-3 py-1 rounded">Setor: OPERACIONAL</span>
              </div>
            </div>

            {isLoading ? (
              <div className="py-32 text-center">
                <div className="animate-spin inline-block w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full mb-4"></div>
                <p className="font-black text-slate-500 uppercase text-xs tracking-[0.2em]">Sincronizando Escala...</p>
              </div>
            ) : (
              <table className="w-full border-collapse border border-slate-700 print:border-black text-[10px]">
                <thead>
                  <tr className="bg-slate-800 print:bg-slate-100">
                    <th className="border border-slate-700 print:border-black p-3 text-left w-64 text-slate-300 print:text-black">NOME DO COLABORADOR</th>
                    <th className="border border-slate-700 print:border-black p-3 text-center w-12 text-[8px] text-slate-400 print:text-black uppercase">Turno</th>
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
                      const date = new Date(selectedYear, selectedMonth, d);
                      const isSun = date.getDay() === 0;
                      return (
                        <th key={d} className={`border border-slate-700 print:border-black p-1 text-center min-w-[26px] ${isSun ? 'bg-indigo-900/30 print:bg-slate-200' : ''}`}>
                          <div className="text-[7px] font-bold text-slate-500 print:text-black leading-none mb-1">{WEEK_DAYS[date.getDay()]}</div>
                          <div className="font-black text-[11px] text-slate-200 print:text-black">{d}</div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {employees.length === 0 ? (
                    <tr>
                      <td colSpan={daysInMonth + 2} className="p-20 text-center font-black text-slate-600 uppercase tracking-widest">Nenhum dado disponível</td>
                    </tr>
                  ) : (
                    employees.map(emp => (
                      <tr key={emp.id} className="hover:bg-slate-800/50 transition-colors print:bg-transparent">
                        <td className="border border-slate-700 print:border-black p-2 font-bold uppercase truncate whitespace-nowrap text-slate-300 print:text-black">{emp.name}</td>
                        <td className="border border-slate-700 print:border-black p-2 text-center font-mono font-bold text-slate-500 print:text-black text-[9px]">{emp.shift}</td>
                        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
                          const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                          const status = activeSchedules[`${emp.id}-${dateStr}`];
                          const date = new Date(selectedYear, selectedMonth, d);
                          const isSun = date.getDay() === 0;
                          
                          // Buscamos a definição do status para aplicar a cor
                          const statusDef = STATUS_LIST.find(s => s.code === status);
                          const cellColor = statusDef ? `${statusDef.color} ${statusDef.textColor}` : '';
                          
                          return (
                            <td 
                              key={d} 
                              className={`border border-slate-700 print:border-black text-center font-black p-0 h-9 transition-colors ${isSun && !status ? 'bg-indigo-950/20 print:bg-slate-100' : ''} ${cellColor} print:!bg-transparent print:!text-black`}
                            >
                              <span className="print:text-black">{status || (isSun ? 'DOM' : '')}</span>
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {/* Legendas e Rodapé */}
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[9px] font-black border-t border-slate-800 print:border-black pt-6 text-slate-500 print:text-black uppercase">
              {STATUS_LIST.filter(s => s.code).map(s => (
                <div key={s.code} className="flex items-center gap-1.5">
                  <span className={`w-3 h-3 rounded-sm ${s.color} print:border print:border-black`}></span>
                  <span className="text-slate-300 print:text-black">{s.code}</span>
                  <span className="font-normal opacity-60">({s.label})</span>
                </div>
              ))}
            </div>

            <div className="mt-24 grid grid-cols-2 gap-40 px-12 print:px-4">
              <div className="border-t border-slate-700 print:border-black pt-3 text-center">
                <p className="text-[10px] font-black uppercase text-slate-400 print:text-black">Assinatura do Encarregado</p>
              </div>
              <div className="border-t border-slate-700 print:border-black pt-3 text-center">
                <p className="text-[10px] font-black uppercase text-slate-400 print:text-black">Diretoria / Recursos Humanos</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: landscape; margin: 0.2cm; }
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background: white !important; color: black !important; }
          * { border-color: black !important; color: black !important; }
          .print-hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
};

export default ReportModal;