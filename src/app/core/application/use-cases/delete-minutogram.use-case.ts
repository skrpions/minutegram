import { Injectable, inject } from '@angular/core';
import { MinutogramRepository } from '../../domain/repositories/minutogram.repository';

@Injectable({ providedIn: 'root' })
export class DeleteMinutogramUseCase {
  private readonly repository = inject(MinutogramRepository);

  execute(id: string): Promise<void> {
    return this.repository.delete(id);
  }
}
