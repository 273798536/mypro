import * as XLSX from 'xlsx';
import type {
  AnalysisResult,
  PrimerPair,
  Mutation,
  SampleResult,
  AnomalyRecord,
  MutationImpact,
} from '../utils/types';

const STATUS_COLORS: Record<PrimerPair['status'], string> = {
  valid: '22C55E',
  warning: 'EAB308',
  invalid: 'EF4444',
  needs_review: '3B82F6',
};

const SEVERITY_COLORS: Record<AnomalyRecord['severity'], string> = {
  error: 'EF4444',
  warning: 'EAB308',
  info: '3B82F6',
};

const MISMATCH_COLORS: Record<MutationImpact['mismatchLevel'], string> = {
  critical: 'EF4444',
  high: 'F97316',
  medium: 'EAB308',
  low: '22C55E',
};

function getStatusLabel(status: PrimerPair['status']): string {
  const map: Record<PrimerPair['status'], string> = {
    valid: 'Valid',
    warning: 'Warning',
    invalid: 'Invalid',
    needs_review: 'Needs Review',
  };
  return map[status];
}

function getSeverityLabel(severity: AnomalyRecord['severity']): string {
  const map: Record<AnomalyRecord['severity'], string> = {
    error: 'Error',
    warning: 'Warning',
    info: 'Info',
  };
  return map[severity];
}

function getMismatchLabel(level: MutationImpact['mismatchLevel']): string {
  const map: Record<MutationImpact['mismatchLevel'], string> = {
    critical: 'Critical',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
  };
  return map[level];
}

function getRecommendationLabel(rec: MutationImpact['recommendation']): string {
  const map: Record<MutationImpact['recommendation'], string> = {
    use: 'Use',
    caution: 'Use with caution',
    replace: 'Replace primer',
  };
  return map[rec];
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

function formatPercent(value: number): string {
  return (value * 100).toFixed(1) + '%';
}

function applyHeaderStyle(ws: XLSX.WorkSheet, range: XLSX.Range): void {
  for (let C = range.s.c; C <= range.e.c; ++C) {
    for (let R = range.s.r; R <= range.e.r; ++R) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cellRef]) continue;
      ws[cellRef].s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '334155' } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      };
    }
  }
}

function applyRowColor(
  ws: XLSX.WorkSheet,
  rowIndex: number,
  colCount: number,
  color: string,
  targetCol?: number
): void {
  if (targetCol !== undefined) {
    const cellRef = XLSX.utils.encode_cell({ r: rowIndex, c: targetCol });
    if (ws[cellRef]) {
      ws[cellRef].s = {
        ...ws[cellRef].s,
        font: { bold: true, color: { rgb: color } },
      };
    }
  } else {
    for (let C = 0; C < colCount; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: rowIndex, c: C });
      if (ws[cellRef]) {
        ws[cellRef].s = {
          ...ws[cellRef].s,
          fill: { fgColor: { rgb: color + '20' } },
        };
      }
    }
  }
}

function autoColumnWidth(ws: XLSX.WorkSheet, data: unknown[][]): void {
  const colWidths: number[] = [];
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    for (let j = 0; j < row.length; j++) {
      const val = row[j];
      const text = val !== undefined && val !== null ? String(val) : '';
      const len = Math.min(text.length + 2, 50);
      colWidths[j] = Math.max(colWidths[j] || 10, len);
    }
  }
  ws['!cols'] = colWidths.map((w) => ({ wch: w }));
}

function buildSummarySheet(result: AnalysisResult): XLSX.WorkSheet {
  const data: unknown[][] = [];

  data.push(['Primer Analysis Report - Summary']);
  data.push(['']);
  data.push(['Report Information']);
  data.push(['Report ID', result.id]);
  data.push(['Generated At', formatDate(result.createdAt)]);
  data.push(['Data Hash', result.dataHash]);
  data.push(['']);

  data.push(['Reference Sequence']);
  data.push(['Reference ID', result.reference.id]);
  data.push(['Name', result.reference.name]);
  data.push(['Length', result.reference.length + ' bp']);
  data.push(['GC Content', formatPercent(result.reference.gcContent)]);
  data.push(['']);

  data.push(['Analysis Configuration']);
  data.push(['Min Tm', result.config.minTm + ' C']);
  data.push(['Max Tm', result.config.maxTm + ' C']);
  data.push(["3' Critical Bases", result.config.threePrimeCriticalBases]);
  data.push(['Max Allowed Mismatches', result.config.maxAllowedMismatches]);
  data.push(['Min Amplicon Size', result.config.minimumAmpliconSize + ' bp']);
  data.push(['Max Amplicon Size', result.config.maximumAmpliconSize + ' bp']);
  data.push(['']);

  data.push(['Statistics Summary']);
  data.push(['Total Primer Pairs', result.summary.totalPrimers]);
  data.push(['Valid Primer Pairs', result.summary.validPrimers]);
  data.push(['Coverage', formatPercent(result.summary.coveragePercent)]);
  data.push(['Coverage Gaps', result.summary.gapCount]);
  data.push(['Samples Analyzed', result.sampleResults.length]);
  data.push(['Samples Needing Attention', result.summary.samplesNeedingAttention]);
  data.push(['Total Mutations', result.mutations.length]);
  data.push(['Mutation Impacts', result.mutationImpacts.length]);
  data.push(['Anomalies Detected', result.summary.anomalyCount]);
  data.push(['']);

  const critical = result.mutationImpacts.filter((m) => m.mismatchLevel === 'critical').length;
  const high = result.mutationImpacts.filter((m) => m.mismatchLevel === 'high').length;
  const medium = result.mutationImpacts.filter((m) => m.mismatchLevel === 'medium').length;
  const low = result.mutationImpacts.filter((m) => m.mismatchLevel === 'low').length;

  data.push(['Mutation Impact Breakdown']);
  data.push(['Critical', critical]);
  data.push(['High', high]);
  data.push(['Medium', medium]);
  data.push(['Low', low]);

  const ws = XLSX.utils.aoa_to_sheet(data);

  const headerRows = [2, 8, 14, 24, 30];
  for (const row of headerRows) {
    const cellRef = XLSX.utils.encode_cell({ r: row, c: 0 });
    if (ws[cellRef]) {
      ws[cellRef].s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '334155' } },
      };
    }
  }

  for (let R = 0; R < data.length; R++) {
    if (data[R][0] && typeof data[R][0] === 'string' && data[R].length === 1) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: 0 });
      if (ws[cellRef] && !headerRows.includes(R)) {
        ws[cellRef].s = {
          font: { bold: true },
        };
      }
    }
  }

  ws['!cols'] = [{ wch: 30 }, { wch: 50 }];
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
  const titleCell = XLSX.utils.encode_cell({ r: 0, c: 0 });
  if (ws[titleCell]) {
    ws[titleCell].s = {
      font: { bold: true, sz: 16 },
      alignment: { horizontal: 'center' },
    };
  }

  return ws;
}

function buildPrimersSheet(result: AnalysisResult): XLSX.WorkSheet {
  const headers = [
    'Name',
    'Batch',
    'Status',
    'Forward Sequence',
    'Forward Tm (C)',
    'Forward GC%',
    'Forward Length',
    'Forward Ambiguity',
    'Reverse Sequence',
    'Reverse Tm (C)',
    'Reverse GC%',
    'Reverse Length',
    'Reverse Ambiguity',
    'Product Size (bp)',
    'Amplicon Start',
    'Amplicon End',
    'Notes',
  ];

  const data: unknown[][] = [headers];

  for (const pair of result.primerPairs) {
    data.push([
      pair.name,
      pair.batch || '-',
      getStatusLabel(pair.status),
      pair.forward.sequence,
      pair.forward.tm.toFixed(1),
      formatPercent(pair.forward.gcContent),
      pair.forward.length,
      pair.forward.hasAmbiguity ? `Yes (${pair.forward.ambiguityPositions?.length || 0} sites)` : 'No',
      pair.reverse.sequence,
      pair.reverse.tm.toFixed(1),
      formatPercent(pair.reverse.gcContent),
      pair.reverse.length,
      pair.reverse.hasAmbiguity ? `Yes (${pair.reverse.ambiguityPositions?.length || 0} sites)` : 'No',
      pair.productSize > 0 ? pair.productSize : 'N/A',
      pair.ampliconStart >= 0 ? pair.ampliconStart + 1 : 'N/A',
      pair.ampliconEnd >= 0 ? pair.ampliconEnd : 'N/A',
      pair.notes || '-',
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet(data);
  autoColumnWidth(ws, data);

  const headerRange: XLSX.Range = { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } };
  applyHeaderStyle(ws, headerRange);

  for (let i = 0; i < result.primerPairs.length; i++) {
    const pair = result.primerPairs[i];
    const rowIndex = i + 1;
    const color = STATUS_COLORS[pair.status];
    applyRowColor(ws, rowIndex, headers.length, color, 2);
  }

  return ws;
}

function buildMutationsSheet(result: AnalysisResult): XLSX.WorkSheet {
  const headers = [
    'Sample ID',
    'Sample Name',
    'Position',
    'Reference Base',
    'Alternate Base',
    'Change',
    'Quality',
    'Allele Frequency',
    'Affected Primer Pairs',
    'Highest Impact Level',
  ];

  const data: unknown[][] = [headers];

  for (const mutation of result.mutations) {
    const impacts = result.mutationImpacts.filter((i) => i.mutationId === mutation.id);
    const affectedPairNames = impacts
      .map((imp) => result.primerPairs.find((p) => p.id === imp.primerPairId)?.name)
      .filter(Boolean)
      .join(', ');

    let highestLevel: MutationImpact['mismatchLevel'] | null = null;
    const levelOrder: MutationImpact['mismatchLevel'][] = ['critical', 'high', 'medium', 'low'];
    for (const level of levelOrder) {
      if (impacts.some((i) => i.mismatchLevel === level)) {
        highestLevel = level;
        break;
      }
    }

    data.push([
      mutation.sampleId,
      mutation.sampleName,
      mutation.position,
      mutation.refBase,
      mutation.altBase,
      `${mutation.refBase}>${mutation.altBase}`,
      mutation.quality?.toFixed(1) || 'N/A',
      mutation.alleleFrequency !== undefined ? (mutation.alleleFrequency * 100).toFixed(1) + '%' : 'N/A',
      affectedPairNames || 'None',
      highestLevel ? getMismatchLabel(highestLevel) : 'None',
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet(data);
  autoColumnWidth(ws, data);

  const headerRange: XLSX.Range = { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } };
  applyHeaderStyle(ws, headerRange);

  for (let i = 0; i < result.mutations.length; i++) {
    const mutation = result.mutations[i];
    const impacts = result.mutationImpacts.filter((imp) => imp.mutationId === mutation.id);
    const rowIndex = i + 1;

    let highestLevel: MutationImpact['mismatchLevel'] | null = null;
    const levelOrder: MutationImpact['mismatchLevel'][] = ['critical', 'high', 'medium', 'low'];
    for (const level of levelOrder) {
      if (impacts.some((imp) => imp.mismatchLevel === level)) {
        highestLevel = level;
        break;
      }
    }

    if (highestLevel) {
      const color = MISMATCH_COLORS[highestLevel];
      applyRowColor(ws, rowIndex, headers.length, color, 9);
    }
  }

  return ws;
}

function buildSampleRecommendationsSheet(result: AnalysisResult): XLSX.WorkSheet {
  const headers = [
    'Sample ID',
    'Sample Name',
    'Mutation Count',
    'Critical Mismatches',
    'Total Primer Pairs',
    'Usable Primer Pairs',
    'Usability Rate',
    'Needs Alternative Primers',
    'Recommended Primer Pairs',
    'Notes',
  ];

  const data: unknown[][] = [headers];

  for (const sample of result.sampleResults) {
    const usabilityRate = result.primerPairs.length > 0
      ? (sample.recommendedPrimerPairs.length / result.primerPairs.length) * 100
      : 0;

    const recNames = sample.recommendedPrimerPairs
      .map((id) => result.primerPairs.find((p) => p.id === id)?.name)
      .filter(Boolean)
      .join(', ');

    data.push([
      sample.sampleId,
      sample.sampleName,
      sample.mutationCount,
      sample.criticalMismatches.length,
      result.primerPairs.length,
      sample.recommendedPrimerPairs.length,
      usabilityRate.toFixed(1) + '%',
      sample.needsAlternativePrimers ? 'Yes' : 'No',
      recNames || 'None',
      sample.notes,
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet(data);
  autoColumnWidth(ws, data);

  const headerRange: XLSX.Range = { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } };
  applyHeaderStyle(ws, headerRange);

  for (let i = 0; i < result.sampleResults.length; i++) {
    const sample = result.sampleResults[i];
    const rowIndex = i + 1;
    if (sample.needsAlternativePrimers) {
      applyRowColor(ws, rowIndex, headers.length, 'EF4444', 7);
    } else {
      applyRowColor(ws, rowIndex, headers.length, '22C55E', 7);
    }
  }

  return ws;
}

function buildAnomaliesSheet(result: AnalysisResult): XLSX.WorkSheet {
  const headers = [
    'Severity',
    'Type',
    'Source Primer Pair',
    'Source Primer',
    'Description',
    'Suggestion',
  ];

  const data: unknown[][] = [headers];

  for (const anomaly of result.anomalies) {
    const pair = result.primerPairs.find((p) => p.id === anomaly.primerPairId);
    const primer = pair
      ? (pair.forward.id === anomaly.primerId
          ? `Forward (${pair.forward.sequence.substring(0, 15)}...)`
          : pair.reverse.id === anomaly.primerId
          ? `Reverse (${pair.reverse.sequence.substring(0, 15)}...)`
          : 'N/A')
      : 'N/A';

    data.push([
      getSeverityLabel(anomaly.severity),
      anomaly.type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      pair?.name || 'System',
      primer,
      anomaly.message,
      anomaly.suggestion,
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet(data);
  autoColumnWidth(ws, data);

  const headerRange: XLSX.Range = { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } };
  applyHeaderStyle(ws, headerRange);

  for (let i = 0; i < result.anomalies.length; i++) {
    const anomaly = result.anomalies[i];
    const rowIndex = i + 1;
    const color = SEVERITY_COLORS[anomaly.severity];
    applyRowColor(ws, rowIndex, headers.length, color, 0);
  }

  return ws;
}

function buildMutationImpactsSheet(result: AnalysisResult): XLSX.WorkSheet {
  const headers = [
    'Sample Name',
    'Mutation Position',
    'Base Change',
    'Primer Pair',
    'Affected Primer',
    "Distance from 3' End",
    "3' Mismatch",
    'Impact Level',
    'Recommendation',
  ];

  const data: unknown[][] = [headers];

  for (const impact of result.mutationImpacts) {
    const mutation = result.mutations.find((m) => m.id === impact.mutationId);
    const pair = result.primerPairs.find((p) => p.id === impact.primerPairId);

    data.push([
      mutation?.sampleName || 'Unknown',
      mutation?.position || 'N/A',
      mutation ? `${mutation.refBase}>${mutation.altBase}` : 'N/A',
      pair?.name || 'Unknown',
      impact.affectedPrimer.charAt(0).toUpperCase() + impact.affectedPrimer.slice(1),
      impact.distanceFromThreePrime >= 0 ? impact.distanceFromThreePrime + ' bp' : 'N/A',
      impact.isThreePrimeMismatch ? 'Yes' : 'No',
      getMismatchLabel(impact.mismatchLevel),
      getRecommendationLabel(impact.recommendation),
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet(data);
  autoColumnWidth(ws, data);

  const headerRange: XLSX.Range = { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } };
  applyHeaderStyle(ws, headerRange);

  for (let i = 0; i < result.mutationImpacts.length; i++) {
    const impact = result.mutationImpacts[i];
    const rowIndex = i + 1;
    const color = MISMATCH_COLORS[impact.mismatchLevel];
    applyRowColor(ws, rowIndex, headers.length, color, 7);
  }

  return ws;
}

export function exportToExcel(result: AnalysisResult, filename?: string): void {
  if (!result) {
    throw new Error('Analysis result is required for Excel export');
  }

  const wb = XLSX.utils.book_new();

  const summarySheet = buildSummarySheet(result);
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

  const primersSheet = buildPrimersSheet(result);
  XLSX.utils.book_append_sheet(wb, primersSheet, 'Primer List');

  const mutationsSheet = buildMutationsSheet(result);
  XLSX.utils.book_append_sheet(wb, mutationsSheet, 'Mutations');

  const impactsSheet = buildMutationImpactsSheet(result);
  XLSX.utils.book_append_sheet(wb, impactsSheet, 'Mutation Impacts');

  const samplesSheet = buildSampleRecommendationsSheet(result);
  XLSX.utils.book_append_sheet(wb, samplesSheet, 'Sample Recommendations');

  const anomaliesSheet = buildAnomaliesSheet(result);
  XLSX.utils.book_append_sheet(wb, anomaliesSheet, 'Anomalies');

  const outputFilename = filename || `primer-analysis-report-${result.createdAt}.xlsx`;
  XLSX.writeFile(wb, outputFilename);
}

export function generateExcelBlob(result: AnalysisResult): Blob {
  if (!result) {
    throw new Error('Analysis result is required for Excel export');
  }

  const wb = XLSX.utils.book_new();

  const summarySheet = buildSummarySheet(result);
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

  const primersSheet = buildPrimersSheet(result);
  XLSX.utils.book_append_sheet(wb, primersSheet, 'Primer List');

  const mutationsSheet = buildMutationsSheet(result);
  XLSX.utils.book_append_sheet(wb, mutationsSheet, 'Mutations');

  const impactsSheet = buildMutationImpactsSheet(result);
  XLSX.utils.book_append_sheet(wb, impactsSheet, 'Mutation Impacts');

  const samplesSheet = buildSampleRecommendationsSheet(result);
  XLSX.utils.book_append_sheet(wb, samplesSheet, 'Sample Recommendations');

  const anomaliesSheet = buildAnomaliesSheet(result);
  XLSX.utils.book_append_sheet(wb, anomaliesSheet, 'Anomalies');

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
