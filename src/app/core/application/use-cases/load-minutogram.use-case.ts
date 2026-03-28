import { Injectable, inject } from '@angular/core';
import { MinutogramRepository } from '../../domain/repositories/minutogram.repository';
import { Minutogram } from '../../domain/models/minutogram.model';

@Injectable({ providedIn: 'root' })
export class LoadMinutogramUseCase {
  private readonly repository = inject(MinutogramRepository);

  execute(id: string): Promise<Minutogram | null> {
    return this.repository.getById(id);
  }
}
