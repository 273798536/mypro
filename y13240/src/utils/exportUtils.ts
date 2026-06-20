import { StallRecord, Version, Comment, Screenshot, ExportLog, STATUS_LABELS } from '@/types';
import { generateId, formatDateTime } from './fileParser';

function escapeCSV(val: unknown): string {
  const str = String(val ?? '');
  return `"${str.replace(/"/g, '""')}"`;
}

export function generateExportCSV(
  records: StallRecord[],
  versions: Version[],
  comments: Comment[],
  screenshots: Screenshot[]
): { csv: string; log: ExportLog } {
  const headers = [
    '摊位编号',
    '记录状态',
    '版本号',
    '是否当前版本',
    '音频文件名',
    '原始备注',
    '授权期限',
    '导入来源',
    '导入人',
    '导入时间',
    '版本变更说明',
    '批注内容',
    '批注类型',
    '批注人',
    '批注时间',
    '截图说明',
    '截图上传时间',
  ];

  const rows: string[] = [];

  records.forEach((record) => {
    const recordVersions = versions
      .filter((v) => v.recordId === record.id)
      .sort((a, b) => a.versionNumber - b.versionNumber);

    recordVersions.forEach((version) => {
      const versionComments = comments.filter(
        (c) => c.recordId === record.id && c.versionId === version.id
      );
      const versionScreenshots = screenshots.filter(
        (s) => s.recordId === record.id && s.versionId === version.id
      );

      const maxRows = Math.max(versionComments.length, versionScreenshots.length, 1);

      for (let i = 0; i < maxRows; i++) {
        const comment = versionComments[i];
        const screenshot = versionScreenshots[i];

        rows.push(
          [
            i === 0 ? escapeCSV(record.stallNumber) : '""',
            i === 0 ? escapeCSV(STATUS_LABELS[record.status]) : '""',
            i === 0 ? escapeCSV(`v${version.versionNumber}`) : '""',
            i === 0 ? escapeCSV(version.id === record.currentVersionId ? '是' : '否') : '""',
            i === 0 ? escapeCSV(version.audioFileName) : '""',
            i === 0 ? escapeCSV(version.audioRemark) : '""',
            i === 0 ? escapeCSV(version.authorizationDate) : '""',
            i === 0 ? escapeCSV(version.importSource) : '""',
            i === 0 ? escapeCSV(version.importedBy) : '""',
            i === 0 ? escapeCSV(formatDateTime(version.importedAt)) : '""',
            i === 0 ? escapeCSV(version.changeDescription) : '""',
            comment ? escapeCSV(comment.content) : '""',
            comment ? escapeCSV(comment.type === 'override' ? '覆盖旧判断' : '正常批注') : '""',
            comment ? escapeCSV(comment.author) : '""',
            comment ? escapeCSV(formatDateTime(comment.createdAt)) : '""',
            screenshot ? escapeCSV(screenshot.description) : '""',
            screenshot ? escapeCSV(formatDateTime(screenshot.uploadedAt)) : '""',
          ].join(',')
        );
      }
    });
  });

  const BOM = '\uFEFF';
  const csvContent = BOM + [headers.join(','), ...rows].join('\n');

  const log: ExportLog = {
    id: generateId(),
    recordIds: records.map((r) => r.id),
    exportType: 'csv',
    exportedAt: new Date().toISOString(),
    exportedBy: '当前用户',
  };

  return { csv: csvContent, log };
}

export function generateExportJSON(
  records: StallRecord[],
  versions: Version[],
  comments: Comment[],
  screenshots: Screenshot[]
): { json: string; log: ExportLog } {
  const exportData = records.map((record) => {
    const recordVersions = versions
      .filter((v) => v.recordId === record.id)
      .sort((a, b) => a.versionNumber - b.versionNumber)
      .map((version) => {
        const versionComments = comments.filter(
          (c) => c.recordId === record.id && c.versionId === version.id
        );
        const versionScreenshots = screenshots
          .filter((s) => s.recordId === record.id && s.versionId === version.id)
          .map(({ dataUrl, ...rest }) => rest);

        return {
          ...version,
          comments: versionComments,
          screenshots: versionScreenshots,
        };
      });

    return {
      stallNumber: record.stallNumber,
      status: STATUS_LABELS[record.status],
      currentVersionId: record.currentVersionId,
      latestCommentId: record.latestCommentId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      versions: recordVersions,
    };
  });

  const log: ExportLog = {
    id: generateId(),
    recordIds: records.map((r) => r.id),
    exportType: 'json',
    exportedAt: new Date().toISOString(),
    exportedBy: '当前用户',
  };

  return { json: JSON.stringify(exportData, null, 2), log };
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
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

export function checkExportWarnings(
  records: StallRecord[],
  versions: Version[]
): string[] {
  const warnings: string[] = [];

  records.forEach((record) => {
    const currentVersion = versions.find((v) => v.id === record.currentVersionId);

    if (currentVersion) {
      const authDate = new Date(currentVersion.authorizationDate);
      const now = new Date();

      if (authDate < now) {
        warnings.push(`摊位 ${record.stallNumber} 授权已过期`);
      } else if (record.status === 'withdrawn') {
        warnings.push(`摊位 ${record.stallNumber} 状态为已撤回`);
      }
    }

    if (!currentVersion?.authorizationDate) {
      warnings.push(`摊位 ${record.stallNumber} 缺少授权期限`);
    }
  });

  return warnings;
}
