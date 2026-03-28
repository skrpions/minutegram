import { Minutogram } from '../models/minutogram.model';
import { ListParams, ListResult } from '../models/minutogram-summary.model';

export abstract class MinutogramRepository {
  abstract listSummary(params: ListParams): Promise<ListResult>;
  abstract getById(id: string): Promise<Minutogram | null>;
  abstract save(minutogram: Minutogram): Promise<void>;
  abstract delete(id: string): Promise<void>;
}
