export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function truncateText(text: string, maxLen = 80): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '...';
}

export function formatCoordinates(x: number, y: number, z: number): string {
  return `X:${x.toFixed(1)} Y:${y.toFixed(1)} Z:${z.toFixed(0)}`;
}
