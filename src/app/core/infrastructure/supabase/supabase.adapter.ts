import { Injectable, inject } from '@angular/core';
import { MinutogramRepository } from '../../domain/repositories/minutogram.repository';
import { Minutogram } from '../../domain/models/minutogram.model';
import { Phase } from '../../domain/models/phase.model';
import { MinutogramStep } from '../../domain/models/minutogram-step.model';
import { Prerequisite } from '../../domain/models/prerequisite.model';
import { ListParams, ListResult, MinutogramSummary } from '../../domain/models/minutogram-summary.model';
import { SupabaseClientService } from './supabase-client.service';
import { AuthService } from '../../application/services/auth.service';

@Injectable()
export class SupabaseAdapter extends MinutogramRepository {
  private readonly supabase = inject(SupabaseClientService).client;
  private readonly auth = inject(AuthService);

  override async listSummary({ page, pageSize, search }: ListParams): Promise<ListResult> {
    const from = page * pageSize;
    const to   = from + pageSize - 1;

    let query = this.supabase
      .from('minutogram_summaries')
      .select('*', { count: 'exact' })
      .order('updated_at', { ascending: false })
      .range(from, to);

    if (search.trim()) {
      query = query.or(
        `project.ilike.%${search.trim()}%,sprint.ilike.%${search.trim()}%,version.ilike.%${search.trim()}%`,
      );
    }

    const { data, count, error } = await query;
    if (error) throw error;

    return {
      data: (data ?? []).map((row) => this.mapSummaryRow(row)),
      total: count ?? 0,
    };
  }

  override async getById(id: string): Promise<Minutogram | null> {
    const { data, error } = await this.supabase
      .from('minutograms')
      .select('*, phases(*), steps(*), prerequisites(*)')
      .eq('id', id)
      .single();

    if (error) return null;
    return this.mapRow(data);
  }

  /** Ensures the Supabase session is valid. Proactively refreshes if token expires within 5 min. */
  private async ensureAuthenticated(): Promise<void> {
    const { data: { session }, error } = await this.supabase.auth.getSession();
    if (error) throw error;
    if (!session) {
      const { error: refreshErr } = await this.supabase.auth.refreshSession();
      if (refreshErr) throw new Error('Sesión expirada. Por favor inicia sesión nuevamente.');
      return;
    }
    // Proactively refresh if the token expires within the next 5 minutes
    const expiresAt = (session.expires_at ?? 0) * 1000;
    if (expiresAt - Date.now() < 5 * 60 * 1000) {
      await this.supabase.auth.refreshSession();
    }
  }

  override async save(minutogram: Minutogram): Promise<void> {
    await this.ensureAuthenticated();
    const { deploymentInfo: d } = minutogram;
    const userId = this.auth.user()?.id;

    const { error: upsertErr } = await this.supabase.from('minutograms').upsert({
      id: minutogram.id,
      created_by: userId ?? null,
      project: d.project,
      sprint: d.sprint,
      version: d.version,
      responsible: d.responsible,
      date: d.date || null,
      description: d.description,
      updated_at: new Date().toISOString(),
    });
    if (upsertErr) throw upsertErr;

    const id = minutogram.id;

    await this.supabase.from('steps').delete().eq('minutogram_id', id);
    await this.supabase.from('prerequisites').delete().eq('minutogram_id', id);
    await this.supabase.from('phases').delete().eq('minutogram_id', id);

    if (minutogram.phases.length > 0) {
      const { error } = await this.supabase.from('phases').insert(
        minutogram.phases.map((p) => ({
          id: p.id, minutogram_id: id, name: p.name, color: p.color, order: p.order,
        })),
      );
      if (error) throw error;
    }

    if (minutogram.steps.length > 0) {
      const { error } = await this.supabase.from('steps').insert(
        minutogram.steps.map((s) => ({
          id: s.id, minutogram_id: id, phase_id: s.phaseId,
          order: s.order, activity: s.activity, component: s.component,
          responsible: s.responsible, start_time: s.startTime, end_time: s.endTime,
          duration: s.duration, ticket_id: s.ticketId, observations: s.observations,
        })),
      );
      if (error) throw error;
    }

    if (minutogram.prerequisites.length > 0) {
      const { error } = await this.supabase.from('prerequisites').insert(
        minutogram.prerequisites.map((p) => ({
          id: p.id, minutogram_id: id, order: p.order, category: p.category,
          activity: p.activity, responsible: p.responsible,
          status: p.status, observations: p.observations,
        })),
      );
      if (error) throw error;
    }
  }

  override async delete(id: string): Promise<void> {
    await this.ensureAuthenticated();
    const { error } = await this.supabase.from('minutograms').delete().eq('id', id);
    if (error) throw error;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapSummaryRow(row: any): MinutogramSummary {
    return {
      id: row.id,
      project: row.project,
      sprint: row.sprint,
      version: row.version,
      responsible: row.responsible,
      date: row.date ?? '',
      description: row.description ?? '',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      phasesCount: Number(row.phases_count ?? 0),
      stepsCount: Number(row.steps_count ?? 0),
      prerequisitesCount: Number(row.prerequisites_count ?? 0),
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapRow(row: any): Minutogram {
    const phases: Phase[] = (row.phases ?? [])
      .sort((a: any, b: any) => a.order - b.order)
      .map((p: any) => ({ id: p.id, name: p.name, color: p.color, order: p.order }));

    const steps: MinutogramStep[] = (row.steps ?? [])
      .sort((a: any, b: any) => a.order - b.order)
      .map((s: any) => ({
        id: s.id, order: s.order, phaseId: s.phase_id,
        activity: s.activity, component: s.component ?? '',
        responsible: s.responsible, startTime: s.start_time, endTime: s.end_time,
        duration: s.duration, ticketId: s.ticket_id ?? '', observations: s.observations,
      }));

    const prerequisites: Prerequisite[] = (row.prerequisites ?? [])
      .sort((a: any, b: any) => a.order - b.order)
      .map((p: any) => ({
        id: p.id, order: p.order, category: p.category,
        activity: p.activity, responsible: p.responsible,
        status: p.status, observations: p.observations,
      }));

    return {
      id: row.id,
      deploymentInfo: {
        id: row.id, project: row.project, sprint: row.sprint,
        version: row.version, responsible: row.responsible,
        date: row.date ?? '', description: row.description,
      },
      phases, steps, prerequisites,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
