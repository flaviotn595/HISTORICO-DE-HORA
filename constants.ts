import { StatusDefinition } from './types';

export const STATUS_LIST: StatusDefinition[] = [
  { code: '', label: '-', color: 'bg-transparent', textColor: 'text-gray-400' },
  { code: 'P', label: 'Presente', color: 'bg-green-500', textColor: 'text-white' },
  { code: 'F', label: 'Férias', color: 'bg-yellow-400', textColor: 'text-black' },
  { code: 'BH', label: 'Banco de Horas', color: 'bg-orange-500', textColor: 'text-white' },
  { code: 'X', label: 'Falta', color: 'bg-red-500', textColor: 'text-white' },
  { code: 'FF', label: 'Folga Feriado', color: 'bg-lime-500', textColor: 'text-black' },
  { code: 'DT', label: 'Dom. Trabalhado', color: 'bg-blue-500', textColor: 'text-white' },
  { code: 'FT', label: 'Fer. Trabalhado', color: 'bg-purple-600', textColor: 'text-white' },
  { code: 'A', label: 'Atestado', color: 'bg-cyan-500', textColor: 'text-white' },
  { code: 'FER', label: 'Feriado', color: 'bg-pink-500', textColor: 'text-white' },
  { code: 'DOM', label: 'Domingo', color: 'bg-purple-800', textColor: 'text-white' }
];

export const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const WEEK_DAYS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];