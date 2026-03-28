import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MinutogramaService } from '../../services/minutograma.service';

@Component({
  selector: 'app-export-button',
  standalone: true,
  imports: [MatButtonModule, MatProgressSpinnerModule, MatIconModule],
  templateUrl: './export-button.component.html',
})
export class ExportButtonComponent {
  private readonly service = inject(MinutogramaService);
  readonly isExporting = signal(false);

  export(): void {
    this.isExporting.set(true);
    try {
      this.service.exportExcel();
    } finally {
      this.isExporting.set(false);
    }
  }
}
