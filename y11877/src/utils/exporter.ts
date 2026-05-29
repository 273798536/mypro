import type { GradingResult, MirrorSegment, IncidentRay } from './types';

export function exportAsJSON(
  results: GradingResult[],
  mirrors: MirrorSegment[],
  rays: IncidentRay[]
): void {
  const payload = {
    exportedAt: new Date().toISOString(),
    summary: {
      total: results.length,
      pass: results.filter((r) => r.verdict === 'pass').length,
      error: results.filter((r) => r.verdict === 'error').length,
      pending: results.filter((r) => r.verdict === 'pending').length,
    },
    mirrors,
    rays,
    results,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `grading-report-${Date.now()}.json`);
}

export function exportAsCSV(results: GradingResult[]): void {
  const headers = [
    'ID',
    '光线ID',
    '镜面ID',
    '交点X',
    '交点Y',
    '是否平行',
    '在延长线上',
    '在线段上',
    '入射角(°)',
    '反射角(°)',
    '角偏差(°)',
    '判定',
    '冲突来源',
    '待确认动作',
    '计算明细',
  ];

  const rows = results.map((r) => [
    r.id,
    r.rayId,
    r.mirrorId,
    r.intersection?.x?.toFixed(4) ?? '',
    r.intersection?.y?.toFixed(4) ?? '',
    r.isParallel ? '是' : '否',
    r.isOnExtension ? '是' : '否',
    r.isOnSegment ? '是' : '否',
    r.incidentAngle?.toFixed(2) ?? '',
    r.reflectionAngle?.toFixed(2) ?? '',
    r.angleDeviation?.toFixed(2) ?? '',
    verdictLabel(r.verdict),
    r.conflictSources.join('; '),
    r.pendingAction ?? '',
    `"${r.computationDetails.replace(/"/g, '""')}"`,
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, `grading-report-${Date.now()}.csv`);
}

function verdictLabel(v: string): string {
  switch (v) {
    case 'pass':
      return '通过';
    case 'error':
      return '错误';
    case 'pending':
      return '待确认';
    default:
      return v;
  }
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
