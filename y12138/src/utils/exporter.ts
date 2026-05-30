import type { CalculationBatch, WavelengthResult, ValidationEntry, LayerRow } from '@/types';

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function wavelengthResultsToCSV(results: WavelengthResult[]): string {
  const header = 'traceId,wavelength(nm),reflectance,transmittance,absorptance';
  const rows = results.map(
    (r) =>
      `${escapeCSV(r.traceId)},${r.wavelength.toFixed(2)},${r.reflectance.toFixed(6)},${r.transmittance.toFixed(6)},${r.absorptance.toFixed(6)}`
  );
  return [header, ...rows].join('\n');
}

function validationsToCSV(entries: ValidationEntry[]): string {
  const header = 'traceId,rowIndex,issueType,description,rawContent';
  const rows = entries.map(
    (e) =>
      `${escapeCSV(e.traceId)},${e.rowIndex},${escapeCSV(e.issueType)},${escapeCSV(e.description)},${escapeCSV(e.rawContent)}`
  );
  return [header, ...rows].join('\n');
}

function badRowsToCSV(badRows: LayerRow[]): string {
  const header = 'rowIndex,material,n,k,d,note,issues';
  const rows = badRows.map((l) => {
    const issues: string[] = [];
    if (l.status.isEmpty) issues.push('空行');
    if (l.status.isComment) issues.push('备注行');
    if (l.status.missingColumns) issues.push('列缺失');
    if (l.status.zeroThickness) issues.push('层厚为零');
    if (l.status.missingRefractiveIndex) issues.push('折射率缺失');
    return `${l.rowIndex},${escapeCSV(l.material)},${l.n ?? ''},${l.k ?? ''},${l.d ?? ''},${escapeCSV(l.note)},${escapeCSV(issues.join(';'))}`;
  });
  return [header, ...rows].join('\n');
}

export function exportBatchToCSV(batch: CalculationBatch): void {
  const sections: string[] = [];

  sections.push('=== 反射率明细 ===');
  sections.push(wavelengthResultsToCSV(batch.results));
  sections.push('');
  sections.push('=== 参数校验 ===');
  sections.push(validationsToCSV(batch.validations));
  sections.push('');
  sections.push('=== 异常行 ===');
  sections.push(badRowsToCSV(batch.badRows));

  const csvContent = sections.join('\n');
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `film_reflectance_${batch.batchId}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
