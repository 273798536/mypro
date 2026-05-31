const API_BASE = '/api';

export async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || '请求失败');
  return json.data as T;
}

export function formatMoney(amount: number): string {
  return amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('zh-CN');
}

export function depositStatusBadge(status: string): string {
  const map: Record<string, string> = {
    '待收': 'badge-amber',
    '已收': 'badge-green',
    '部分退': 'badge-teal',
    '已退': 'badge-gray',
  };
  return map[status] || 'badge-gray';
}

export function eventStatusBadge(status: string): string {
  const map: Record<string, string> = {
    '申请': 'badge-amber',
    '试算': 'badge-blue',
    '待确认': 'badge-teal',
    '已完成': 'badge-green',
  };
  return map[status] || 'badge-gray';
}

export function bedStatusBadge(status: string): string {
  const map: Record<string, string> = {
    '空': 'badge-green',
    '已住': 'badge-teal',
    '待转出': 'badge-amber',
    '待转入': 'badge-amber',
  };
  return map[status] || 'badge-gray';
}

export function eventTypeBadge(type: string): string {
  const map: Record<string, string> = {
    '转房补差': 'badge-blue',
    '短住退押': 'badge-amber',
    '护理变更': 'badge-teal',
  };
  return map[type] || 'badge-gray';
}

export function txTypeBadge(type: string): string {
  const map: Record<string, string> = {
    '收取': 'badge-green',
    '退还': 'badge-amber',
    '补差收取': 'badge-blue',
    '补差退还': 'badge-teal',
    '费用抵扣': 'badge-red',
  };
  return map[type] || 'badge-gray';
}
