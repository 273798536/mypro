import type { RawComplaint, StandardComplaint, FieldMapping } from '@/shared/types';

export const DEFAULT_MAPPING: FieldMapping = {
  occurredAt: ['投诉时间', '发生时间', 'report_time', '时间', 'date', 'datetime', 'createdAt'],
  intersection: ['街口', '路口', 'location', '地点', '位置', 'address', '交叉口'],
  lng: ['经度', 'lng', 'lon', 'longitude', '经度值'],
  lat: ['纬度', 'lat', 'latitude', '纬度值'],
  source: ['来源', '渠道', 'feedback_source', '投诉来源', '来源渠道', 'from'],
  status: ['处理状态', '状态', 'state', '处理情况', 'progress'],
  content: ['投诉内容', '描述', 'content', '内容', '详情', 'description']
};

export function fuzzyMatchKey(obj: RawComplaint, candidates: string[]): string | undefined {
  const keys = Object.keys(obj);

  for (const cand of candidates) {
    const exact = keys.find(k => k === cand);
    if (exact) return exact;
  }

  for (const cand of candidates) {
    const lowerCand = cand.toLowerCase();
    const include = keys.find(k =>
      k.toLowerCase().includes(lowerCand) || lowerCand.includes(k.toLowerCase())
    );
    if (include) return include;
  }

  return undefined;
}

const STATUS_NORMALIZE_MAP: Record<string, StandardComplaint['status']> = {
  '未处理': '待确认',
  '待确认': '待确认',
  'pending': '待确认',
  '待办': '待确认',
  '待处理': '待确认',
  'PENDING': '待确认',
  'Pending': '待确认',
  '处理中': '处理中',
  '处理中…': '处理中',
  'processing': '处理中',
  'PROCESSING': '处理中',
  '进行中': '处理中',
  '已结案': '已结案',
  'closed': '已结案',
  'CLOSED': '已结案',
  'done': '已结案',
  '已完成': '已结案',
  '已归并': '已归并',
  'merged': '已归并',
  '坐标异常': '坐标异常'
};

const SOURCE_NORMALIZE_MAP: Record<string, StandardComplaint['source']> = {
  '12345': '12345',
  '12345热线': '12345',
  '12345市民热线': '12345',
  '市民热线': '12345',
  '热线': '12345',
  '社区群': '社区群',
  '微信群': '社区群',
  '业主群': '社区群',
  '社区微信群': '社区群',
  '现场走访': '现场走访',
  '现场': '现场走访',
  '上门走访': '现场走访',
  '现场核实': '现场走访',
  '其他': '其他',
  '其它': '其他',
  '其他渠道': '其他'
};

export function normalizeStatus(rawValue: unknown): StandardComplaint['status'] {
  if (typeof rawValue !== 'string') return '待确认';
  const trimmed = rawValue.trim();
  return STATUS_NORMALIZE_MAP[trimmed] ?? '待确认';
}

export function normalizeSource(rawValue: unknown): StandardComplaint['source'] {
  if (typeof rawValue !== 'string') return '其他';
  const trimmed = rawValue.trim();
  return SOURCE_NORMALIZE_MAP[trimmed] ?? '其他';
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const n = parseFloat(value);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

function toString(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value);
}

export function mapToStandard(
  raw: RawComplaint,
  mapping: FieldMapping
): Partial<StandardComplaint> & { raw: RawComplaint; id: string } {
  const result: Partial<StandardComplaint> & { raw: RawComplaint; id: string } = {
    id: raw._id,
    raw
  };

  const occurredAtKey = fuzzyMatchKey(raw, mapping.occurredAt);
  if (occurredAtKey !== undefined) {
    result.occurredAt = toString(raw[occurredAtKey]);
  }

  const intersectionKey = fuzzyMatchKey(raw, mapping.intersection);
  if (intersectionKey !== undefined) {
    result.intersection = toString(raw[intersectionKey]);
  }

  const lngKey = fuzzyMatchKey(raw, mapping.lng);
  if (lngKey !== undefined) {
    result.lng = toNumber(raw[lngKey]);
  }

  const latKey = fuzzyMatchKey(raw, mapping.lat);
  if (latKey !== undefined) {
    result.lat = toNumber(raw[latKey]);
  }

  const sourceKey = fuzzyMatchKey(raw, mapping.source);
  if (sourceKey !== undefined) {
    result.source = normalizeSource(raw[sourceKey]);
  }

  const statusKey = fuzzyMatchKey(raw, mapping.status);
  if (statusKey !== undefined) {
    result.status = normalizeStatus(raw[statusKey]);
  }

  const contentKey = fuzzyMatchKey(raw, mapping.content);
  if (contentKey !== undefined) {
    result.content = toString(raw[contentKey]);
  }

  return result;
}
