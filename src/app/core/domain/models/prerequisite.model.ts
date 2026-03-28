export type PrerequisiteStatus = 'Pendiente' | 'En progreso' | 'Completado';

export interface Prerequisite {
  id: string;
  order: number;
  category: string;
  activity: string;
  responsible: string;
  status: PrerequisiteStatus;
  observations: string;
}
