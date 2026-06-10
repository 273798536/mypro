export function formatDate(date: Date): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

export function formatNumber(num: number): string {
  return num.toLocaleString('zh-CN');
}

export function formatPercent(num: number): string {
  return `${num.toFixed(1)}%`;
}

export function formatReads(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(2)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(2)}K`;
  }
  return num.toString();
}

export function getQualityStatusColor(status: string): string {
  switch (status) {
    case 'pass':
      return 'bg-moss-green-100 text-moss-green-700 border-moss-green-200';
    case 'low_quality':
      return 'bg-warm-orange-100 text-warm-orange-700 border-warm-orange-200';
    case 'warning':
      return 'bg-warm-orange-100 text-warm-orange-700 border-warm-orange-200';
    case 'fail':
      return 'bg-rust-red-100 text-rust-red-700 border-rust-red-200';
    default:
      return 'bg-paper-100 text-paper-700 border-paper-200';
  }
}

export function getReviewStatusColor(status: string): string {
  switch (status) {
    case 'pending':
      return 'bg-paper-100 text-paper-700 border-paper-300';
    case 'reviewing':
      return 'bg-warm-orange-100 text-warm-orange-700 border-warm-orange-200';
    case 'confirmed':
      return 'bg-moss-green-100 text-moss-green-700 border-moss-green-200';
    case 'rejected':
      return 'bg-rust-red-100 text-rust-red-700 border-rust-red-200';
    default:
      return 'bg-paper-100 text-paper-700 border-paper-200';
  }
}

export function getOperationTypeColor(type: string): string {
  switch (type) {
    case 'import':
      return 'bg-deep-sea-100 text-deep-sea-700';
    case 'modify_group':
      return 'bg-warm-orange-100 text-warm-orange-700';
    case 'modify_quality':
      return 'bg-rust-red-100 text-rust-red-700';
    case 'add_note':
      return 'bg-paper-200 text-paper-800';
    case 'confirm':
      return 'bg-moss-green-100 text-moss-green-700';
    case 'reject':
      return 'bg-rust-red-100 text-rust-red-700';
    case 'revert':
      return 'bg-paper-300 text-paper-900';
    default:
      return 'bg-paper-100 text-paper-700';
  }
}

export function generateId(prefix: string = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
