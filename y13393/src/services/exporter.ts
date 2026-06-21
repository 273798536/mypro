import type { CostSnapshot, ExportFormat } from '@/types';

export interface ExportMetadata {
  exportedAt: string;
  snapshotCount: number;
  dateRange: { start: string; end: string };
  pageStateHash: string;
}

export const generateExportMetadata = (
  snapshots: CostSnapshot[],
  pageState: Record<string, unknown>
): ExportMetadata => {
  const dates = snapshots.map(s => new Date(s.createdAt));
  const pageStateHash = btoa(JSON.stringify(pageState));

  return {
    exportedAt: new Date().toISOString(),
    snapshotCount: snapshots.length,
    dateRange: {
      start: new Date(Math.min(...dates.map(d => d.getTime()))).toISOString(),
      end: new Date(Math.max(...dates.map(d => d.getTime()))).toISOString()
    },
    pageStateHash
  };
};

export const ensureConsistency = (
  exportData: { metadata: ExportMetadata; snapshots: CostSnapshot[] },
  pageState: Record<string, unknown>
): boolean => {
  const currentHash = btoa(JSON.stringify(pageState));
  return exportData.metadata.pageStateHash === currentHash;
};

export const exportToCSV = (snapshots: CostSnapshot[]): string => {
  const headers = [
    '版本号',
    '模型版本',
    '创建时间',
    '操作人',
    '总成本(元)',
    '状态',
    '客户端数量(台)',
    '单轮训练时长(小时)',
    '灰度比例(%)',
    '算力单价(元/小时)',
    '通信成本(元)',
    '训练轮次(轮)',
    '备注数量',
    '人工判断'
  ];

  const rows = snapshots.map(snap => [
    snap.version,
    snap.modelVersion,
    formatDate(snap.createdAt),
    snap.operator,
    snap.totalCost.toFixed(2),
    mapStatus(snap.status),
    snap.parameters.find(p => p.name === '客户端数量')?.value || '',
    snap.parameters.find(p => p.name === '单轮训练时长')?.value || '',
    snap.parameters.find(p => p.name === '灰度比例')?.value || '',
    snap.parameters.find(p => p.name === '算力单价')?.value || '',
    snap.parameters.find(p => p.name === '通信成本')?.value || '',
    snap.parameters.find(p => p.name === '训练轮次')?.value || '',
    snap.notes.length,
    snap.manualJudgment?.decision || ''
  ]);

  const notesSection = snapshots.flatMap(snap =>
    snap.notes.map(note => [
      `备注-${snap.version}`,
      note.author,
      formatDate(note.createdAt),
      note.isSupplement ? '补充备注' : '原始备注',
      `"${note.content.replace(/"/g, '""')}"`
    ])
  );

  return [
    headers.join(','),
    ...rows.map(row => row.join(',')),
    '',
    '备注明细',
    '版本,作者,时间,类型,内容',
    ...notesSection.map(row => row.join(','))
  ].join('\n');
};

export const exportToJSON = (
  snapshots: CostSnapshot[],
  metadata: ExportMetadata
): string => {
  return JSON.stringify({ metadata, snapshots }, null, 2);
};

export const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const handleExport = (
  snapshots: CostSnapshot[],
  format: ExportFormat,
  pageState: Record<string, unknown>
) => {
  const metadata = generateExportMetadata(snapshots, pageState);
  
  const timestamp = formatDateForFilename(new Date());
  
  if (format === 'csv') {
    const csvContent = exportToCSV(snapshots);
    const csvWithMetadata = `# 导出时间: ${metadata.exportedAt}\n# 快照数量: ${metadata.snapshotCount}\n# 页面状态校验码: ${metadata.pageStateHash}\n\n${csvContent}`;
    downloadFile(csvWithMetadata, `联邦客户端成本看板_${timestamp}.csv`, 'text/csv;charset=utf-8');
  } else if (format === 'json') {
    const jsonContent = exportToJSON(snapshots, metadata);
    downloadFile(jsonContent, `联邦客户端成本看板_${timestamp}.json`, 'application/json');
  } else if (format === 'excel') {
    const csvContent = exportToCSV(snapshots);
    const csvWithMetadata = `# 导出时间: ${metadata.exportedAt}\n# 快照数量: ${metadata.snapshotCount}\n# 页面状态校验码: ${metadata.pageStateHash}\n\n${csvContent}`;
    downloadFile(csvWithMetadata, `联邦客户端成本看板_${timestamp}.csv`, 'text/csv;charset=utf-8');
  }
};

const formatDate = (isoString: string): string => {
  return new Date(isoString).toLocaleString('zh-CN');
};

const formatDateForFilename = (date: Date): string => {
  return date.toISOString().replace(/[:.]/g, '-').slice(0, 19);
};

const mapStatus = (status: string): string => {
  const map: Record<string, string> = {
    normal: '正常',
    warning: '警告',
    error: '异常'
  };
  return map[status] || status;
};
