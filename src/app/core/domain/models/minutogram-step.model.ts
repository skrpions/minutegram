export const COMPONENTS = [
  'Gateway',
  'Appian',
  'Comunicación',
  'Infraestructura',
  'Jira',
  'Onboarding Ikigii',
  'Onboarding Web',
  'Actualización de Datos',
  'Todos',
  'Towerbank'
] as const;

export const RESPONSIBLES = [
  'Nestor Martínez - Frontend',
  'Danier Vanegas - Gateway',
  'Daniel Acevedo - Infrastructure',
  'Nidia Sua - PM / Tech Lead',
  'Robert Campos - Impera',
  'Laura Renda - QA Towerbank',
  'Todos',
];

export interface MinutogramStep {
  id: string;
  order: number;
  phaseId: string;
  activity: string;
  component: string;
  responsible: string;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  duration: number;  // auto-calculated minutes
  ticketId: string;
  observations: string;
}
