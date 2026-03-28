import { Component, inject, computed } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import {
  CdkDragDrop,
  DragDropModule,
} from '@angular/cdk/drag-drop';
import { MinutogramaService } from '../../services/minutograma.service';
import { Prerequisite, PrerequisiteStatus } from '../../../../core/domain/models/prerequisite.model';
import { SettingsService } from '../../../../core/application/services/settings.service';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-prerequisites-table',
  standalone: true,
  imports: [
    NgClass,
    FormsModule,
    MatTableModule,
    MatInputModule,
    MatSelectModule,
    MatFormFieldModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    DragDropModule,
  ],
  templateUrl: './prerequisites-table.component.html',
  styleUrl: './prerequisites-table.component.scss',
})
export class PrerequisitesTableComponent {
  private readonly service = inject(MinutogramaService);
  private readonly dialog = inject(MatDialog);

  readonly prerequisites = computed(() => this.service.prerequisites());

  readonly displayedColumns = [
    'order',
    'category',
    'activity',
    'responsible',
    'status',
    'observations',
    'actions',
  ];

  readonly statusOptions: PrerequisiteStatus[] = [
    'Pendiente',
    'En progreso',
    'Completado',
  ];

  readonly responsibles = inject(SettingsService).responsibles;

  trackById(_: number, item: Prerequisite): string {
    return item.id;
  }

  updateField(id: string, field: keyof Prerequisite, value: string | PrerequisiteStatus): void {
    this.service.updatePrerequisite(id, { [field]: value } as Partial<Prerequisite>);
  }

  addRow(): void {
    this.service.addPrerequisite();
  }

  removeRow(id: string): void {
    const dialogRef = this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(
      ConfirmDialogComponent,
      {
        data: {
          title: 'Eliminar prerrequisito',
          message: '¿Estás seguro de que deseas eliminar este prerrequisito?',
        },
        width: '24rem',
      }
    );
    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.service.removePrerequisite(id);
      }
    });
  }

  drop(event: CdkDragDrop<Prerequisite[]>): void {
    if (event.previousIndex !== event.currentIndex) {
      this.service.movePrerequisite(event.previousIndex, event.currentIndex);
    }
  }

  getStatusClass(status: PrerequisiteStatus): string {
    switch (status) {
      case 'Completado': return 'status--completado';
      case 'En progreso': return 'status--en-progreso';
      default: return 'status--pendiente';
    }
  }
}
