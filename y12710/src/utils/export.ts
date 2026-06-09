import type { Draft, DataRow } from '@/types';

export function exportToCSV(draft: Draft): string {
  const headers = [
    '序号',
    'X值',
    'Y值',
    'FFT振幅',
    '滤波后振幅',
    '备注',
    '可用性',
    '复核状态',
    '是否重复',
    '是否空值',
  ];

  const statusMap: Record<string, string> = {
    available: '可用',
    pending: '暂缓',
    recollect: '重新采集',
    none: '未复核',
    pending_review: '待复核',
    approved: '已通过',
  };

  const rows = draft.dataRows.map((row: DataRow) => [
    row.index,
    row.xValue ?? '',
    row.yValue ?? '',
    row.fftAmplitude ?? '',
    row.filteredAmplitude ?? '',
    row.remark ?? '',
    row.availability ? statusMap[row.availability] : '',
    statusMap[row.reviewStatus] ?? row.reviewStatus,
    row.isDuplicate ? '是' : '否',
    row.isEmpty ? '是' : '否',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((r) => r.map((v) => `"${v}"`).join(',')),
  ].join('\n');

  return '\uFEFF' + csvContent;
}

export function exportToJSON(draft: Draft): string {
  return JSON.stringify(
    {
      exportTime: new Date().toISOString(),
      draft: {
        id: draft.id,
        title: draft.title,
        author: draft.author,
        version: draft.currentVersion,
        fourierConfig: draft.fourierConfig,
        dataRows: draft.dataRows,
        versionLogs: draft.versionLogs,
      },
      charts: {
        spectrumData: draft.dataRows
          .filter((r) => r.xValue !== null && r.fftAmplitude !== null)
          .map((r) => ({
            frequency: r.xValue,
            original: r.fftAmplitude,
            filtered: r.filteredAmplitude,
          })),
      },
    },
    null,
    2,
  );
}

export function downloadFile(content: string, filename: string, mimeType: string) {
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

export function downloadDraft(draft: Draft) {
  const csv = exportToCSV(draft);
  const json = exportToJSON(draft);

  downloadFile(csv, `${draft.title}_明细.csv`, 'text/csv;charset=utf-8');
  setTimeout(() => {
    downloadFile(json, `${draft.title}_数据包.json`, 'application/json');
  }, 200);
}
