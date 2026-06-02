import type { DopplerRecord, Direction, StatusRule, CalculationStatus, CalculationMode } from '../types/doppler';

const DEFAULT_SPEED_OF_SOUND = 343;

export function calculateSpeedOfSound(temperature: number | null): number {
  if (temperature === null || temperature === undefined) {
    return DEFAULT_SPEED_OF_SOUND;
  }
  return 331.3 * Math.sqrt(1 + temperature / 273.15);
}

export function calculateFrequencyShift(emitted: number | null, received: number | null): number | null {
  if (emitted === null || received === null) return null;
  return received - emitted;
}

export function calculateVelocityFromFrequency(
  emittedFrequency: number,
  receivedFrequency: number,
  direction: Direction,
  speedOfSound: number
): number | null {
  if (!direction) return null;
  
  if (receivedFrequency === 0 || emittedFrequency === 0) return null;
  
  const frequencyRatio = emittedFrequency / receivedFrequency;
  let velocity: number;
  
  if (direction === 'approaching') {
    velocity = speedOfSound * (1 - frequencyRatio);
  } else {
    velocity = speedOfSound * (frequencyRatio - 1);
  }
  
  return Math.round(Math.abs(velocity) * 100) / 100;
}

export function calculateFrequencyFromVelocity(
  emittedFrequency: number,
  velocity: number,
  direction: Direction,
  speedOfSound: number
): number | null {
  if (!direction) return null;
  
  const directionMultiplier = direction === 'approaching' ? 1 : -1;
  const denominator = speedOfSound - velocity * directionMultiplier;
  
  if (denominator === 0) return null;
  
  const receivedFrequency = emittedFrequency * speedOfSound / denominator;
  
  return Math.round(receivedFrequency * 100) / 100;
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export function generateFingerprint(record: Partial<DopplerRecord>): string {
  const data = [
    record.emittedFrequency,
    record.receivedFrequency,
    record.velocity,
    record.direction,
    record.temperature
  ].join('|');
  
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

export const statusRules: StatusRule[] = [
  {
    field: 'emittedFrequency',
    condition: (r) => r.emittedFrequency === null,
    status: 'incomplete',
    reason: '缺少发射频率',
    priority: 10
  },
  {
    field: 'receivedFrequency',
    condition: (r) => r.receivedFrequency === null && r.velocity === null,
    status: 'incomplete',
    reason: '缺少接收频率或速度',
    priority: 9
  },
  {
    field: 'direction',
    condition: (r) => r.direction === null,
    status: 'pending',
    reason: '运动方向未确认',
    priority: 8
  },
  {
    field: 'temperature',
    condition: (r) => r.temperature === null,
    status: 'pending',
    reason: '未进行温度修正，使用默认声速343m/s',
    priority: 7
  },
  {
    field: 'derived',
    condition: (r) => {
      if (r.receivedFrequency === null || r.emittedFrequency === null || !r.direction) return false;
      return r.receivedFrequency > r.emittedFrequency && r.direction === 'receding';
    },
    status: 'pending',
    reason: '接收频率大于发射频率但标记为远离，方向可能反判',
    priority: 6
  },
  {
    field: 'derived',
    condition: (r) => {
      if (r.receivedFrequency === null || r.emittedFrequency === null || !r.direction) return false;
      return r.receivedFrequency < r.emittedFrequency && r.direction === 'approaching';
    },
    status: 'pending',
    reason: '接收频率小于发射频率但标记为靠近，方向可能反判',
    priority: 5
  },
  {
    field: 'velocity',
    condition: (r) => r.velocity !== null && Math.abs(r.velocity) > r.speedOfSound,
    status: 'error',
    reason: '速度超过声速限制',
    priority: 4
  },
  {
    field: 'emittedFrequency',
    condition: (r) => r.emittedFrequency !== null && r.emittedFrequency < 0,
    status: 'error',
    reason: '发射频率不能为负值',
    priority: 3
  },
  {
    field: 'receivedFrequency',
    condition: (r) => r.receivedFrequency !== null && r.receivedFrequency < 0,
    status: 'error',
    reason: '接收频率不能为负值',
    priority: 2
  },
  {
    field: 'velocity',
    condition: (r) => r.velocity !== null && r.velocity < 0,
    status: 'error',
    reason: '速度不能为负值，方向通过方向字段表示',
    priority: 1
  }
];

export function determineStatus(record: DopplerRecord): { status: CalculationStatus; reasons: string[] } {
  const matchedRules = statusRules.filter(rule => rule.condition(record));
  
  if (matchedRules.length === 0) {
    return { status: 'normal', reasons: ['计算正常'] };
  }
  
  const sortedRules = [...matchedRules].sort((a, b) => b.priority - a.priority);
  const highestPriority = sortedRules[0];
  
  const reasons = sortedRules.map(r => r.reason);
  
  if (sortedRules.some(r => r.status === 'error')) {
    return { status: 'error', reasons };
  }
  if (sortedRules.some(r => r.status === 'pending')) {
    return { status: 'pending', reasons };
  }
  if (sortedRules.some(r => r.status === 'incomplete')) {
    return { status: 'incomplete', reasons };
  }
  
  return { status: highestPriority.status, reasons };
}

export function createEmptyRecord(source: 'manual' | 'import' | 'demo' = 'manual', sourceNote?: string): DopplerRecord {
  const now = Date.now();
  const record: DopplerRecord = {
    id: generateId(),
    fingerprint: '',
    createdAt: now,
    updatedAt: now,
    source,
    sourceNote,
    emittedFrequency: null,
    receivedFrequency: null,
    velocity: null,
    direction: null,
    temperature: null,
    speedOfSound: DEFAULT_SPEED_OF_SOUND,
    frequencyShift: null,
    status: 'incomplete',
    statusReasons: ['新记录，等待输入数据'],
    calculationLog: []
  };
  record.fingerprint = generateFingerprint(record);
  return record;
}

export function updateRecordCalculations(record: DopplerRecord, mode?: CalculationMode): DopplerRecord {
  const updated = { ...record };
  
  updated.speedOfSound = calculateSpeedOfSound(record.temperature);
  updated.frequencyShift = calculateFrequencyShift(record.emittedFrequency, record.receivedFrequency);
  
  if (mode === 'frequency_to_velocity' && record.emittedFrequency !== null && record.receivedFrequency !== null && record.direction) {
    updated.velocity = calculateVelocityFromFrequency(
      record.emittedFrequency,
      record.receivedFrequency,
      record.direction,
      updated.speedOfSound
    );
  }
  
  if (mode === 'velocity_to_frequency' && record.emittedFrequency !== null && record.velocity !== null && record.direction) {
    updated.receivedFrequency = calculateFrequencyFromVelocity(
      record.emittedFrequency,
      record.velocity,
      record.direction,
      updated.speedOfSound
    );
    updated.frequencyShift = calculateFrequencyShift(record.emittedFrequency, updated.receivedFrequency);
  }
  
  const { status, reasons } = determineStatus(updated);
  updated.status = status;
  updated.statusReasons = reasons;
  
  updated.fingerprint = generateFingerprint(updated);
  updated.updatedAt = Date.now();
  
  return updated;
}

export function addCalculationLog(record: DopplerRecord, field: string, oldValue: any, newValue: any): DopplerRecord {
  return {
    ...record,
    calculationLog: [
      ...record.calculationLog,
      {
        timestamp: Date.now(),
        field,
        oldValue,
        newValue
      }
    ]
  };
}

export function exportToCSV(records: DopplerRecord[]): string {
  const headers = [
    'ID', '发射频率(Hz)', '接收频率(Hz)', '频移(Hz)', '速度(m/s)',
    '运动方向', '温度(°C)', '声速(m/s)', '状态', '原因说明',
    '数据来源', '创建时间', '更新时间'
  ];
  
  const directionMap: Record<string, string> = {
    'approaching': '靠近',
    'receding': '远离'
  };
  
  const statusMap: Record<string, string> = {
    'incomplete': '未完成',
    'normal': '正常',
    'pending': '待确认',
    'error': '异常'
  };
  
  const rows = records.map(r => [
    r.id,
    r.emittedFrequency ?? '',
    r.receivedFrequency ?? '',
    r.frequencyShift ?? '',
    r.velocity ?? '',
    r.direction ? directionMap[r.direction] : '',
    r.temperature ?? '',
    r.speedOfSound,
    statusMap[r.status],
    r.statusReasons.join('; '),
    r.source,
    new Date(r.createdAt).toLocaleString('zh-CN'),
    new Date(r.updatedAt).toLocaleString('zh-CN')
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  return csvContent;
}

export function exportToJSON(records: DopplerRecord[]): string {
  return JSON.stringify(records, null, 2);
}

export function parseCSV(csvText: string): Partial<DopplerRecord>[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
    const record: Partial<DopplerRecord> = {};
    
    headers.forEach((header, index) => {
      const value = values[index];
      switch (header) {
        case '发射频率(Hz)':
          record.emittedFrequency = value ? parseFloat(value) : null;
          break;
        case '接收频率(Hz)':
          record.receivedFrequency = value ? parseFloat(value) : null;
          break;
        case '速度(m/s)':
          record.velocity = value ? parseFloat(value) : null;
          break;
        case '运动方向':
          if (value === '靠近') record.direction = 'approaching';
          else if (value === '远离') record.direction = 'receding';
          else record.direction = null;
          break;
        case '温度(°C)':
          record.temperature = value ? parseFloat(value) : null;
          break;
        case '数据来源备注':
          record.sourceNote = value || undefined;
          break;
      }
    });
    
    return record;
  });
}
