export interface DeploymentInfo {
  id: string;
  project: string;
  sprint: string;
  version: string;
  responsible: string;
  date: string;
  description: string;
}

export function createEmptyDeploymentInfo(): DeploymentInfo {
  return {
    id: '',
    project: '',
    sprint: '',
    version: '',
    responsible: '',
    date: '',
    description: '',
  };
}
