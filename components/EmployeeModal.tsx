import React, { useState } from 'react';

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, shift: string, sector: string, role: string) => void;
  isLoading: boolean;
}

const EmployeeModal: React.FC<EmployeeModalProps> = ({ isOpen, onClose, onSave, isLoading }) => {
  const [name, setName] = useState('');
  const [shift, setShift] = useState('2ª');
  const [sector, setSector] = useState('RECEBIMENTO');
  const [role, setRole] = useState('Operador');

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSave(name, shift, sector, role);
    setName('');
    setShift('2ª');
    setRole('Operador');
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-slate-800 p-8 rounded-xl w-[90%] max-w-md border border-slate-600 shadow-2xl">
        <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-2">
          <span>➕</span> Novo Funcionário
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-slate-300 mb-1 text-sm font-medium">Nome Completo</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-green-500 outline-none"
              placeholder="Digite o nome..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 mb-1 text-sm font-medium">Turno</label>
              <select
                value={shift}
                onChange={(e) => setShift(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-green-500 outline-none"
              >
                <option value="1ª">1ª Turno</option>
                <option value="2ª">2ª Turno</option>
                <option value="3ª">3ª Turno</option>
                <option value="4ª">4ª Turno</option>
                <option value="ADM">Administrativo</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 mb-1 text-sm font-medium">Cargo</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-green-500 outline-none"
              >
                <option value="Operador">Operador</option>
                <option value="Conferente">Conferente</option>
                <option value="Assistente">Assistente</option>
                <option value="Supervisor">Supervisor</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 mb-1 text-sm font-medium">Setor</label>
            <input
              type="text"
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-green-500 outline-none"
              placeholder="Ex: RECEBIMENTO"
            />
          </div>
        </div>

        <div className="flex gap-4 mt-8">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors font-semibold"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex-1 py-3 px-4 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors font-semibold disabled:opacity-50"
          >
            {isLoading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmployeeModal;