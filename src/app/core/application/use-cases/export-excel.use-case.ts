import { Injectable, inject } from '@angular/core';
import { ExcelExportAdapter } from '../../infrastructure/excel/excel-export.adapter';
import { Minutogram } from '../../domain/models/minutogram.model';

@Injectable({ providedIn: 'root' })
export class ExportExcelUseCase {
  private readonly excelAdapter = inject(ExcelExportAdapter);

  execute(minutogram: Minutogram): void {
    this.excelAdapter.export(minutogram);
  }
}
