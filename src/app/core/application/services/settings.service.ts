import { Injectable, inject, signal } from '@angular/core';
import { SupabaseClientService } from '../../infrastructure/supabase/supabase-client.service';
import { RESPONSIBLES, COMPONENTS } from '../../domain/models/minutogram-step.model';
import { Phase } from '../../domain/models/phase.model';
import { SAMPLE_MINUTOGRAM } from '../../domain/models/sample-data';
import { v4 as uuidv4 } from 'uuid';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly supabase = inject(SupabaseClientService).client;

  /** Displayable responsible names, e.g. "Nestor Martínez - Frontend" */
  readonly responsibles = signal<string[]>([...RESPONSIBLES]);

  /** Component names for step component column */
  readonly components = signal<string[]>([...COMPONENTS]);

  /** Default phases for new minutograms */
  readonly phaseTemplates = signal<Omit<Phase, 'id'>[]>(
    SAMPLE_MINUTOGRAM.phases.map(({ id: _id, ...rest }) => rest),
  );

  async load(): Promise<void> {
    await Promise.all([
      this.loadResponsibles(),
      this.loadComponents(),
      this.loadPhaseTemplates(),
    ]);
  }

  private async loadResponsibles(): Promise<void> {
    const { data, error } = await this.supabase
      .from('responsibles')
      .select('display_name')
      .eq('active', true)
      .order('order');

    if (!error && data && data.length > 0) {
      this.responsibles.set(data.map((r) => r['display_name'] as string));
    }
  }

  private async loadComponents(): Promise<void> {
    const { data, error } = await this.supabase
      .from('components')
      .select('name')
      .eq('active', true)
      .order('order');

    if (!error && data && data.length > 0) {
      this.components.set(data.map((c) => c['name'] as string));
    }
  }

  private async loadPhaseTemplates(): Promise<void> {
    const { data, error } = await this.supabase
      .from('phase_templates')
      .select('name, color, order')
      .eq('active', true)
      .order('order');

    if (!error && data && data.length > 0) {
      this.phaseTemplates.set(
        data.map((t) => ({ name: t['name'], color: t['color'], order: t['order'] })),
      );
    }
  }

  /** Returns a fresh set of phases from templates (with new UUIDs) */
  buildDefaultPhases(): Phase[] {
    return this.phaseTemplates().map((t, i) => ({
      id: uuidv4(),
      name: t.name,
      color: t.color,
      order: i + 1,
    }));
  }
}
