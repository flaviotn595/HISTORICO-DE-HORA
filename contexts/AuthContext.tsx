import React, { createContext, useContext, useEffect, useState } from 'react';
import { Supervisor } from '../types';
import { supabase } from '../supabaseClient';

interface AuthContextType {
    supervisor: Supervisor | null;
    signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    signOut: () => void;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    supervisor: null,
    signIn: async () => ({ success: false }),
    signOut: () => { },
    loading: true,
});

const STORAGE_KEY = 'escala_supervisor';

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [supervisor, setSupervisor] = useState<Supervisor | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Recupera sessão salva no localStorage
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                setSupervisor(JSON.parse(saved));
            } catch {
                localStorage.removeItem(STORAGE_KEY);
            }
        }
        setLoading(false);
    }, []);

    const signIn = async (email: string, password: string) => {
        try {
            const { data, error } = await supabase.rpc('check_supervisor_login', {
                p_email: email,
                p_password: password
            });

            if (error) throw error;

            if (data && data.length > 0) {
                const user: Supervisor = {
                    id: data[0].id,
                    email: data[0].email,
                    name: data[0].name
                };
                setSupervisor(user);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
                return { success: true };
            } else {
                return { success: false, error: 'Email ou senha incorretos' };
            }
        } catch (err: any) {
            return { success: false, error: err.message || 'Erro ao fazer login' };
        }
    };

    const signOut = () => {
        setSupervisor(null);
        localStorage.removeItem(STORAGE_KEY);
    };

    return (
        <AuthContext.Provider value={{ supervisor, signIn, signOut, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
