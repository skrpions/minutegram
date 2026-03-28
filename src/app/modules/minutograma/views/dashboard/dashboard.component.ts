import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MinutogramaService } from '../../services/minutograma.service';
import { AuthService } from '../../../../core/application/services/auth.service';
import { MinutogramSummary } from '../../../../core/domain/models/minutogram-summary.model';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private readonly service  = inject(MinutogramaService);
  readonly auth             = inject(AuthService);
  private readonly router   = inject(Router);
  private readonly dialog   = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly summaries = this.service.summaries;
  readonly total     = this.service.total;
  readonly hasMore   = this.service.hasMore;
  readonly loading   = this.service.loading;
  readonly creating  = signal(false);
  readonly cloningIds = signal<Set<string>>(new Set());

  search = '';
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  async ngOnInit(): Promise<void> {
    await this.service.loadSummaries();
  }

  onSearch(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.service.loadSummaries(this.search), 300);
  }

  clearSearch(): void {
    this.search = '';
    this.service.loadSummaries('');
  }

  open(id: string): void {
    this.router.navigate(['/minutograms', id]);
  }

  async loadMore(): Promise<void> {
    await this.service.loadMoreSummaries();
  }

  async createNew(): Promise<void> {
    this.creating.set(true);
    try {
      const id = await this.service.createNew();
      this.router.navigate(['/minutograms', id]);
    } catch {
      this.snackBar.open('Error al crear el minutograma', 'OK', { duration: 3000 });
    } finally {
      this.creating.set(false);
    }
  }

  async clone(m: MinutogramSummary, event: Event): Promise<void> {
    event.stopPropagation();
    this.cloningIds.update((s) => new Set(s).add(m.id));
    try {
      await this.service.cloneMinutogram(m.id);
      await this.service.loadSummaries(this.search);
      this.snackBar.open(`"${m.project || 'Minutograma'}" clonado correctamente`, 'OK', { duration: 3000, panelClass: 'snack-success' });
    } catch {
      this.snackBar.open('Error al clonar el minutograma', 'OK', { duration: 3000 });
    } finally {
      this.cloningIds.update((s) => { const ns = new Set(s); ns.delete(m.id); return ns; });
    }
  }

  confirmDelete(m: MinutogramSummary, event: Event): void {
    event.stopPropagation();
    const data: ConfirmDialogData = {
      title: 'Eliminar minutograma',
      message: `¿Eliminar "${m.project || 'Sin nombre'}"? Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
    };
    this.dialog
      .open(ConfirmDialogComponent, { data, width: '400px' })
      .afterClosed()
      .subscribe(async (confirmed) => {
        if (!confirmed) return;
        await this.service.deleteMinutogram(m.id);
        this.snackBar.open('Minutograma eliminado', 'OK', { duration: 3000 });
      });
  }

  logout(): void {
    this.auth.logout();
  }

  initials(email: string): string {
    return email ? email.substring(0, 2).toUpperCase() : '??';
  }
}
