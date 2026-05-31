import type { Part, Annotation, ScoreVersion, ReconciliationIssue } from '../../shared/types';

export const checkVersionConsistency = (
  parts: Part[],
  latestVersion: string
): ReconciliationIssue[] => {
  const issues: ReconciliationIssue[] = [];
  
  parts.forEach(part => {
    if (part.currentVersion !== latestVersion) {
      issues.push({
        id: `version-${part.id}`,
        type: 'old_version',
        severity: 'high',
        partId: part.id,
        description: `${part.name}持有旧版本${part.currentVersion}，最新版本为${latestVersion}`,
        resolved: false,
      });
    }
  });

  return issues;
};

export const checkPageAlignment = (
  annotations: Annotation[],
  scoreVersions: ScoreVersion[]
): ReconciliationIssue[] => {
  const issues: ReconciliationIssue[] = [];
  const pageAnnotationMap = new Map<string, Annotation[]>();

  annotations.forEach(annotation => {
    const key = `${annotation.scoreVersionId}-${annotation.pageNumber}`;
    const existing = pageAnnotationMap.get(key) || [];
    existing.push(annotation);
    pageAnnotationMap.set(key, existing);
  });

  pageAnnotationMap.forEach((annots, key) => {
    if (annots.length > 1) {
      const [versionId] = key.split('-');
      issues.push({
        id: `duplicate-${versionId}-${annots[0].pageNumber}`,
        type: 'duplicate_annotation',
        severity: 'medium',
        partId: annots[0].scoreVersionId,
        annotationId: annots[0].id,
        description: `第${annots[0].pageNumber}页存在${annots.length}条重复批注`,
        resolved: false,
      });
    }
  });

  annotations.forEach(annotation => {
    const version = scoreVersions.find(v => v.id === annotation.scoreVersionId);
    if (version && annotation.pageNumber > version.totalPages) {
      issues.push({
        id: `page-${annotation.id}`,
        type: 'page_mismatch',
        severity: 'high',
        partId: annotation.scoreVersionId,
        annotationId: annotation.id,
        description: `批注页码${annotation.pageNumber}超出曲谱总页数${version.totalPages}`,
        resolved: false,
      });
    }
  });

  return issues;
};

export const checkDistributionStatus = (parts: Part[]): ReconciliationIssue[] => {
  const issues: ReconciliationIssue[] = [];

  parts.forEach(part => {
    if (!part.distributedAt) {
      issues.push({
        id: `dist-pending-${part.id}`,
        type: 'unconfirmed',
        severity: 'low',
        partId: part.id,
        description: `${part.name}尚未发放最新版本`,
        resolved: false,
      });
    } else if (!part.confirmedAt) {
      issues.push({
        id: `dist-unconfirmed-${part.id}`,
        type: 'unconfirmed',
        severity: 'medium',
        partId: part.id,
        description: `${part.name}已发放但未确认接收`,
        resolved: false,
      });
    }
  });

  return issues;
};

export const runFullReconciliation = (
  parts: Part[],
  annotations: Annotation[],
  scoreVersions: ScoreVersion[],
  latestVersion: string
): ReconciliationIssue[] => {
  const versionIssues = checkVersionConsistency(parts, latestVersion);
  const pageIssues = checkPageAlignment(annotations, scoreVersions);
  const distributionIssues = checkDistributionStatus(parts);

  return [...versionIssues, ...pageIssues, ...distributionIssues];
};

export const getIssueTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    old_version: '旧版本',
    unconfirmed: '未确认',
    page_mismatch: '页码错位',
    duplicate_annotation: '批注重复',
  };
  return labels[type] || type;
};

export const getSeverityLabel = (severity: string): string => {
  const labels: Record<string, string> = {
    high: '高',
    medium: '中',
    low: '低',
  };
  return labels[severity] || severity;
};
