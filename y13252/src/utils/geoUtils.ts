export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function getStatusText(status: string): string {
  const map: Record<string, string> = {
    pending: '待处理',
    processing: '处理中',
    resolved: '已完成'
  };
  return map[status] || status;
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800 border-amber-200',
    processing: 'bg-blue-100 text-blue-800 border-blue-200',
    resolved: 'bg-green-100 text-green-800 border-green-200'
  };
  return map[status] || 'bg-slate-100 text-slate-800 border-slate-200';
}

export function getChangeTypeText(type: string): string {
  const map: Record<string, string> = {
    photo_add: '补录照片',
    coordinate_fix: '坐标修正',
    status_update: '状态更新',
    rerun: '重跑校验'
  };
  return map[type] || type;
}

export function getChangeTypeColor(type: string): string {
  const map: Record<string, string> = {
    photo_add: 'bg-emerald-100 text-emerald-800',
    coordinate_fix: 'bg-blue-100 text-blue-800',
    status_update: 'bg-amber-100 text-amber-800',
    rerun: 'bg-purple-100 text-purple-800'
  };
  return map[type] || 'bg-slate-100 text-slate-800';
}
