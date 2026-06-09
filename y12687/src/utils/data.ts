import type { DataRecord, ProfileSnapshot, HistoryEntry, Anomaly, CollisionEvent, ViewState } from '../types';

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
};

export const BOUNDARY = {
  xMin: 0,
  xMax: 100,
  yMin: 0,
  yMax: 80,
  floorMin: 1,
  floorMax: 3,
  peopleMin: 0,
  peopleMax: 200,
};

export const checkOutOfBounds = (record: DataRecord): boolean => {
  return (
    record.x < BOUNDARY.xMin ||
    record.x > BOUNDARY.xMax ||
    record.y < BOUNDARY.yMin ||
    record.y > BOUNDARY.yMax ||
    record.floor < BOUNDARY.floorMin ||
    record.floor > BOUNDARY.floorMax ||
    record.peopleCount < BOUNDARY.peopleMin ||
    record.peopleCount > BOUNDARY.peopleMax
  );
};

export const detectAnomalies = (records: DataRecord[]): DataRecord[] => {
  return records.map((r) => {
    const isOutOfBounds = checkOutOfBounds(r);
    const isSpike = !isOutOfBounds && r.peopleCount > 160;
    const isZero = !isOutOfBounds && r.peopleCount === 0 && r.timestamp > 0;

    let anomalyType: DataRecord['anomalyType'];
    if (isOutOfBounds) anomalyType = 'out_of_bounds';
    else if (isSpike) anomalyType = 'sudden_spike';
    else if (isZero) anomalyType = 'zero_flow';

    return {
      ...r,
      isAnomaly: !!(isOutOfBounds || isSpike || isZero),
      anomalyType,
    };
  });
};

export const generateMockData = (count: number = 120): DataRecord[] => {
  const records: DataRecord[] = [];
  const baseTime = Date.now() - count * 60000;

  for (let i = 0; i < count; i++) {
    const isAnomalyPoint = Math.random() < 0.12;

    let x: number, y: number, floor: number, peopleCount: number;

    if (isAnomalyPoint && Math.random() < 0.5) {
      const anomalyKind = Math.floor(Math.random() * 3);
      switch (anomalyKind) {
        case 0:
          x = Math.random() < 0.5 ? -5 - Math.random() * 10 : 105 + Math.random() * 10;
          y = 20 + Math.random() * 40;
          floor = 2;
          peopleCount = Math.floor(30 + Math.random() * 70);
          break;
        case 1:
          x = 30 + Math.random() * 40;
          y = Math.random() < 0.5 ? -5 - Math.random() * 10 : 85 + Math.random() * 10;
          floor = 2;
          peopleCount = Math.floor(30 + Math.random() * 70);
          break;
        default:
          x = 30 + Math.random() * 40;
          y = 20 + Math.random() * 40;
          floor = Math.random() < 0.5 ? 0 : 5;
          peopleCount = Math.floor(30 + Math.random() * 70);
      }
    } else {
      x = 5 + Math.random() * 90;
      y = 5 + Math.random() * 70;
      floor = Math.floor(1 + Math.random() * 3);
      peopleCount = isAnomalyPoint
        ? Math.random() < 0.5
          ? 170 + Math.floor(Math.random() * 50)
          : 0
        : Math.floor(15 + Math.random() * 120);
    }

    records.push({
      id: generateId(),
      timestamp: baseTime + i * 60000,
      x,
      y,
      floor,
      peopleCount,
      isAnomaly: false,
    });
  }

  return detectAnomalies(records);
};

export const createProfileSnapshot = (
  data: DataRecord[],
  version: number,
  label: string
): ProfileSnapshot => ({
  id: generateId(),
  timestamp: Date.now(),
  data: [...data],
  version,
  label,
});

export const createHistoryEntry = (
  anomalyId: string,
  action: HistoryEntry['action'],
  user: string,
  reason: string
): HistoryEntry => ({
  id: generateId(),
  anomalyId,
  action,
  user,
  reason,
  timestamp: Date.now(),
});

export const createAnomaly = (recordId: string): Anomaly => ({
  id: generateId(),
  recordId,
  status: 'pending',
  reviewer: '',
  comment: '',
  reviewedAt: 0,
});

export const createCollisionEvent = (
  recordId: string,
  type: CollisionEvent['type'],
  details: string
): CollisionEvent => ({
  recordId,
  timestamp: Date.now(),
  type,
  details,
});

export const formatTime = (ts: number): string => {
  const d = new Date(ts);
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

export const formatDateTime = (ts: number): string => {
  const d = new Date(ts);
  return d.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

export const anomalyTypeLabel = (type?: DataRecord['anomalyType']): string => {
  switch (type) {
    case 'out_of_bounds':
      return '剖切面越界';
    case 'sudden_spike':
      return '人流突增';
    case 'zero_flow':
      return '零人流异常';
    default:
      return '未知异常';
  }
};

export const statusLabel = (status: string): string => {
  switch (status) {
    case 'pending':
      return '待复核';
    case 'confirmed':
      return '已确认';
    case 'dismissed':
      return '已排除';
    default:
      return status;
  }
};

export const actionLabel = (action: string): string => {
  switch (action) {
    case 'created':
      return '标记异常';
    case 'confirmed':
      return '复核通过';
    case 'dismissed':
      return '排除异常';
    case 'updated':
      return '更新记录';
    default:
      return action;
  }
};

export const checkCollision = (
  view: ViewState,
  canvasWidth: number,
  canvasHeight: number,
  mouseX: number,
  mouseY: number,
  records: DataRecord[],
  threshold: number = 12
): DataRecord | null => {
  for (const record of records) {
    const screenX = (record.x - view.offsetX) * view.scale;
    const screenY = (record.y - view.offsetY) * view.scale;
    const dx = mouseX - screenX;
    const dy = mouseY - screenY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < threshold) {
      return record;
    }
  }
  return null;
};
