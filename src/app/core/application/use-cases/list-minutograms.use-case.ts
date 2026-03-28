import { Injectable, inject } from '@angular/core';
import { MinutogramRepository } from '../../domain/repositories/minutogram.repository';
import { ListParams, ListResult } from '../../domain/models/minutogram-summary.model';

@Injectable({ providedIn: 'root' })
export class ListMinutogramsUseCase {
  private readonly repository = inject(MinutogramRepository);

  execute(params: ListParams): Promise<ListResult> {
    return this.repository.listSummary(params);
  }
}
