import { Component, inject, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { MinutogramaService } from '../../services/minutograma.service';
import { Phase } from '../../../../core/domain/models/phase.model';
import { MinutogramStep } from '../../../../core/domain/models/minutogram-step.model';
import { SettingsService } from '../../../../core/application/services/settings.service';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { parseDurationString, formatDurationString } from '../../../../shared/utils/time.utils';

export type FlatRow =
  | { kind: 'phase'; data: Phase }
  | { kind: 'step'; data: MinutogramStep };

@Component({
  selector: 'app-minutograma-table',
  standalone: true,
  imports: [
    FormsModule,
    MatTableModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    DragDropModule,
  ],
  templateUrl: './minutograma-table.component.html',
  styleUrl: './minutograma-table.component.scss',
})
export class MinutogramaTableComponent {
  readonly service = inject(MinutogramaService);
  private readonly dialog = inject(MatDialog);
  private readonly settings = inject(SettingsService);

  readonly components   = this.settings.components;
  readonly responsibles = this.settings.responsibles;

  readonly displayedColumns = [
    'drag', 'activity', 'component', 'responsible',
    'startTime', 'duration', 'endTime',
    'observations', 'actions',
  ];

  readonly flatRows = computed<FlatRow[]>(() => {
    const phases = this.service.phases();
    const steps  = this.service.steps();
    const result: FlatRow[] = [];

    for (const phase of phases) {
      result.push({ kind: 'phase', data: phase });
      steps.filter((s) => s.phaseId === phase.id).forEach((s) => result.push({ kind: 'step', data: s }));
    }

    const assignedIds = new Set(phases.map((p) => p.id));
    const orphans = steps.filter((s) => !assignedIds.has(s.phaseId));
    if (orphans.length > 0) {
      result.push({ kind: 'phase', data: { id: '__orphan__', name: 'Sin Fase Asignada', color: '#64748b', order: 999 } });
      orphans.forEach((s) => result.push({ kind: 'step', data: s }));
    }

    return result;
  });

  readonly totalDuration = computed(() => this.service.totalDuration());
  readonly isPhaseRow = (_: number, row: FlatRow) => row.kind === 'phase';
  readonly isStepRow  = (_: number, row: FlatRow) => row.kind === 'step';

  // ── Phase helpers ─────────────────────────────────────────────────────────

  phaseDuration(phaseId: string): string {
    return formatDurationString(this.service.phaseDuration(phaseId));
  }

  phaseStepCount(phaseId: string): number {
    return this.service.steps().filter((s) => s.phaseId === phaseId).length;
  }

  updatePhaseName(id: string, value: string): void { this.service.updatePhase(id, { name: value }); }
  updatePhaseColor(id: string, color: string): void { this.service.updatePhase(id, { color }); }
  addPhase(): void { this.service.addPhase(); }

  removePhase(id: string): void {
    const stepCount = this.phaseStepCount(id);
    this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, {
      data: {
        title: 'Eliminar fase',
        message: stepCount > 0
          ? `Esta fase contiene ${stepCount} paso(s). ¿Eliminar la fase y todos sus pasos?`
          : '¿Estás seguro de que deseas eliminar esta fase?',
      },
      width: '24rem',
    }).afterClosed().subscribe((ok) => { if (ok) this.service.removePhase(id); });
  }

  addStepToPhase(phaseId: string): void { this.service.addStep(phaseId); }

  assignOrphanStepsToPhase(phaseId: string): void {
    const assignedIds = new Set(this.service.phases().map((p) => p.id));
    this.service.steps()
      .filter((s) => !assignedIds.has(s.phaseId))
      .forEach((s) => this.service.updateStep(s.id, { phaseId }));
  }

  // ── Step helpers ──────────────────────────────────────────────────────────

  trackByKind(_: number, row: FlatRow): string {
    return row.kind === 'phase' ? `phase-${row.data.id}` : `step-${row.data.id}`;
  }

  updateField(id: string, field: keyof MinutogramStep, value: string | boolean | number): void {
    this.service.updateStep(id, { [field]: value } as Partial<MinutogramStep>);
  }

  removeRow(id: string): void {
    this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, {
      data: { title: 'Eliminar paso', message: '¿Estás seguro de que deseas eliminar este paso del minutograma?' },
      width: '24rem',
    }).afterClosed().subscribe((ok) => { if (ok) this.service.removeStep(id); });
  }

  drop(event: CdkDragDrop<FlatRow[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    const flat = this.flatRows();
    const dragged = flat[event.previousIndex];
    if (dragged?.kind !== 'step') return;

    let targetFlatIdx = event.currentIndex;
    while (targetFlatIdx < flat.length && flat[targetFlatIdx].kind === 'phase') targetFlatIdx++;
    const target = flat[Math.min(targetFlatIdx, flat.length - 1)];
    if (!target || target.kind !== 'step') return;

    const steps = this.service.steps();
    const prevIdx = steps.findIndex((s) => s.id === dragged.data.id);
    const currIdx = steps.findIndex((s) => s.id === target.data.id);
    if (prevIdx !== -1 && currIdx !== -1 && prevIdx !== currIdx) {
      if (dragged.data.phaseId !== target.data.phaseId) {
        this.service.updateStep(dragged.data.id, { phaseId: target.data.phaseId });
      }
      this.service.moveStep(prevIdx, currIdx);
    }
  }

  // ── Time / Duration helpers ────────────────────────────────────────────────

  /** Formats minutes → "1h 30m" for display in the duration input. */
  formatDuration(minutes: number): string {
    return formatDurationString(minutes);
  }

  /** Formats total duration for the summary bar. */
  totalDurationFormatted(): string {
    return formatDurationString(this.totalDuration());
  }

  /** User edits Inicio → recalculate Fin, cascade. */
  onStartTimeChange(stepId: string, value: string): void {
    this.service.setStepStartTime(stepId, value);
  }

  /** User edits Fin → recalculate Duración, cascade. */
  onEndTimeChange(stepId: string, value: string): void {
    this.service.setStepEndTime(stepId, value);
  }

  /** User edits Duración (text) → recalculate Fin, cascade. */
  onDurationInput(stepId: string, raw: string): void {
    const mins = parseDurationString(raw);
    if (mins > 0) this.service.setStepDuration(stepId, mins);
  }
}
