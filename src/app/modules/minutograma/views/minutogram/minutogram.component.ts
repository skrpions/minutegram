import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DeploymentInfoFormComponent } from '../../components/deployment-info-form/deployment-info-form.component';
import { PrerequisitesTableComponent } from '../../components/prerequisites-table/prerequisites-table.component';
import { MinutogramaTableComponent } from '../../components/minutograma-table/minutograma-table.component';
import { MinutogramaService } from '../../services/minutograma.service';
import { AuthService } from '../../../../core/application/services/auth.service';
import { DeploymentInfo } from '../../../../core/domain/models/deployment-info.model';

@Component({
  selector: 'app-minutograma',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    DeploymentInfoFormComponent,
    PrerequisitesTableComponent,
    MinutogramaTableComponent,
  ],
  templateUrl: './minutogram.component.html',
  styleUrl: './minutogram.component.scss',
})
export class MinutogramaComponent implements OnInit {
  private readonly service  = inject(MinutogramaService);
  readonly auth             = inject(AuthService);
  private readonly route    = inject(ActivatedRoute);
  private readonly router   = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  readonly deploymentInfo  = this.service.deploymentInfo;
  readonly phases          = this.service.phases;
  readonly steps           = this.service.steps;
  readonly prerequisites   = this.service.prerequisites;
  readonly totalDuration   = this.service.totalDuration;
  readonly loading         = this.service.loading;
  readonly saving          = this.service.saving;
  readonly isAdmin         = this.auth.isAdmin;

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      await this.service.loadById(id);
    }
  }

  onInfoChange(info: DeploymentInfo): void {
    this.service.updateDeploymentInfo(info);
  }

  async save(): Promise<void> {
    try {
      await this.service.save();
      this.snackBar.open('✓  Minutograma guardado', 'OK', {
        duration: 3000,
        panelClass: 'snack-success',
      });
    } catch (err) {
      const isTimeout = err instanceof Error && err.message === 'SAVE_TIMEOUT';
      this.snackBar.open(
        isTimeout
          ? 'La sesión tardó en responder. Intenta guardar de nuevo.'
          : 'Error al guardar. Intenta de nuevo.',
        'OK',
        { duration: 5000 },
      );
    }
  }

  exportExcel(): void {
    this.service.exportExcel();
  }

  goBack(): void {
    this.router.navigate(['/minutograms']);
  }
}
