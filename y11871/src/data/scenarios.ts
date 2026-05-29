import { DemoScenario, ParkingRecord, DateType } from '../types/parking';

const SEED = 42;

const seededRandom = (seed: number) => {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
};

const generateId = (): string => Math.random().toString(36).substring(2, 11);

const buildSmoothOccupancy = (hour: number, floor: number, random: () => number): number => {
  const basePattern = 
    hour < 6 ? 0.1 + random() * 0.1 :
    hour < 9 ? 0.2 + (hour - 6) * 0.15 + random() * 0.1 :
    hour < 12 ? 0.5 + (hour - 9) * 0.08 + random() * 0.1 :
    hour < 14 ? 0.75 + random() * 0.1 :
    hour < 17 ? 0.6 + random() * 0.15 :
    hour < 20 ? 0.7 + (hour - 17) * 0.07 + random() * 0.1 :
    hour < 22 ? 0.85 + random() * 0.1 :
    0.4 + random() * 0.1;
  
  const floorBias = [0, -0.05, -0.1, -0.15][floor] || 0;
  return Math.max(0, Math.min(1, basePattern + floorBias));
};

const buildSmoothQueue = (hour: number, entrance: number, random: () => number): { queue: number; incoming: number } => {
  const baseQueue = 
    hour < 7 ? 0 :
    hour < 10 ? Math.round((hour - 7) * 3 + random() * 3) :
    hour < 12 ? Math.round(8 + random() * 5) :
    hour < 14 ? Math.round(5 + random() * 4) :
    hour < 17 ? Math.round(3 + random() * 3) :
    hour < 20 ? Math.round((hour - 17) * 4 + random() * 5) :
    hour < 22 ? Math.round(10 + random() * 6) :
    Math.round(3 + random() * 3);
  
  const entranceBias = [0, 2, -1, 1][entrance] || 0;
  const queue = Math.max(0, baseQueue + entranceBias);
  const incoming = Math.round(20 + hour * 3 + random() * 30);
  
  return { queue, incoming };
};

const buildBlockedQueue = (hour: number, entrance: number, random: () => number, blockedEntrance: number): { queue: number; incoming: number } => {
  if (entrance === blockedEntrance && hour >= 17 && hour <= 20) {
    const blockageIntensity = 
      hour < 17.5 ? (hour - 17) * 2 :
      hour < 19 ? 1 :
      (20 - hour) * 0.8;
    return {
      queue: Math.round(15 + blockageIntensity * 25 + random() * 5),
      incoming: Math.round(60 + blockageIntensity * 30 + random() * 20),
    };
  }
  return buildSmoothQueue(hour, entrance, random);
};

const buildFullFloorOccupancy = (hour: number, floor: number, random: () => number, fullFloor: number): number => {
  if (floor === fullFloor && hour >= 18 && hour <= 21) {
    return 0.95 + random() * 0.05;
  }
  return buildSmoothOccupancy(hour, floor, random);
};

const buildEventOccupancy = (hour: number, floor: number, random: () => number): number => {
  const eventBoost = hour >= 14 && hour <= 22 ? 0.15 : 0;
  return Math.min(1, buildSmoothOccupancy(hour, floor, random) + eventBoost);
};

const generateRecord = (
  hour: number,
  dateType: DateType,
  random: () => number,
  options?: {
    blockedEntrance?: number;
    fullFloor?: number;
    isEvent?: boolean;
    addDirtyData?: boolean;
  }
): ParkingRecord => {
  const floors = [0, 1, 2, 3].map(floorNum => {
    const totalSpots = 100;
    const occupancy = options?.fullFloor !== undefined
      ? buildFullFloorOccupancy(hour, floorNum, random, options.fullFloor)
      : options?.isEvent
      ? buildEventOccupancy(hour, floorNum, random)
      : buildSmoothOccupancy(hour, floorNum, random);
    const occupiedSpots = Math.round(totalSpots * occupancy);
    const pressureLevel = occupiedSpots / totalSpots;
    const overflowStatus: 'full' | 'overflow' | 'normal' = occupiedSpots >= totalSpots ? 'full' : occupiedSpots >= totalSpots * 0.9 ? 'overflow' : 'normal';

    let notes: string | undefined;
    let _dirty = false;
    if (options?.addDirtyData && floorNum === 2 && random() > 0.7) {
      notes = '手动录入数据，可能存在偏差';
      _dirty = true;
    }

    return {
      id: generateId(),
      floorNumber: floorNum,
      totalSpots,
      occupiedSpots,
      pressureLevel,
      overflowStatus,
      notes,
      _dirty,
    };
  });

  const entrances = [0, 1, 2, 3].map(entranceIdx => {
    const { queue, incoming } = options?.blockedEntrance !== undefined
      ? buildBlockedQueue(hour, entranceIdx, random, options.blockedEntrance)
      : buildSmoothQueue(hour, entranceIdx, random);
    const pressureLevel = Math.min(1, queue / 25 * 0.7 + incoming / 100 * 0.3);
    const blockageStatus: 'blocked' | 'slow' | 'normal' = queue >= 20 ? 'blocked' : queue >= 8 ? 'slow' : 'normal';

    let notes: string | undefined;
    let _dirty = false;
    if (options?.addDirtyData && entranceIdx === 1 && hour === 18) {
      notes = '设备临时维护，数据可能不准确';
      _dirty = true;
    }

    const entranceNames = ['东入口', '西入口', '南入口', '北入口'];
    return {
      id: generateId(),
      entranceName: entranceNames[entranceIdx] || `入口${entranceIdx + 1}`,
      incomingCars: incoming,
      queueLength: queue,
      pressureLevel,
      blockageStatus,
      notes,
      _dirty,
    };
  });

  let remarks: string | undefined;
  if (options?.addDirtyData && random() > 0.85) {
    remarks = '运营备注：今日有VIP车队到访';
  }

  return {
    id: generateId(),
    timestamp: `2025-05-15T${hour.toString().padStart(2, '0')}:00:00`,
    hourOfDay: hour,
    dateType,
    source: options?.addDirtyData && random() > 0.9 ? undefined : '自动采集',
    remarks,
    floors,
    entrances,
    anomalies: [],
    _dataQuality: options?.addDirtyData ? 0.85 : 1.0,
  };
};

export const generateSmoothScenario = (): DemoScenario => {
  const random = seededRandom(SEED);
  const records: ParkingRecord[] = [];
  
  for (let h = 0; h < 24; h++) {
    records.push(generateRecord(h, 'workday', random, { addDirtyData: true }));
  }

  return {
    id: 'smooth-001',
    name: '顺利运行样例',
    type: 'smooth',
    description: '工作日正常运营场景，车流随时段平稳变化，无异常事件。包含少量脏数据（空值、备注）以测试容错处理。',
    data: records,
  };
};

export const generateBlockedEntranceScenario = (): DemoScenario => {
  const random = seededRandom(SEED + 100);
  const records: ParkingRecord[] = [];
  const blockedEntrance = 0;

  for (let h = 0; h < 24; h++) {
    records.push(generateRecord(h, 'workday', random, { 
      blockedEntrance,
      addDirtyData: true,
    }));
  }

  return {
    id: 'blocked-001',
    name: '入口回堵样例',
    type: 'blocked',
    description: '东入口晚高峰17:00-20:00发生严重回堵，排队最长达40辆。演示入口压力如何传导至楼层并影响整体运营效率。',
    data: records,
  };
};

export const generateFullFloorScenario = (): DemoScenario => {
  const random = seededRandom(SEED + 200);
  const records: ParkingRecord[] = [];
  const fullFloor = 0;

  for (let h = 0; h < 24; h++) {
    records.push(generateRecord(h, 'weekend', random, { 
      fullFloor,
      addDirtyData: true,
    }));
  }

  return {
    id: 'full-001',
    name: '楼层满位样例',
    type: 'full',
    description: '周末B1层18:00-21:00饱和，车辆需绕行至其他楼层。演示楼层溢出如何增加场内通行时间和入口压力。',
    data: records,
  };
};

export const generateEventDayScenario = (): DemoScenario => {
  const random = seededRandom(SEED + 300);
  const records: ParkingRecord[] = [];

  for (let h = 0; h < 24; h++) {
    records.push(generateRecord(h, 'event', random, { 
      isEvent: true,
      addDirtyData: true,
    }));
  }

  return {
    id: 'event-001',
    name: '活动日样例',
    type: 'event',
    description: '商圈举办大型活动，14:00-22:00车流较平日增加40%。演示活动叠加时段高峰的双重压力效应。',
    data: records,
  };
};

export const demoScenarios: DemoScenario[] = [
  generateSmoothScenario(),
  generateBlockedEntranceScenario(),
  generateFullFloorScenario(),
  generateEventDayScenario(),
];

export const getDemoScenarios = (): DemoScenario[] => demoScenarios;

export const getScenarioById = (id: string): DemoScenario | undefined => {
  return demoScenarios.find(s => s.id === id);
};
