import type {
  ShipTrack,
  AquacultureLog,
  SalinityData,
  DataRecord,
  TraceStep
} from '@/types';

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const CENTER_LAT = 25.0;
const CENTER_LNG = 119.5;

const vesselNames = [
  '远洋一号', '东海明珠', '闽渔888', '浙渔666', '粤渔333',
  '海之星', '蓝色梦想', '远航者', '探索号', '守护者'
];

const farmNames = [
  '东岛养殖基地', '西屿海参场', '南礁鲍鱼场', '北湾鱼类养殖', '中海贝场',
  '明珠养殖园', '碧海养殖场', '蓝天渔场', '黄金海岸', '深蓝牧场'
];

const stationNames = [
  '监测站A1', '监测站A2', '监测站B1', '监测站B2', '监测站C1',
  '监测站C2', '监测站D1', '监测站D2', '监测站E1', '监测站E2'
];

const sources = [
  '船舶AIS系统', '养殖监控平台', '海洋环境监测站',
  '手动录入', '卫星遥感', '无人机巡检'
];

export function generateShipTrack(
  baseTime: number,
  index: number,
  hasIssues: boolean = false
): ShipTrack {
  const latOffset = randomBetween(-0.2, 0.2);
  const lngOffset = randomBetween(-0.2, 0.2);
  const depth = hasIssues && Math.random() < 0.3 ? randomBetween(-10, -1) : randomBetween(10, 100);

  return {
    id: generateId('ship'),
    type: 'ship_track',
    timestamp: baseTime + index * 3600000 + randomBetween(-1800000, 1800000),
    location: {
      lat: CENTER_LAT + latOffset,
      lng: CENTER_LNG + lngOffset,
      depth
    },
    source: randomPick(sources),
    importBatch: generateId('batch'),
    status: 'pending',
    qualityIssues: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    correctionHistory: [],
    vesselId: `VSL${String(index + 1).padStart(4, '0')}`,
    vesselName: randomPick(vesselNames),
    speed: randomBetween(5, 25),
    heading: randomBetween(0, 360),
    powerConsumption: hasIssues && Math.random() < 0.2
      ? randomBetween(500, 800)
      : randomBetween(50, 350)
  };
}

export function generateAquacultureLog(
  baseTime: number,
  index: number,
  hasIssues: boolean = false
): AquacultureLog {
  const latOffset = randomBetween(-0.15, 0.15);
  const lngOffset = randomBetween(-0.15, 0.15);

  return {
    id: generateId('aqua'),
    type: 'aquaculture_log',
    timestamp: baseTime + index * 86400000 + randomBetween(-3600000, 3600000),
    location: {
      lat: CENTER_LAT + latOffset,
      lng: CENTER_LNG + lngOffset,
      depth: randomBetween(5, 50)
    },
    source: randomPick(sources),
    importBatch: generateId('batch'),
    status: 'pending',
    qualityIssues: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    correctionHistory: [],
    farmId: `FRM${String(index + 1).padStart(3, '0')}`,
    farmName: randomPick(farmNames),
    equipmentCount: Math.floor(randomBetween(10, 100)),
    dailyPowerUsage: hasIssues && Math.random() < 0.2
      ? randomBetween(200, 400)
      : randomBetween(20, 150),
    stockDensity: randomBetween(10, 100)
  };
}

export function generateSalinityData(
  baseTime: number,
  index: number,
  hasIssues: boolean = false
): SalinityData {
  const latOffset = randomBetween(-0.1, 0.1);
  const lngOffset = randomBetween(-0.1, 0.1);

  const units: Array<'ppt' | 'psu' | '‰'> = ['ppt', 'psu', '‰'];
  const unit = hasIssues && Math.random() < 0.4
    ? randomPick(units)
    : 'ppt';

  const depth = hasIssues && Math.random() < 0.25 ? randomBetween(-5, -0.5) : randomBetween(5, 80);

  return {
    id: generateId('salt'),
    type: 'salinity',
    timestamp: baseTime + index * 1800000 + randomBetween(-900000, 900000),
    location: {
      lat: CENTER_LAT + latOffset,
      lng: CENTER_LNG + lngOffset,
      depth
    },
    source: randomPick(sources),
    importBatch: generateId('batch'),
    status: 'pending',
    qualityIssues: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    correctionHistory: [],
    stationId: `STN${String(index + 1).padStart(2, '0')}`,
    salinity: hasIssues && Math.random() < 0.15
      ? randomBetween(10, 50)
      : randomBetween(28, 35),
    unit,
    temperature: randomBetween(15, 30),
    relatedLoad: randomBetween(10, 200)
  };
}

export function generateMockDataset(count: number = 30): {
  shipTracks: ShipTrack[];
  aquacultureLogs: AquacultureLog[];
  salinityData: SalinityData[];
} {
  const baseTime = Date.now() - 7 * 24 * 3600000;
  const shipCount = Math.floor(count * 0.35);
  const aquaCount = Math.floor(count * 0.3);
  const saltCount = count - shipCount - aquaCount;

  const shipTracks: ShipTrack[] = [];
  const aquacultureLogs: AquacultureLog[] = [];
  const salinityData: SalinityData[] = [];

  for (let i = 0; i < shipCount; i++) {
    shipTracks.push(generateShipTrack(baseTime, i, i < Math.floor(shipCount * 0.3)));
  }

  for (let i = 0; i < aquaCount; i++) {
    aquacultureLogs.push(generateAquacultureLog(baseTime, i, i < Math.floor(aquaCount * 0.25)));
  }

  for (let i = 0; i < saltCount; i++) {
    salinityData.push(generateSalinityData(baseTime, i, i < Math.floor(saltCount * 0.35)));
  }

  return { shipTracks, aquacultureLogs, salinityData };
}

export function generateAllRecords(count: number = 30): DataRecord[] {
  const { shipTracks, aquacultureLogs, salinityData } = generateMockDataset(count);
  return [...shipTracks, ...aquacultureLogs, ...salinityData];
}

export function generateTraceSteps(recordId: string): TraceStep[] {
  const steps: TraceStep[] = [];
  const baseTime = Date.now() - 7 * 24 * 3600000;

  steps.push({
    id: generateId('trace'),
    timestamp: baseTime,
    operation: '原始数据采集',
    operator: 'AIS系统',
    details: { device: 'AIS-001', signal: 'strong' },
    sourceData: 'AIS广播数据'
  });

  steps.push({
    id: generateId('trace'),
    timestamp: baseTime + 3600000,
    operation: '数据预处理',
    operator: 'ETL Pipeline',
    details: { format: 'JSON', records: 1 },
    sourceData: '原始报文'
  });

  steps.push({
    id: generateId('trace'),
    timestamp: baseTime + 7200000,
    operation: '质量检测',
    operator: 'Quality Check v2.1',
    details: { checks: ['格式', '范围', '一致性'], passed: true },
    sourceData: '标准化数据'
  });

  return steps;
}

export function generateDuplicateRecord(original: DataRecord): DataRecord {
  return {
    ...original,
    id: generateId(original.type === 'ship_track' ? 'ship' : original.type === 'aquaculture_log' ? 'aqua' : 'salt'),
    timestamp: original.timestamp + randomBetween(-30000, 30000),
    importBatch: generateId('batch'),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    correctionHistory: []
  };
}
