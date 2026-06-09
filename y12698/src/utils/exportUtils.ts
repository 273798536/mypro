import type { ScreenshotItem } from '../types';

export function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function downloadJSON(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function batchExportScreenshots(items: ScreenshotItem[]) {
  const metadata = items.map((item) => ({
    id: item.id,
    name: item.name,
    filename: `${item.id}.png`,
    viewpointName: item.viewpointName,
    timeParam: item.timeParam,
    metadata: item.metadata,
    createdAt: item.createdAt,
  }));

  downloadJSON(metadata, 'screenshots-metadata.json');

  items.forEach((item, idx) => {
    setTimeout(() => {
      downloadDataUrl(item.dataUrl, `${item.id}.png`);
    }, idx * 200);
  });
}

export function timestampName(prefix = 'screenshot'): string {
  const now = new Date();
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const hms = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
  return `${prefix}-${ymd}-${hms}`;
}
