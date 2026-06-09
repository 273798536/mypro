interface TimestampParts {
  YYYY: number;
  MM: string;
  DD: string;
  HH: string;
  mm: string;
  ss: string;
}

export function formatTimestamp(date: Date = new Date()): TimestampParts {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const YYYY = date.getFullYear();
  const MM = pad(date.getMonth() + 1);
  const DD = pad(date.getDate());
  const HH = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return { YYYY, MM, DD, HH, mm, ss };
}

export function generateReportFileName(
  batchId: string,
  extension: 'html' | 'csv' | 'json'
): string {
  const { YYYY, MM, DD, HH, mm, ss } = formatTimestamp();
  const shortBatchId = batchId.slice(0, 12);
  return `溶解度分析报告_批号_${shortBatchId}_${YYYY}${MM}${DD}_${HH}${mm}${ss}.${extension}`;
}

export function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  const { YYYY, MM, DD, HH, mm } = formatTimestamp(date);
  return `${YYYY}-${MM}-${DD} ${HH}:${mm}`;
}
