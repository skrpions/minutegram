import { Injectable, computed, inject, signal } from '@angular/core';
import { v4 as uuidv4 } from 'uuid';
import { Minutogram, createEmptyMinutogram } from '../../../core/domain/models/minutogram.model';
import { SAMPLE_MINUTOGRAM } from '../../../core/domain/models/sample-data';
import { DeploymentInfo } from '../../../core/domain/models/deployment-info.model';
import { Prerequisite, PrerequisiteStatus } from '../../../core/domain/models/prerequisite.model';
import { Phase, PHASE_COLORS } from '../../../core/domain/models/phase.model';
import { MinutogramStep } from '../../../core/domain/models/minutogram-step.model';
import { SaveMinutogramUseCase } from '../../../core/application/use-cases/save-minutogram.use-case';
import { LoadMinutogramUseCase } from '../../../core/application/use-cases/load-minutogram.use-case';
import { ListMinutogramsUseCase } from '../../../core/application/use-cases/list-minutograms.use-case';
import { DeleteMinutogramUseCase } from '../../../core/application/use-cases/delete-minutogram.use-case';
import { ExportExcelUseCase } from '../../../core/application/use-cases/export-excel.use-case';
import { SettingsService } from '../../../core/application/services/settings.service';
import { MinutogramSummary } from '../../../core/domain/models/minutogram-summary.model';
import { calculateDuration, addMinutesToTime } from '../../../shared/utils/time.utils';

export const DASHBOARD_PAGE_SIZE = 12;

@Injectable({ providedIn: 'root' })
export class MinutogramaService {
  private readonly saveUseCase   = inject(SaveMinutogramUseCase);
  private readonly loadUseCase   = inject(LoadMinutogramUseCase);
  private readonly listUseCase   = inject(ListMinutogramsUseCase);
  private readonly deleteUseCase = inject(DeleteMinutogramUseCase);
  private readonly exportUseCase = inject(ExportExcelUseCase);
  private readonly settings      = inject(SettingsService);

  private readonly _minutogram   = signal<Minutogram>(createEmptyMinutogram());
  private readonly _summaries    = signal<MinutogramSummary[]>([]);
  private readonly _total        = signal(0);
  private readonly _page         = signal(0);
  private readonly _search       = signal('');
  private readonly _saving       = signal(false);
  private readonly _loading      = signal(false);

  readonly minutogram  = this._minutogram.asReadonly();
  readonly summaries   = this._summaries.asReadonly();
  readonly total       = this._total.asReadonly();
  readonly hasMore     = computed(() => this._summaries().length < this._total());
  readonly saving      = this._saving.asReadonly();
  readonly loading     = this._loading.asReadonly();
  readonly deploymentInfo = computed(() => this._minutogram().deploymentInfo);
  readonly prerequisites  = computed(() => this._minutogram().prerequisites);
  readonly phases         = computed(() => this._minutogram().phases ?? []);
  readonly steps          = computed(() => this._minutogram().steps);
  readonly totalDuration  = computed(() =>
    this._minutogram().steps.reduce((sum, s) => sum + (s.duration || 0), 0),
  );

  // ── Persistence ───────────────────────────────────────────────────────────────

  /** Reset to page 0 and load fresh (e.g. on search change or initial load) */
  async loadSummaries(search = ''): Promise<void> {
    this._search.set(search);
    this._page.set(0);
    this._summaries.set([]);
    this._loading.set(true);
    try {
      const result = await this.listUseCase.execute({
        page: 0, pageSize: DASHBOARD_PAGE_SIZE, search,
      });
      this._summaries.set(result.data);
      this._total.set(result.total);
    } finally {
      this._loading.set(false);
    }
  }

  /** Appends the next page to existing summaries */
  async loadMoreSummaries(): Promise<void> {
    if (!this.hasMore()) return;
    const nextPage = this._page() + 1;
    this._page.set(nextPage);
    this._loading.set(true);
    try {
      const result = await this.listUseCase.execute({
        page: nextPage, pageSize: DASHBOARD_PAGE_SIZE, search: this._search(),
      });
      this._summaries.update((prev) => [...prev, ...result.data]);
      this._total.set(result.total);
    } finally {
      this._loading.set(false);
    }
  }

  async loadById(id: string): Promise<void> {
    this._loading.set(true);
    try {
      const loaded = await this.loadUseCase.execute(id);
      if (loaded) {
        this._minutogram.set(this.normalizeMinutogram(loaded));
      }
    } finally {
      this._loading.set(false);
    }
  }

  async save(): Promise<void> {
    this._saving.set(true);
    try {
      await this.saveUseCase.execute(this._minutogram());
    } finally {
      this._saving.set(false);
    }
  }

  async createNew(): Promise<string> {
    const newId = uuidv4();

    // Remap SAMPLE_MINUTOGRAM to fresh UUIDs so there are no collisions
    const phaseIdMap = new Map<string, string>(
      SAMPLE_MINUTOGRAM.phases.map((p) => [p.id, uuidv4()]),
    );

    const phases: Phase[] = SAMPLE_MINUTOGRAM.phases.map((p) => ({
      ...p,
      id: phaseIdMap.get(p.id)!,
    }));

    const steps: MinutogramStep[] = SAMPLE_MINUTOGRAM.steps.map((s) => ({
      ...s,
      id: uuidv4(),
      phaseId: phaseIdMap.get(s.phaseId) ?? phases[0]?.id ?? '',
    }));

    const prerequisites: Prerequisite[] = SAMPLE_MINUTOGRAM.prerequisites.map((p) => ({
      ...p,
      id: uuidv4(),
    }));

    const newMinutogram: Minutogram = {
      id: newId,
      deploymentInfo: { ...SAMPLE_MINUTOGRAM.deploymentInfo, id: newId },
      prerequisites,
      phases,
      steps,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this._minutogram.set(newMinutogram);
    await this.saveUseCase.execute(newMinutogram);
    return newId;
  }

  /** Creates a full copy of an existing minutogram with fresh UUIDs. Does NOT change the current editor state. */
  async cloneMinutogram(id: string): Promise<string> {
    const original = await this.loadUseCase.execute(id);
    if (!original) throw new Error('Minutograma no encontrado');

    const newId = uuidv4();
    const phaseIdMap = new Map<string, string>(
      original.phases.map((p) => [p.id, uuidv4()]),
    );

    const cloned: Minutogram = {
      id: newId,
      deploymentInfo: {
        ...original.deploymentInfo,
        id: newId,
        project: `${original.deploymentInfo.project} (copia)`,
      },
      phases: original.phases.map((p) => ({ ...p, id: phaseIdMap.get(p.id)! })),
      steps: original.steps.map((s) => ({
        ...s,
        id: uuidv4(),
        phaseId: phaseIdMap.get(s.phaseId) ?? original.phases[0]?.id ?? '',
      })),
      prerequisites: original.prerequisites.map((p) => ({ ...p, id: uuidv4() })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.saveUseCase.execute(cloned);
    return newId;
  }

  async deleteMinutogram(id: string): Promise<void> {
    await this.deleteUseCase.execute(id);
    this._summaries.update((list) => list.filter((m) => m.id !== id));
    this._total.update((t) => Math.max(0, t - 1));
  }

  exportExcel(): void {
    this.exportUseCase.execute(this._minutogram());
  }

  // ── Deployment Info ───────────────────────────────────────────────────────────

  updateDeploymentInfo(info: DeploymentInfo): void {
    this._minutogram.update((m) => ({
      ...m,
      deploymentInfo: { ...info },
      updatedAt: new Date().toISOString(),
    }));
  }

  // ── Prerequisites ─────────────────────────────────────────────────────────────

  addPrerequisite(): void {
    this._minutogram.update((m) => {
      const newPrereq: Prerequisite = {
        id: uuidv4(),
        order: m.prerequisites.length + 1,
        category: '',
        activity: '',
        responsible: '',
        status: 'Pendiente' as PrerequisiteStatus,
        observations: '',
      };
      return { ...m, prerequisites: [...m.prerequisites, newPrereq], updatedAt: new Date().toISOString() };
    });
  }

  updatePrerequisite(id: string, changes: Partial<Prerequisite>): void {
    this._minutogram.update((m) => ({
      ...m,
      prerequisites: m.prerequisites.map((p) => (p.id === id ? { ...p, ...changes } : p)),
      updatedAt: new Date().toISOString(),
    }));
  }

  removePrerequisite(id: string): void {
    this._minutogram.update((m) => {
      const filtered = m.prerequisites
        .filter((p) => p.id !== id)
        .map((p, idx) => ({ ...p, order: idx + 1 }));
      return { ...m, prerequisites: filtered, updatedAt: new Date().toISOString() };
    });
  }

  movePrerequisite(from: number, to: number): void {
    this._minutogram.update((m) => {
      const items = [...m.prerequisites];
      const [moved] = items.splice(from, 1);
      items.splice(to, 0, moved);
      return { ...m, prerequisites: items.map((p, i) => ({ ...p, order: i + 1 })), updatedAt: new Date().toISOString() };
    });
  }

  // ── Phases ────────────────────────────────────────────────────────────────────

  addPhase(): void {
    this._minutogram.update((m) => {
      const phases = m.phases ?? [];
      const newPhase: Phase = {
        id: uuidv4(),
        name: `FASE ${phases.length + 1}`,
        color: PHASE_COLORS[phases.length % PHASE_COLORS.length],
        order: phases.length + 1,
      };
      return { ...m, phases: [...phases, newPhase], updatedAt: new Date().toISOString() };
    });
  }

  updatePhase(id: string, changes: Partial<Phase>): void {
    this._minutogram.update((m) => ({
      ...m,
      phases: (m.phases ?? []).map((p) => (p.id === id ? { ...p, ...changes } : p)),
      updatedAt: new Date().toISOString(),
    }));
  }

  removePhase(id: string): void {
    this._minutogram.update((m) => {
      const phases = (m.phases ?? []).filter((p) => p.id !== id).map((p, i) => ({ ...p, order: i + 1 }));
      const steps = m.steps.filter((s) => s.phaseId !== id).map((s, i) => ({ ...s, order: i + 1 }));
      return { ...m, phases, steps, updatedAt: new Date().toISOString() };
    });
  }

  movePhase(from: number, to: number): void {
    this._minutogram.update((m) => {
      const items = [...(m.phases ?? [])];
      const [moved] = items.splice(from, 1);
      items.splice(to, 0, moved);
      return { ...m, phases: items.map((p, i) => ({ ...p, order: i + 1 })), updatedAt: new Date().toISOString() };
    });
  }

  phaseDuration(phaseId: string): number {
    return this._minutogram().steps
      .filter((s) => s.phaseId === phaseId)
      .reduce((sum, s) => sum + (s.duration || 0), 0);
  }

  // ── Steps ─────────────────────────────────────────────────────────────────────

  addStep(phaseId: string): void {
    this._minutogram.update((m) => {
      const newStep: MinutogramStep = {
        id: uuidv4(),
        order: m.steps.length + 1,
        phaseId,
        activity: '',
        component: '',
        responsible: '',
        startTime: '',
        endTime: '',
        duration: 0,
        ticketId: '',
        observations: '',
      };
      return { ...m, steps: [...m.steps, newStep], updatedAt: new Date().toISOString() };
    });
  }

  updateStep(id: string, changes: Partial<MinutogramStep>): void {
    this._minutogram.update((m) => ({
      ...m,
      steps: m.steps.map((s) => {
        if (s.id !== id) return s;
        const updated = { ...s, ...changes };
        if (changes.startTime !== undefined || changes.endTime !== undefined) {
          updated.duration = calculateDuration(updated.startTime, updated.endTime);
        }
        return updated;
      }),
      updatedAt: new Date().toISOString(),
    }));
  }

  /**
   * Changes a step's start time → recalculates its endTime (start + duration),
   * then cascades startTime/endTime for all subsequent steps.
   */
  setStepStartTime(stepId: string, startTime: string): void {
    this._minutogram.update((mg) => {
      const newSteps = mg.steps.map((s) => ({ ...s }));
      const idx = newSteps.findIndex((s) => s.id === stepId);
      if (idx === -1) return mg;

      newSteps[idx].startTime = startTime;
      if (newSteps[idx].duration > 0) {
        newSteps[idx].endTime = addMinutesToTime(startTime, newSteps[idx].duration);
      }
      this._cascadeFrom(newSteps, idx + 1);
      return { ...mg, steps: newSteps, updatedAt: new Date().toISOString() };
    });
  }

  /**
   * Changes a step's end time → recalculates its duration (end - start),
   * then cascades startTime/endTime for all subsequent steps.
   */
  setStepEndTime(stepId: string, endTime: string): void {
    this._minutogram.update((mg) => {
      const newSteps = mg.steps.map((s) => ({ ...s }));
      const idx = newSteps.findIndex((s) => s.id === stepId);
      if (idx === -1) return mg;

      newSteps[idx].endTime = endTime;
      newSteps[idx].duration = calculateDuration(newSteps[idx].startTime, endTime);
      this._cascadeFrom(newSteps, idx + 1);
      return { ...mg, steps: newSteps, updatedAt: new Date().toISOString() };
    });
  }

  /**
   * Changes a step's duration → recalculates its endTime (start + duration),
   * then cascades startTime/endTime for all subsequent steps.
   */
  setStepDuration(stepId: string, durationMinutes: number): void {
    this._minutogram.update((mg) => {
      const newSteps = mg.steps.map((s) => ({ ...s }));
      const idx = newSteps.findIndex((s) => s.id === stepId);
      if (idx === -1) return mg;

      newSteps[idx].duration = durationMinutes;
      if (newSteps[idx].startTime) {
        newSteps[idx].endTime = addMinutesToTime(newSteps[idx].startTime, durationMinutes);
      }
      this._cascadeFrom(newSteps, idx + 1);
      return { ...mg, steps: newSteps, updatedAt: new Date().toISOString() };
    });
  }

  /** Propagates endTime → next startTime → next endTime from `fromIdx` onward. */
  private _cascadeFrom(steps: MinutogramStep[], fromIdx: number): void {
    for (let i = fromIdx; i < steps.length; i++) {
      steps[i].startTime = steps[i - 1].endTime;
      if (steps[i].duration > 0 && steps[i].startTime) {
        steps[i].endTime = addMinutesToTime(steps[i].startTime, steps[i].duration);
      }
    }
  }

  removeStep(id: string): void {
    this._minutogram.update((m) => {
      const filtered = m.steps.filter((s) => s.id !== id).map((s, i) => ({ ...s, order: i + 1 }));
      return { ...m, steps: filtered, updatedAt: new Date().toISOString() };
    });
  }

  moveStep(from: number, to: number): void {
    this._minutogram.update((m) => {
      const items = [...m.steps];
      const [moved] = items.splice(from, 1);
      items.splice(to, 0, moved);
      return { ...m, steps: items.map((s, i) => ({ ...s, order: i + 1 })), updatedAt: new Date().toISOString() };
    });
  }

  // ── Internal helpers ──────────────────────────────────────────────────────────

  private normalizeMinutogram(raw: Minutogram): Minutogram {
    let phases = raw.phases ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let rawSteps: any[] = raw.steps ?? [];

    const validPhaseIds = new Set(phases.map((p) => p.id));
    if (phases.length > 0) {
      const firstPhaseId = phases[0].id;
      rawSteps = rawSteps.map((s) => ({
        ...s,
        phaseId: validPhaseIds.has(s.phaseId) ? s.phaseId : firstPhaseId,
      }));
    }

    return {
      ...raw,
      phases,
      steps: rawSteps.map((s) => ({
        ...s,
        component: s.component ?? '',
        ticketId: s.ticketId ?? '',
        phaseId: s.phaseId ?? '',
      })),
    };
  }
}
