import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx-js-style';
import { Minutogram } from '../../domain/models/minutogram.model';

// ── Brand palette ─────────────────────────────────────────────────────────────
const WHITE      = 'FFFFFF';
const GRAY_LIGHT = 'F1F5F9';
const GRAY_MID   = 'E2E8F0';
const HEADER_BG  = '004066';   // brand teal dark → column headers
const HEADER_FG  = 'FFFFFF';   // white text

const PHASE_COLORS: Record<string, string> = {
  '#004066': '004066',
  '#065f46': '065F46',
  '#5b21b6': '5B21B6',
  '#b45309': 'B45309',
  '#be185d': 'BE185D',
  '#0369a1': '0369A1',
  '#374151': '374151',
};

const PHASE_COLORS_LIGHT: Record<string, string> = {
  '004066': 'D0E8F2',
  '065F46': 'D1FAE5',
  '5B21B6': 'EDE9FE',
  'B45309': 'FEF3C7',
  'BE185D': 'FCE7F3',
  '0369A1': 'E0F2FE',
  '374151': 'E5E7EB',
};

function phaseHex(color: string): string {
  return PHASE_COLORS[color.toLowerCase()] ?? HEADER_BG;
}

function phaseHexLight(color: string): string {
  const dark = phaseHex(color).toUpperCase();
  return PHASE_COLORS_LIGHT[dark] ?? 'E8F4F8';
}

type CellStyle = {
  font?: object;
  fill?: object;
  alignment?: object;
  border?: object;
};

function headerStyle(): CellStyle {
  return {
    font: { bold: true, color: { rgb: HEADER_FG }, sz: 12, name: 'Times New Roman' },
    fill: { fgColor: { rgb: HEADER_BG }, patternType: 'solid' },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: {
      top:    { style: 'thin', color: { rgb: GRAY_MID } },
      bottom: { style: 'thin', color: { rgb: GRAY_MID } },
      left:   { style: 'thin', color: { rgb: GRAY_MID } },
      right:  { style: 'thin', color: { rgb: GRAY_MID } },
    },
  };
}

function infoLabelStyle(): CellStyle {
  return {
    font: { bold: true, color: { rgb: HEADER_FG }, sz: 12, name: 'Times New Roman' },
    fill: { fgColor: { rgb: HEADER_BG }, patternType: 'solid' },
    alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
    border: {
      top:    { style: 'thin', color: { rgb: GRAY_MID } },
      bottom: { style: 'thin', color: { rgb: GRAY_MID } },
      left:   { style: 'thin', color: { rgb: GRAY_MID } },
      right:  { style: 'thin', color: { rgb: GRAY_MID } },
    },
  };
}

function phaseRowStyle(lightHex: string, darkHex: string): CellStyle {
  return {
    font: { bold: true, color: { rgb: '1A202C' }, sz: 12, name: 'Times New Roman' },
    fill: { fgColor: { rgb: lightHex }, patternType: 'solid' },
    alignment: { horizontal: 'left', vertical: 'center', wrapText: false },
    border: {
      top:    { style: 'medium', color: { rgb: darkHex } },
      bottom: { style: 'medium', color: { rgb: darkHex } },
    },
  };
}

function cellStyle(bg?: string, bold = false, center = false): CellStyle {
  return {
    font: { sz: 12, bold, name: 'Times New Roman', color: { rgb: '1A202C' } },
    fill: { fgColor: { rgb: bg ?? GRAY_LIGHT }, patternType: 'solid' },
    alignment: { horizontal: center ? 'center' : 'left', vertical: 'center', wrapText: true },
    border: {
      top:    { style: 'hair', color: { rgb: GRAY_MID } },
      bottom: { style: 'hair', color: { rgb: GRAY_MID } },
      left:   { style: 'hair', color: { rgb: GRAY_MID } },
      right:  { style: 'hair', color: { rgb: GRAY_MID } },
    },
  };
}

function statusStyle(status: string): CellStyle {
  const configs: Record<string, { bg: string; fg: string }> = {
    'Completado':  { bg: 'DCFCE7', fg: '166534' },
    'En progreso': { bg: 'FEF3C7', fg: '92400E' },
    'En Progreso': { bg: 'FEF3C7', fg: '92400E' },
    'Pendiente':   { bg: 'F1F5F9', fg: '475569' },
  };
  const cfg = configs[status] ?? configs['Pendiente'];
  return {
    font: { sz: 12, bold: true, name: 'Times New Roman', color: { rgb: cfg.fg } },
    fill: { fgColor: { rgb: cfg.bg }, patternType: 'solid' },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top:    { style: 'hair', color: { rgb: GRAY_MID } },
      bottom: { style: 'hair', color: { rgb: GRAY_MID } },
      left:   { style: 'hair', color: { rgb: GRAY_MID } },
      right:  { style: 'hair', color: { rgb: GRAY_MID } },
    },
  };
}

const URL_REGEX = /https?:\/\/[^\s]+/;

function linkCellStyle(bg?: string): CellStyle {
  return {
    font: { sz: 12, name: 'Times New Roman', color: { rgb: '0563C1' }, underline: true },
    fill: { fgColor: { rgb: bg ?? GRAY_LIGHT }, patternType: 'solid' },
    alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
    border: {
      top:    { style: 'hair', color: { rgb: GRAY_MID } },
      bottom: { style: 'hair', color: { rgb: GRAY_MID } },
      left:   { style: 'hair', color: { rgb: GRAY_MID } },
      right:  { style: 'hair', color: { rgb: GRAY_MID } },
    },
  };
}

function setCell(ws: XLSX.WorkSheet, r: number, c: number, v: unknown, s: CellStyle): void {
  const ref = XLSX.utils.encode_cell({ r, c });
  ws[ref] = { v, s };
}

function setCellObservation(ws: XLSX.WorkSheet, r: number, c: number, v: unknown, bg: string): void {
  const ref = XLSX.utils.encode_cell({ r, c });
  const url = typeof v === 'string' ? v.match(URL_REGEX)?.[0] : null;
  const s = url ? linkCellStyle(bg) : cellStyle(bg);
  ws[ref] = url ? { v, l: { Target: url }, s, t: 's' } : { v, s };
}

@Injectable({ providedIn: 'root' })
export class ExcelExportAdapter {
  export(minutogram: Minutogram): void {
    const workbook = XLSX.utils.book_new();
    this.buildInfoSheet(workbook, minutogram);       // Sheet 1: Información
    this.buildPrereqSheet(workbook, minutogram);     // Sheet 2: Prerrequisitos
    this.buildStepsSheet(workbook, minutogram);      // Sheet 3: Minutograma
    XLSX.writeFile(workbook, 'minutograma-despliegue.xlsx');
  }

  // ── Sheet 1: Información del Despliegue ──────────────────────────────────────
  private buildInfoSheet(wb: XLSX.WorkBook, m: Minutogram): void {
    const ws: XLSX.WorkSheet = {};
    const info = m.deploymentInfo;

    const infoRows: [string, string][] = [
      ['Proyecto',             info.project],
      ['Sprint',               info.sprint.replace(/^sprint\s*/i, '').trim()],
      ['Versión',              info.version],
      ['Resposables',          info.responsible],
      ['Fecha de Despliegue',  info.date],
      ['Descripción',          info.description],
      ['Total Pasos',          String(m.steps.length)],
      ['Duración Total (min)', String(m.steps.reduce((s, x) => s + (x.duration || 0), 0))],
    ];

    infoRows.forEach(([label, value], i) => {
      setCell(ws, i, 0, label, infoLabelStyle());
      setCell(ws, i, 1, value, cellStyle(WHITE));
    });

    ws['!cols'] = [{ wch: 24 }, { wch: 60 }];
    ws['!rows'] = [{ hpx: 24 }];
    ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: infoRows.length - 1, c: 1 } });
    ws['!pageSetup'] = { orientation: 'portrait' };
    XLSX.utils.book_append_sheet(wb, ws, 'Información');
  }

  // ── Sheet 2: Prerrequisitos ──────────────────────────────────────────────────
  private buildPrereqSheet(wb: XLSX.WorkBook, m: Minutogram): void {
    const ws: XLSX.WorkSheet = {};
    const NUM_COLS = 6;

    const headers = ['#', 'Categoría', 'Actividad', 'Responsable', 'Estado', 'Observaciones'];
    headers.forEach((h, c) => setCell(ws, 0, c, h, headerStyle()));

    m.prerequisites.forEach((p, i) => {
      const r = 1 + i;
      const bg = i % 2 === 0 ? WHITE : 'F8FAFC';
      setCell(ws, r, 0, p.order,        cellStyle(bg, false, true));
      setCell(ws, r, 1, p.category,     cellStyle(bg));
      setCell(ws, r, 2, p.activity,     cellStyle(bg));
      setCell(ws, r, 3, p.responsible,  cellStyle(bg));
      setCell(ws, r, 4, p.status,       statusStyle(p.status));
      setCellObservation(ws, r, 5, p.observations, bg);
    });

    const lastRow = m.prerequisites.length;
    ws['!cols'] = [
      { wch: 5 }, { wch: 20 }, { wch: 45 },
      { wch: 22 }, { wch: 14 }, { wch: 45 },
    ];
    ws['!rows'] = [{ hpx: 24 }];
    ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: lastRow, c: NUM_COLS - 1 } });
    ws['!pageSetup'] = { orientation: 'landscape' };
    XLSX.utils.book_append_sheet(wb, ws, 'Prerrequisitos');
  }

  // ── Sheet 3: Minutograma ─────────────────────────────────────────────────────
  private buildStepsSheet(wb: XLSX.WorkBook, m: Minutogram): void {
    const ws: XLSX.WorkSheet = {};
    const cols = ['#', 'Actividad', 'Componente', 'Responsable',
      'Hora Inicio', 'Hora Fin', 'Dur. (min)', 'Notas / Observaciones'];

    cols.forEach((h, c) => setCell(ws, 0, c, h, headerStyle()));

    let rowIdx = 1;
    const phases = m.phases ?? [];
    const rowHeights: { hpx: number }[] = [{ hpx: 28 }]; // row 0 = header

    const writeStepRow = (s: Minutogram['steps'][number], i: number): void => {
      const bg = i % 2 === 0 ? WHITE : 'F8FAFC';
      setCell(ws, rowIdx, 0, s.order,        cellStyle(bg, false, true));
      setCell(ws, rowIdx, 1, s.activity,     cellStyle(bg, true));
      setCell(ws, rowIdx, 2, s.component,    cellStyle(bg));
      setCell(ws, rowIdx, 3, s.responsible,  cellStyle(bg));
      setCell(ws, rowIdx, 4, s.startTime,    cellStyle(bg, false, true));
      setCell(ws, rowIdx, 5, s.endTime,      cellStyle(bg, false, true));
      setCell(ws, rowIdx, 6, s.duration > 0 ? `${s.duration} min` : '—', cellStyle(bg, true, true));
      setCellObservation(ws, rowIdx, 7, s.observations, bg);
      rowHeights[rowIdx] = { hpx: 22 };
      rowIdx++;
    };

    phases.forEach((phase) => {
      const phaseSteps = m.steps.filter((s) => s.phaseId === phase.id);
      if (phaseSteps.length === 0) return;

      const pHex = phaseHex(phase.color);
      const pHexLight = phaseHexLight(phase.color);
      const pDuration = phaseSteps.reduce((sum, s) => sum + (s.duration || 0), 0);
      const phaseLabel = `${phase.name}   ·   ${pDuration} min`;

      for (let c = 0; c < cols.length; c++) {
        setCell(ws, rowIdx, c, c === 0 ? phaseLabel : '', phaseRowStyle(pHexLight, pHex));
      }
      if (!ws['!merges']) ws['!merges'] = [];
      ws['!merges'].push({ s: { r: rowIdx, c: 0 }, e: { r: rowIdx, c: cols.length - 1 } });
      rowHeights[rowIdx] = { hpx: 38 };
      rowIdx++;

      phaseSteps.forEach((s, i) => writeStepRow(s, i));
    });

    ws['!cols'] = [
      { wch: 5 }, { wch: 42 }, { wch: 18 }, { wch: 20 },
      { wch: 11 }, { wch: 11 }, { wch: 10 }, { wch: 70 },
    ];
    ws['!rows'] = rowHeights;
    ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rowIdx - 1, c: cols.length - 1 } });
    ws['!pageSetup'] = { orientation: 'landscape', fitToPage: true, fitToWidth: 1 };
    XLSX.utils.book_append_sheet(wb, ws, 'Minutograma');
  }
}
