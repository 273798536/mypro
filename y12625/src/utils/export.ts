import { Annotation, AnnotationStatus, ExportData, ExperimentResult } from '@/types';
import { validateAllAnnotations } from './annotationDetector';
import { generateId } from './grid';

export function generateExportData(
  levelId: string,
  annotations: Annotation[],
  boundary: { x: number; y: number },
  boundaryFailed: boolean
): ExportData {
  const { valid, pending, allIssues } = validateAllAnnotations(annotations, boundary);

  const annotationsWithStatus: Annotation[] = annotations.map(anno => {
    const issues = allIssues.filter(issue => 
      issue.sourceReference.includes(anno.id)
    );
    const status: AnnotationStatus = issues.length === 0 ? 'valid' : 'pending_review';
    return {
      ...anno,
      issues,
      status
    };
  });

  return {
    version: '1.0.0',
    experimentId: generateId(),
    summary: {
      totalAnnotations: annotations.length,
      validCount: valid.length,
      pendingCount: pending.length,
      boundaryFailed
    },
    annotations: annotationsWithStatus,
    exportedAt: Date.now()
  };
}

export function generateExperimentResult(
  levelId: string,
  annotations: Annotation[],
  boundary: { x: number; y: number },
  boundaryFailed: boolean
): ExperimentResult {
  const exportData = generateExportData(levelId, annotations, boundary, boundaryFailed);
  
  return {
    id: generateId(),
    levelId,
    passed: exportData.summary.pendingCount === 0 && !boundaryFailed,
    annotations: exportData.annotations,
    validCount: exportData.summary.validCount,
    pendingCount: exportData.summary.pendingCount,
    exportData,
    completedAt: Date.now()
  };
}

export function downloadJSON(data: ExportData, filename?: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `experiment-export-${data.experimentId}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function validateExportConsistency(
  exportData: ExportData,
  uiSummary: { total: number; valid: number; pending: number; boundaryFailed: boolean }
): boolean {
  return (
    exportData.summary.totalAnnotations === uiSummary.total &&
    exportData.summary.validCount === uiSummary.valid &&
    exportData.summary.pendingCount === uiSummary.pending &&
    exportData.summary.boundaryFailed === uiSummary.boundaryFailed
  );
}
