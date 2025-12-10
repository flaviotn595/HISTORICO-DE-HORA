export interface Employee {
  id: number;
  name: string;
  shift: string;
  sector: string;
  role: string; // Campo novo para Cargo
}

export interface ScheduleEntry {
  employee_id: number;
  date: string; // YYYY-MM-DD
  status: string;
}

export interface StatusDefinition {
  code: string;
  label: string;
  color: string;
  textColor: string;
}

export interface DateContext {
  year: number;
  month: number; // 0-11
}