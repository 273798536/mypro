import type {
  InspectionRecord,
  AnnotationResult,
  ReviewExport,
  RecordStatus,
} from '../types';

function getDataStatus(
  status: RecordStatus,
  isHit: boolean
): 'direct_use' | 'needs_review' | 'bad_data' {
  if (status === 'error' || status === 'flipped') {
    return 'bad_data';
  }
  if (status === 'pending' || !isHit) {
    return 'needs_review';
  }
  return 'direct_use';
}

export function generateReviewExport(
  records: InspectionRecord[],
  results: AnnotationResult[],
  elapsedTime: number,
  totalScore: number,
  hitRate: number
): ReviewExport {
  return {
    exportTime: new Date().toISOString(),
    gameDuration: Math.round(elapsedTime / 1000),
    totalScore,
    hitRate,
    records: records.map((record) => {
      const result = results.find((r) => r.recordId === record.id) || null;
      return {
        record,
        result,
        dataStatus: getDataStatus(
          record.status,
          result?.isHit ?? false
        ),
      };
    }),
  };
}

export function exportToJSON(data: ReviewExport): string {
  return JSON.stringify(data, null, 2);
}

export function downloadFile(
  content: string,
  filename: string,
  mimeType: string = 'application/json'
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportReviewReport(
  records: InspectionRecord[],
  results: AnnotationResult[],
  elapsedTime: number,
  totalScore: number,
  hitRate: number
): void {
  const exportData = generateReviewExport(
    records,
    results,
    elapsedTime,
    totalScore,
    hitRate
  );
  const jsonContent = exportToJSON(exportData);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `河道巡检复盘报告_${timestamp}.json`;
  downloadFile(jsonContent, filename);
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}
