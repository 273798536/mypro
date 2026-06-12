import Papa from 'papaparse';
import type { RawParameterRecord, VerificationRecord, HistoryVersion } from '@/types';
import { generateId } from './common';

export function parseCSVFile(file: File): Promise<RawParameterRecord[]> {
  return new Promise((resolve, reject) => {
    const now = Date.now();
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const records: RawParameterRecord[] = results.data.map((row, index) => ({
          id: generateId(),
          rowIndex: index,
          rawData: { ...row },
          sourceFile: file.name,
          uploadedAt: now,
        }));
        resolve(records);
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}

export function exportToCSV(records: VerificationRecord[], filename: string): void {
  const rows = records.map((r) => ({
    state: r.stateName,
    weight_raw: r.rawWeight,
    weight: r.weight,
    probability_raw: r.rawProbability,
    transition_probability: r.transitionProbability,
    row_sum: r.weight + r.transitionProbability,
    boundary_status: r.boundaryStatus,
    is_zero_division: r.isZeroDivision ? '是' : '否',
    zero_division_reason: r.zeroDivisionReason || '',
    temp_judgment: r.tempJudgment || '',
    judge_name: r.judgeName || '',
    judged_at: r.judgedAt ? new Date(r.judgedAt).toISOString() : '',
  }));

  const csv = Papa.unparse(rows);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportDeliveryPackage(
  version: HistoryVersion,
  filename: string
): void {
  const content = {
    version: version.version,
    versionNumber: version.versionNumber,
    createdAt: new Date(version.createdAt).toISOString(),
    operatorName: version.operatorName,
    description: version.description,
    filterCriteria: version.filterCriteria,
    changes: version.changes,
    rawRecordsCount: version.rawRecords.length,
    verificationResultsCount: version.verificationResults.length,
    verificationSummary: {
      total: version.verificationResults.length,
      normal: version.verificationResults.filter((r) => r.boundaryStatus === 'normal').length,
      boundary: version.verificationResults.filter((r) => r.boundaryStatus === 'boundary').length,
      anomaly: version.verificationResults.filter((r) => r.boundaryStatus === 'anomaly').length,
      zeroDivision: version.verificationResults.filter((r) => r.isZeroDivision).length,
    },
    rawRecords: version.rawRecords.map((r) => r.rawData),
    verificationResults: version.verificationResults.map((r) => ({
      state: r.stateName,
      weight_raw: r.rawWeight,
      weight: r.weight,
      probability_raw: r.rawProbability,
      transition_probability: r.transitionProbability,
      boundary_status: r.boundaryStatus,
      is_zero_division: r.isZeroDivision,
      zero_division_reason: r.zeroDivisionReason,
      temp_judgment: r.tempJudgment,
      calculation_steps_count: r.calculationSteps.length,
    })),
  };

  const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
