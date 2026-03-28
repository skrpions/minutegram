import { DeploymentInfo, createEmptyDeploymentInfo } from './deployment-info.model';
import { Prerequisite } from './prerequisite.model';
import { Phase } from './phase.model';
import { MinutogramStep } from './minutogram-step.model';

export interface Minutogram {
  id: string;
  deploymentInfo: DeploymentInfo;
  prerequisites: Prerequisite[];
  phases: Phase[];
  steps: MinutogramStep[];
  createdAt: string;
  updatedAt: string;
}

export function createEmptyMinutogram(): Minutogram {
  return {
    id: '',
    deploymentInfo: createEmptyDeploymentInfo(),
    prerequisites: [],
    phases: [],
    steps: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
