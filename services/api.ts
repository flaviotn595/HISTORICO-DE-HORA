import { supabase } from '../supabaseClient';
import { Employee, ScheduleEntry } from '../types';

export const fetchEmployees = async (): Promise<Employee[]> => {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .order('name');
  
  if (error) {
    console.error('Error fetching employees:', error);
    return [];
  }
  return data || [];
};

export const createEmployee = async (employee: Omit<Employee, 'id'>): Promise<Employee | null> => {
  const { data, error } = await supabase
    .from('employees')
    .insert([employee])
    .select()
    .single();

  if (error) {
    console.error('Error creating employee:', error);
    return null;
  }
  return data;
};

export const deleteEmployee = async (id: number): Promise<boolean> => {
  const { error } = await supabase
    .from('employees')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting employee:', error);
    return false;
  }
  return true;
};

export const fetchSchedules = async (year: number, month: number): Promise<ScheduleEntry[]> => {
  // Ajuste fino nas datas de início e fim para a query
  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const { data, error } = await supabase
    .from('schedules')
    .select('employee_id, date, status')
    .gte('date', startDate)
    .lte('date', endDate);

  if (error) {
    console.error('Error fetching schedules:', error);
    return [];
  }
  return data || [];
};

export const upsertSchedule = async (entry: ScheduleEntry): Promise<boolean> => {
  const { error } = await supabase
    .from('schedules')
    .upsert(entry, { onConflict: 'employee_id, date' });

  if (error) {
    console.error('Error updating schedule:', error);
    return false;
  }
  return true;
};