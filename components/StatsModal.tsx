import React from 'react';

export interface StatItem {
  id: number;
  name: string;
  detail: string; // Ex: "3 Faltas" ou "Turno 2ª"
  highlight?: boolean;
}

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon: string;
  data: StatItem[];
}

const StatsModal: React.FC<StatsModalProps> = ({ isOpen, onClose, title, icon, data }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] backdrop-blur-sm p-4">
      <div className="bg-slate-800 rounded-xl w-full max-w-2xl border border-slate-600 shadow-2xl flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-4 md:p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/50 rounded-t-xl">
          <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-3">
            <span className="bg-slate-700 p-2 rounded-lg">{icon}</span> 
            <span className="truncate">{title}</span>
          </h2>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-slate-700/50 p-2 rounded-full transition-colors flex-shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Content - Scrollable List */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {data.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <p className="text-lg">Nenhum registro encontrado.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {data.map((item) => (
                <div 
                  key={item.id} 
                  className="flex items-center justify-between p-3 md:p-4 bg-slate-700/30 hover:bg-slate-700/50 rounded-lg border border-slate-700/50 transition-all"
                >
                  <div className="flex flex-col overflow-hidden">
                    <span className="font-semibold text-slate-200 text-sm md:text-lg truncate mr-2">{item.name}</span>
                  </div>
                  
                  <div className={`font-bold px-3 py-1 md:px-4 md:py-2 rounded-lg text-xs md:text-sm whitespace-nowrap ${
                    item.highlight 
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                      : 'bg-green-500/20 text-green-400 border border-green-500/30'
                  }`}>
                    {item.detail}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 bg-slate-800/50 rounded-b-xl flex justify-end">
          <button
            onClick={onClose}
            className="w-full md:w-auto py-2 px-6 rounded-lg bg-slate-700 text-white hover:bg-slate-600 transition-colors font-semibold"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatsModal;