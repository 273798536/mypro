import type { WindProfilePoint } from '@/types';

export const CSV_HEADERS = [
  'ID',
  '测站',
  '高度',
  '单位',
  '风速(m/s)',
  '风向(°)',
  '时间',
  '是否异常',
  '关联批注',
];

export function toCsvRows(points: WindProfilePoint[]): string {
  const lines = [CSV_HEADERS.join(',')];
  points.forEach((p) => {
    const row = [
      p.id,
      p.station,
      p.height,
      p.heightUnit,
      p.windSpeed.toFixed(1),
      p.windDirection,
      p.timestamp,
      p.isAnomaly ? '是' : '否',
      p.linkedRecordId ?? '',
    ].map((v) => {
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    });
    lines.push(row.join(','));
  });
  return lines.join('\n');
}

export function downloadCsv(points: WindProfilePoint[], filename = 'wind_profile_detail.csv') {
  const csv = toCsvRows(points);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  document.body.removeChild(ta);
  return Promise.resolve(ok);
}
