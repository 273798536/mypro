import type { Peak, DataQuality } from '@/types';

interface ValidationIssues {
  nullCount: number;
  duplicateCount: number;
  noteInlineCount: number;
  outlierCount: number;
  details: string[];
}

export function detectNoteInline(value: string | number | null): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'number') return false;
  const str = String(value).trim();
  if (!str) return false;
  if (!isNaN(Number(str))) return false;
  return true;
}

export function parseNoteInline(value: string): { numeric: number | null; note: string } {
  const match = value.match(/([\d.]+)/);
  return {
    numeric: match ? Number(match[1]) : null,
    note: value,
  };
}

export function validatePeaks(peaks: Peak[]): { peaks: Peak[]; issues: ValidationIssues } {
  const issues: ValidationIssues = {
    nullCount: 0,
    duplicateCount: 0,
    noteInlineCount: 0,
    outlierCount: 0,
    details: [],
  };

  const rtValues = peaks.map(p => p.retentionTime).filter((v): v is number => v !== null);
  const q1 = percentile(rtValues, 25);
  const q3 = percentile(rtValues, 75);
  const iqr = q3 - q1;
  const lowerFence = q1 - 3 * iqr;
  const upperFence = q3 + 3 * iqr;

  const updatedPeaks = peaks.map((peak, idx) => {
    const newPeak = { ...peak };
    newPeak.dataQuality = 'normal';
    newPeak.isNull = false;
    newPeak.isDuplicate = false;

    if (peak.retentionTime === null || peak.peakArea === null) {
      newPeak.isNull = true;
      newPeak.dataQuality = 'null';
      issues.nullCount++;
      issues.details.push(`峰 #${peak.peakIndex}: 存在空值字段`);
    }

    if (peak.retentionTime !== null && (peak.retentionTime < lowerFence || peak.retentionTime > upperFence)) {
      if (rtValues.length > 3) {
        newPeak.dataQuality = 'outlier';
        issues.outlierCount++;
        issues.details.push(`峰 #${peak.peakIndex}: 保留时间 ${peak.retentionTime.toFixed(3)} min 为离群值`);
      }
    }

    for (let j = 0; j < peaks.length; j++) {
      if (j === idx) continue;
      const other = peaks[j];
      if (peak.retentionTime !== null && other.retentionTime !== null &&
          Math.abs(peak.retentionTime - other.retentionTime) < 0.02) {
        if (peak.peakArea !== null && other.peakArea !== null &&
            Math.abs(peak.peakArea - other.peakArea) / Math.max(peak.peakArea, other.peakArea) < 0.05) {
          newPeak.isDuplicate = true;
          newPeak.dataQuality = 'duplicate';
          if (!issues.details.find(d => d.includes(`峰 #${peak.peakIndex} 和 #${other.peakIndex}`))) {
            issues.duplicateCount++;
            issues.details.push(`峰 #${peak.peakIndex} 和 #${other.peakIndex}: 疑似重复峰（ΔRT=${Math.abs(peak.retentionTime - other.retentionTime).toFixed(3)}min）`);
          }
          break;
        }
      }
    }

    return newPeak;
  });

  issues.duplicateCount = issues.duplicateCount > 0 ? issues.duplicateCount + 1 : 0;
  return { peaks: updatedPeaks, issues };
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  const weight = idx - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

export function autoMarkStatus(issues: ValidationIssues): 'ready' | 'needs_review' | 'invalid' {
  if (issues.outlierCount >= 2 || issues.nullCount >= 3 || issues.noteInlineCount >= 1) {
    return 'invalid';
  }
  if (issues.nullCount > 0 || issues.duplicateCount > 0 || issues.outlierCount > 0) {
    return 'needs_review';
  }
  return 'ready';
}

export type { DataQuality };
