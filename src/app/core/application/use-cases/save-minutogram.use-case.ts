import { Injectable, inject } from '@angular/core';
import { MinutogramRepository } from '../../domain/repositories/minutogram.repository';
import { Minutogram } from '../../domain/models/minutogram.model';

@Injectable({ providedIn: 'root' })
export class SaveMinutogramUseCase {
  private readonly repository = inject(MinutogramRepository);

  execute(minutogram: Minutogram): Promise<void> {
    return this.repository.save({
      ...minutogram,
      updatedAt: new Date().toISOString(),
    });
  }
}
