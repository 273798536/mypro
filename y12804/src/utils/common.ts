export function generateId(prefix = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}${timestamp}${random}`;
}

export function formatDate(date: string | Date, format = 'YYYY-MM-DD'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');

  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

export function formatDateTime(date: string | Date): string {
  return formatDate(date, 'YYYY-MM-DD HH:mm:ss');
}

export function generateBatchNumber(prefix = 'RUN'): string {
  const now = new Date();
  const datePart = formatDate(now, 'YYYYMMDD');
  const randomPart = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}-${datePart}-${randomPart}`;
}

export function generateExportFileName(runBatchNumber: string, format: string): string {
  const timestamp = formatDate(new Date(), 'YYYYMMDD_HHmmss');
  const ext = format === 'csv' ? 'csv' : 'html';
  return `小鼠笼位健康台账_${runBatchNumber}_${timestamp}.${ext}`;
}
