import { Injectable } from '@angular/core';
import { MinutogramRepository } from '../../domain/repositories/minutogram.repository';
import { Minutogram } from '../../domain/models/minutogram.model';
import { ListParams, ListResult } from '../../domain/models/minutogram-summary.model';

const STORAGE_KEY = 'minutograma_deploy_v1';

/** Legacy adapter kept for offline/testing use. The app uses SupabaseAdapter in production. */
@Injectable()
export class LocalStorageAdapter extends MinutogramRepository {
  override async listSummary(_params: ListParams): Promise<ListResult> {
    const m = this._load();
    if (!m) return { data: [], total: 0 };
    return {
      data: [{
        id: m.id, project: m.deploymentInfo.project, sprint: m.deploymentInfo.sprint,
        version: m.deploymentInfo.version, responsible: m.deploymentInfo.responsible,
        date: m.deploymentInfo.date, description: m.deploymentInfo.description,
        createdAt: m.createdAt, updatedAt: m.updatedAt,
        phasesCount: m.phases.length, stepsCount: m.steps.length,
        prerequisitesCount: m.prerequisites.length,
      }],
      total: 1,
    };
  }

  override getById(_id: string): Promise<Minutogram | null> {
    return Promise.resolve(this._load());
  }

  override save(minutogram: Minutogram): Promise<void> {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(minutogram)); } catch { /* noop */ }
    return Promise.resolve();
  }

  override delete(_id: string): Promise<void> {
    localStorage.removeItem(STORAGE_KEY);
    return Promise.resolve();
  }

  private _load(): Minutogram | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Minutogram) : null;
    } catch { return null; }
  }
}
