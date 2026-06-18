import crypto from 'crypto';

export function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const rand = crypto.randomBytes(4).toString('hex');
  return `${prefix}_${timestamp}_${rand}`;
}

export function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function generateRunFileName(runId: string, timestamp: number, suffix: string): string {
  const date = new Date(timestamp);
  const pad = (n: number) => n.toString().padStart(2, '0');
  const dateStr = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
  const timeStr = `${pad(date.getHours())}${pad(date.getMinutes())}`;
  const shortId = runId.split('_').slice(-1)[0].substring(0, 6);
  return `index_coverage_${dateStr}_${timeStr}_${shortId}.${suffix}`;
}

export function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.substring(0, maxLen - 3) + '...';
}

export function hashSchema(obj: unknown): string {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(obj))
    .digest('hex')
    .substring(0, 16);
}
