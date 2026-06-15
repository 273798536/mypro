import { StallRecord, Version, Comment, Screenshot, ExportLog } from '@/types';
import { generateId } from './fileParser';

interface ExportData {
  stallNumber: string;
  status: string;
  currentVersion: number;
  audioFileName: string;
  authorizationDate: string;
  latestComment: string;
  commentAuthor: string;
  commentDate: string;
  versionCount: number;
  screenshotCount: number;
  lastUpdated: string;
}

export function generateExportCSV(
  records: StallRecord[],
  versions: Version[],
  comments: Comment[],
  screenshots: Screenshot[]
): { csv: string; log: ExportLog } {
  const headers = [
    '摊位编号',
    '状态',
    '当前版本',
    '音频文件名',
    '授权期限',
    '最新批注',
    '批注人',
    '批注时间',
    '版本数',
    '截图数',
    '最后更新',
  ];

  const rows: ExportData[] = records.map((record) => {
    const recordVersions = versions.filter((v) => v.recordId === record.id);
    const currentVersion = recordVersions.find((v) => v.id === record.currentVersionId);
    const recordComments = comments.filter((c) => c.recordId === record.id);
    const latestComment = recordComments.find((c) => c.id === record.latestCommentId);
    const recordScreenshots = screenshots.filter((s) => s.recordId === record.id);

    return {
      stallNumber: record.stallNumber,
      status: record.status,
      currentVersion: currentVersion?.versionNumber || 0,
      audioFileName: currentVersion?.audioFileName || '',
      authorizationDate: currentVersion?.authorizationDate || '',
      latestComment: latestComment?.content || '',
      commentAuthor: latestComment?.author || '',
      commentDate: latestComment?.createdAt || '',
      versionCount: recordVersions.length,
      screenshotCount: recordScreenshots.length,
      lastUpdated: record.updatedAt,
    };
  });

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      Object.values(row)
        .map((val) => `"${String(val).replace(/"/g, '""')}"`)
        .join(',')
    ),
  ].join('\n');

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
    const recordVersions = versions.filter((v) => v.recordId === record.id);
    const recordComments = comments.filter((c) => c.recordId === record.id);
    const recordScreenshots = screenshots.filter((s) => s.recordId === record.id);

    return {
      ...record,
      versions: recordVersions,
      comments: recordComments,
      screenshots: recordScreenshots.map(({ dataUrl, ...rest }) => rest),
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
