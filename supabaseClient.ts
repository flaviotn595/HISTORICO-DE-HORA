import { createClient } from '@supabase/supabase-js';

// Credentials provided by user (Fallback for quick deployment)
const PROVIDED_URL = 'https://hemskuneljzjcebgtjzn.supabase.co';
const PROVIDED_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlbXNrdW5lbGp6amNlYmd0anpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzODk0MTMsImV4cCI6MjA4MDk2NTQxM30.Lz31T8zID0rfa3KWr4OJILEp2WYcTXJt2WOBGnjRiNY';

// Safely retrieve environment variables to avoid "Cannot read properties of undefined"
// if import.meta.env is not defined in the current environment.
const getEnvVar = (key: string) => {
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch (e) {
    // Ignore errors
  }
  return undefined;
};

export const supabaseUrl = getEnvVar('VITE_SUPABASE_URL') || PROVIDED_URL;
export const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY') || PROVIDED_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);