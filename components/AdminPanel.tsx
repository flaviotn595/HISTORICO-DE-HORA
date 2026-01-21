import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

interface AdminPanelProps {
    onBack: () => void;
    supervisorId: number;
}

export default function AdminPanel({ onBack, supervisorId }: AdminPanelProps) {
    // Estado para criar supervisor
    const [newEmail, setNewEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newName, setNewName] = useState('');
    const [createLoading, setCreateLoading] = useState(false);
    const [createMessage, setCreateMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Estado para migração
    const [migrateLoading, setMigrateLoading] = useState(false);
    const [migrateMessage, setMigrateMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleCreateSupervisor = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateLoading(true);
        setCreateMessage(null);

        try {
            const { data, error } = await supabase.rpc('create_supervisor_simple', {
                p_email: newEmail,
                p_password: newPassword,
                p_name: newName || newEmail.split('@')[0]
            });

            if (error) throw error;

            setCreateMessage({ type: 'success', text: `Supervisor criado com ID: ${data}` });
            setNewEmail('');
            setNewPassword('');
            setNewName('');
        } catch (err: any) {
            setCreateMessage({ type: 'error', text: err.message || 'Erro ao criar supervisor' });
        } finally {
            setCreateLoading(false);
        }
    };

    const handleMigrate = async () => {
        if (!confirm('Vincular TODOS os dados antigos (sem dono) à sua conta?')) return;

        setMigrateLoading(true);
        setMigrateMessage(null);

        try {
            const { data, error } = await supabase.rpc('migrate_old_data', {
                p_supervisor_id: supervisorId
            });

            if (error) throw error;
            setMigrateMessage({ type: 'success', text: data || 'Migração concluída!' });
        } catch (err: any) {
            setMigrateMessage({ type: 'error', text: err.message });
        } finally {
            setMigrateLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 p-4 md:p-8">
            <div className="max-w-2xl mx-auto bg-slate-800 rounded-2xl shadow-xl border border-slate-700 p-6 md:p-8">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-2xl font-black text-white flex items-center gap-2">
                        <span className="text-3xl">🛡️</span> Painel Administrativo
                    </h1>
                    <button
                        onClick={onBack}
                        className="text-slate-400 hover:text-white transition-colors"
                    >
                        Voltar ao Dashboard
                    </button>
                </div>

                {/* Seção: Criar Novo Supervisor */}
                <div className="bg-slate-700/30 rounded-xl p-6 mb-8 border border-slate-600/50">
                    <h2 className="text-xl font-bold text-green-400 mb-4">Novo Supervisor</h2>
                    <form onSubmit={handleCreateSupervisor} className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-slate-300 text-sm font-bold mb-2">Email</label>
                                <input
                                    type="email"
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-green-500 outline-none"
                                    placeholder="supervisor@empresa.com"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-slate-300 text-sm font-bold mb-2">Senha</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-green-500 outline-none"
                                    placeholder="••••••••"
                                    required
                                    minLength={4}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-slate-300 text-sm font-bold mb-2">Nome (opcional)</label>
                            <input
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-green-500 outline-none"
                                placeholder="Nome do supervisor"
                            />
                        </div>

                        {createMessage && (
                            <div className={`p-4 rounded-lg text-sm font-bold ${createMessage.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                {createMessage.text}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={createLoading}
                            className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50"
                        >
                            {createLoading ? 'Criando...' : 'Criar Supervisor'}
                        </button>
                    </form>
                </div>

                {/* Seção: Migração de Dados */}
                <div className="bg-slate-700/30 rounded-xl p-6 mb-8 border border-slate-600/50">
                    <h2 className="text-xl font-bold text-yellow-400 mb-4">⚠️ Migração de Dados Antigos</h2>
                    <p className="text-slate-400 text-sm mb-6">
                        Vincule todos os dados antigos (funcionários e escalas sem dono) à sua conta atual.
                    </p>

                    {migrateMessage && (
                        <div className={`p-4 rounded-lg text-sm font-bold mb-4 ${migrateMessage.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                            {migrateMessage.text}
                        </div>
                    )}

                    <button
                        onClick={handleMigrate}
                        disabled={migrateLoading}
                        className="w-full bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50"
                    >
                        {migrateLoading ? 'Migrando...' : 'Vincular Dados Antigos à Minha Conta'}
                    </button>
                </div>

                <div className="text-center text-slate-500 text-xs">
                    Seu ID de supervisor: {supervisorId}
                </div>
            </div>
        </div>
    );
}
