export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function formatNumber(value: number, decimals = 4): string {
  return value.toFixed(decimals);
}

export function statusColorClass(status: 'pending' | 'reviewing' | 'exception' | 'done') {
  switch (status) {
    case 'pending':
      return 'bg-ink-100 text-ink-700 border-ink-300';
    case 'reviewing':
      return 'bg-amber-50 text-amber-500 border-amber-300';
    case 'exception':
      return 'bg-amber-100 text-amber-600 border-amber-400';
    case 'done':
      return 'bg-mint-50 text-mint-500 border-mint-300';
  }
}

export function versionColorDot(version: string) {
  const colors = [
    'bg-ink-500',
    'bg-amber-400',
    'bg-mint-400',
    'bg-ink-300',
    'bg-amber-200',
  ];
  const n = parseInt(version.replace(/\D/g, ''), 10) || 0;
  return colors[n % colors.length];
}
