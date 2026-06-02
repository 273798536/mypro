import jstat from 'jstat';
import type { DefectRecord, ChiSquareResult, SignificanceLevel } from '../types';

export function buildContingencyTable(
  records: DefectRecord[],
  rowField: keyof DefectRecord = 'defectType',
  colField: keyof DefectRecord = 'category'
): {
  table: number[][];
  rowLabels: string[];
  colLabels: string[];
} {
  const rowValues = [...new Set(records.map(r => String(r[rowField])))].sort();
  const colValues = [...new Set(records.map(r => String(r[colField])))].sort();

  const table: number[][] = rowValues.map(() =>
    colValues.map(() => 0)
  );

  records.forEach(record => {
    const rowIndex = rowValues.indexOf(String(record[rowField]));
    const colIndex = colValues.indexOf(String(record[colField]));
    if (rowIndex !== -1 && colIndex !== -1) {
      table[rowIndex][colIndex] += record.count;
    }
  });

  return { table, rowLabels: rowValues, colLabels: colValues };
}

export function calculateExpectedTable(contingencyTable: number[][]): number[][] {
  const rowTotals = contingencyTable.map(row => row.reduce((a, b) => a + b, 0));
  const colTotals = contingencyTable[0].map((_, colIndex) =>
    contingencyTable.reduce((sum, row) => sum + row[colIndex], 0)
  );
  const grandTotal = rowTotals.reduce((a, b) => a + b, 0);

  return contingencyTable.map((row, rowIndex) =>
    row.map((_, colIndex) => (rowTotals[rowIndex] * colTotals[colIndex]) / grandTotal)
  );
}

export function calculateChiSquare(
  observed: number[][],
  expected: number[][]
): number {
  let chiSquare = 0;
  for (let i = 0; i < observed.length; i++) {
    for (let j = 0; j < observed[i].length; j++) {
      if (expected[i][j] > 0) {
        chiSquare += Math.pow(observed[i][j] - expected[i][j], 2) / expected[i][j];
      }
    }
  }
  return chiSquare;
}

export function calculateDegreesOfFreedom(table: number[][]): number {
  return (table.length - 1) * (table[0].length - 1);
}

export function calculatePValue(chiSquare: number, df: number): number {
  if (df <= 0) return 1;
  return 1 - jstat.chisquare.cdf(chiSquare, df);
}

export function getCriticalValue(df: number, alpha: SignificanceLevel): number {
  if (df <= 0) return 0;
  return jstat.chisquare.inv(1 - alpha, df);
}

export function calculateResiduals(
  observed: number[][],
  expected: number[][]
): number[][] {
  return observed.map((row, i) =>
    row.map((cell, j) => {
      if (expected[i][j] === 0) return 0;
      return (cell - expected[i][j]) / Math.sqrt(expected[i][j]);
    })
  );
}

export function generateConclusionText(
  chiSquare: number,
  degreesOfFreedom: number,
  pValue: number,
  criticalValue: number,
  alpha: number
): string {
  const isSignificant = pValue < alpha;
  const conclusion = isSignificant ? '拒绝原假设' : '接受原假设';

  return `卡方检验结果：χ² = ${chiSquare.toFixed(4)}，自由度 = ${degreesOfFreedom}，p值 = ${pValue.toFixed(6)}，显著性水平 α = ${alpha}。
临界值为 ${criticalValue.toFixed(4)}。由于 ${isSignificant ? 'p值 < α' : 'p值 ≥ α'}，因此${conclusion}。
${isSignificant ? '各分类之间存在显著差异。' : '各分类之间没有显著差异。'}`;
}

export function performChiSquareTest(
  records: DefectRecord[],
  projectId: string,
  teamSummary: string,
  alpha: SignificanceLevel = 0.05,
  rowField: keyof DefectRecord = 'defectType',
  colField: keyof DefectRecord = 'category'
): ChiSquareResult {
  const { table: contingencyTable, rowLabels, colLabels } = buildContingencyTable(records, rowField, colField);
  const expectedTable = calculateExpectedTable(contingencyTable);
  const chiSquareValue = calculateChiSquare(contingencyTable, expectedTable);
  const degreesOfFreedom = calculateDegreesOfFreedom(contingencyTable);
  const pValue = calculatePValue(chiSquareValue, degreesOfFreedom);
  const criticalValue = getCriticalValue(degreesOfFreedom, alpha);
  const residuals = calculateResiduals(contingencyTable, expectedTable);
  const conclusion = pValue < alpha ? 'reject' : 'accept';
  const conclusionText = generateConclusionText(chiSquareValue, degreesOfFreedom, pValue, criticalValue, alpha);

  return {
    id: `result-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    projectId,
    chiSquareValue,
    degreesOfFreedom,
    pValue,
    criticalValue,
    conclusion,
    conclusionText,
    contingencyTable,
    expectedTable,
    residuals,
    rowLabels,
    colLabels,
    analyzedAt: new Date(),
    teamSummary
  };
}

export function validateSampleSize(expectedTable: number[][]): {
  valid: boolean;
  smallExpectedCount: number;
  zeroExpectedCount: number;
} {
  let smallExpectedCount = 0;
  let zeroExpectedCount = 0;
  const totalCells = expectedTable.length * expectedTable[0].length;

  expectedTable.forEach(row => {
    row.forEach(cell => {
      if (cell === 0) zeroExpectedCount++;
      else if (cell < 5) smallExpectedCount++;
    });
  });

  const smallExpectedRatio = smallExpectedCount / totalCells;
  const valid = smallExpectedRatio < 0.2 && zeroExpectedCount === 0;

  return { valid, smallExpectedCount, zeroExpectedCount };
}

export function suggestCategoryMerge(
  records: DefectRecord[],
  field: keyof DefectRecord
): { suggestions: string[][]; mergedRecords: DefectRecord[] } {
  const fieldCounts: Record<string, number> = {};
  records.forEach(record => {
    const key = String(record[field]);
    fieldCounts[key] = (fieldCounts[key] || 0) + record.count;
  });

  const sortedCategories = Object.entries(fieldCounts)
    .sort((a, b) => a[1] - b[1])
    .map(e => e[0]);

  const suggestions: string[][] = [];
  const smallCategories = sortedCategories.filter(cat => fieldCounts[cat] < 10);

  if (smallCategories.length >= 2) {
    suggestions.push(smallCategories);
  }

  const mergedRecords = records.map(record => {
    let category = String(record[field]);
    for (const group of suggestions) {
      if (group.includes(category)) {
        category = '其他';
        break;
      }
    }
    return { ...record, [field]: category };
  });

  return { suggestions, mergedRecords };
}
