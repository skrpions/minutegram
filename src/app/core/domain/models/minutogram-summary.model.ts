export interface MinutogramSummary {
  id: string;
  project: string;
  sprint: string;
  version: string;
  responsible: string;
  date: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  phasesCount: number;
  stepsCount: number;
  prerequisitesCount: number;
}

export interface ListParams {
  page: number;
  pageSize: number;
  search: string;
}

export interface ListResult {
  data: MinutogramSummary[];
  total: number;
}
