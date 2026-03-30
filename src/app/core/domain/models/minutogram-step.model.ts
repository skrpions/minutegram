export const COMPONENTS = [
  'Onboarding Web',
  'Onboarding Ikigii',
  'Actualización de Datos',
  'Appian',
  'API Gateway',
  'Comunicación',
  'Infraestructura',
  'Jira',
  'Todos',
  'Towerbank'
] as const;

export const RESPONSIBLES = [
  'Nestor Martínez - Frontend',
  'Danier Vanegas - API Gateway',
  'Nidia Sua - PM / Tech Lead',
  'Daniel Acevedo - Infrastructure',
  'Laura Renda - Towerbank',
  'Cristian Gonzáles - Towerbank',
  'Robert Campos - Impera',
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
