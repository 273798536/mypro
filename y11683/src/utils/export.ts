import type { FuturesData, CorrectionRecord } from '../types';

export function exportCanvasAsPNG(
  canvas: HTMLCanvasElement,
  filename: string = 'futures-tunnel.png'
): void {
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export function exportDataAsCSV(
  data: FuturesData[],
  corrections: CorrectionRecord[],
  filename: string = 'futures-data.csv'
): void {
  const headers = [
    '原始行号',
    '合约月份',
    '价格',
    '成交量',
    '基差',
    '时间窗口',
    '研究备注',
    '数据来源',
    '状态',
    '修正记录',
  ];

  const correctionMap = new Map<string, CorrectionRecord[]>();
  for (const c of corrections) {
    if (!correctionMap.has(c.dataId)) {
      correctionMap.set(c.dataId, []);
    }
    correctionMap.get(c.dataId)!.push(c);
  }

  const rows = data.map((d) => {
    const dataCorrections = correctionMap.get(d.id) || [];
    const correctionStr = dataCorrections
      .map((c) => `${c.fieldName}:${c.oldValue}→${c.newValue}`)
      .join('|');
    return [
      d.originalRow,
      d.contractMonth,
      d.price,
      d.volume,
      d.basis,
      d.timeWindow,
      d.notes,
      d.source,
      d.status,
      correctionStr,
    ];
  });

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  link.download = filename;
  link.href = URL.createObjectURL(blob);
  link.click();
  URL.revokeObjectURL(link.href);
}

export function exportErrorsAsCSV(
  detections: {
    id: string;
    type: string;
    severity: string;
    description: string;
    originalRow: number;
    resolved: boolean;
  }[],
  filename: string = 'detection-errors.csv'
): void {
  const headers = ['ID', '类型', '严重程度', '描述', '原始行号', '是否解决'];
  const rows = detections.map((d) => [
    d.id,
    d.type,
    d.severity,
    d.description,
    d.originalRow,
    d.resolved ? '是' : '否',
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  link.download = filename;
  link.href = URL.createObjectURL(blob);
  link.click();
  URL.revokeObjectURL(link.href);
}