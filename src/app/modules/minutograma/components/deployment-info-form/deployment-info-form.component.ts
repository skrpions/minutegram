import {
  Component,
  OnInit,
  OnChanges,
  SimpleChanges,
  inject,
  input,
  output,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DATE_FORMATS, MAT_DATE_LOCALE, provideNativeDateAdapter } from '@angular/material/core';
import { DeploymentInfo } from '../../../../core/domain/models/deployment-info.model';
import { SettingsService } from '../../../../core/application/services/settings.service';

const ES_DATE_FORMATS = {
  parse: {
    dateInput: { day: 'numeric', month: 'numeric', year: 'numeric' },
  },
  display: {
    dateInput: { day: '2-digit', month: '2-digit', year: 'numeric' } as Intl.DateTimeFormatOptions,
    monthYearLabel: { month: 'short', year: 'numeric' } as Intl.DateTimeFormatOptions,
    dateA11yLabel: { day: 'numeric', month: 'long', year: 'numeric' } as Intl.DateTimeFormatOptions,
    monthYearA11yLabel: { month: 'long', year: 'numeric' } as Intl.DateTimeFormatOptions,
  },
};

@Component({
  selector: 'app-deployment-info-form',
  standalone: true,
  providers: [
    provideNativeDateAdapter(),
    { provide: MAT_DATE_FORMATS, useValue: ES_DATE_FORMATS },
    { provide: MAT_DATE_LOCALE, useValue: 'es-ES' },
  ],
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
  ],
  templateUrl: './deployment-info-form.component.html',
  styleUrl: './deployment-info-form.component.scss',
})
export class DeploymentInfoFormComponent implements OnInit, OnChanges {
  private readonly fb = inject(FormBuilder);

  readonly initialData = input<DeploymentInfo | null>(null);
  readonly infoChange = output<DeploymentInfo>();

  readonly responsibles = inject(SettingsService).responsibles;

  form!: FormGroup;

  ngOnInit(): void {
    this.buildForm();

    this.form.valueChanges.subscribe(() => {
      if (this.form.valid || this.form.dirty) {
        this.infoChange.emit(this.buildOutput());
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialData'] && this.form) {
      const data = this.initialData();
      if (data) {
        this.form.patchValue({
          ...data,
          sprint: this.parseSprintNumber(data.sprint),
          responsible: this.parseResponsible(data.responsible),
          date: this.parseDate(data.date),
        }, { emitEvent: false });
      }
    }
  }

  private buildForm(): void {
    const data = this.initialData();
    this.form = this.fb.group({
      id:          [data?.id ?? ''],
      project:     [data?.project ?? '', Validators.required],
      sprint:      [this.parseSprintNumber(data?.sprint ?? '')],
      version:     [data?.version ?? ''],
      responsible: [this.parseResponsible(data?.responsible ?? '')],
      date:        [this.parseDate(data?.date ?? '')],
      description: [data?.description ?? ''],
    });
  }

  private buildOutput(): DeploymentInfo {
    const raw = this.form.getRawValue();
    const selected: string[] = Array.isArray(raw.responsible) ? raw.responsible : [];
    return {
      ...raw,
      sprint: raw.sprint ? String(raw.sprint) : '',
      responsible: selected.join(', '),
      date: this.toDateString(raw.date),
    };
  }

  /** Splits a comma-separated responsible string into an array for multi-select */
  private parseResponsible(value: string): string[] {
    if (!value) return [];
    return value.split(', ').map((s) => s.trim()).filter(Boolean);
  }

  /** Strips "Sprint " prefix if present, returning just the number string */
  private parseSprintNumber(sprint: string): string {
    if (!sprint) return '';
    return sprint.replace(/^sprint\s*/i, '').trim();
  }

  private parseDate(s: string): Date | null {
    if (!s) return null;
    const parts = s.split('-').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return null;
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  private toDateString(d: Date | null): string {
    if (!d || !(d instanceof Date) || isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
