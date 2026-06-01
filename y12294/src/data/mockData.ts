import type {
  Shelf,
  Probe,
  Fan,
  ProductBatch,
  Event,
  TemperatureData,
} from '../types';

export const shelves: Shelf[] = [
  {
    id: 'shelf-1',
    name: 'A区货架-01',
    position: [-4, 0, 0],
    dimensions: { width: 2, height: 3, depth: 1 },
    lastModified: '2026-06-01 08:30:00',
    probeIds: ['probe-1', 'probe-2'],
  },
  {
    id: 'shelf-2',
    name: 'A区货架-02',
    position: [-4, 0, 2],
    dimensions: { width: 2, height: 3, depth: 1 },
    lastModified: '2026-06-01 09:15:00',
    probeIds: ['probe-3'],
  },
  {
    id: 'shelf-3',
    name: 'B区货架-01',
    position: [4, 0, 0],
    dimensions: { width: 2, height: 3, depth: 1 },
    lastModified: '2026-06-01 07:45:00',
    probeIds: ['probe-4', 'probe-5'],
  },
  {
    id: 'shelf-4',
    name: 'B区货架-02',
    position: [4, 0, 2],
    dimensions: { width: 2, height: 3, depth: 1 },
    lastModified: '2026-06-01 10:00:00',
    probeIds: ['probe-6'],
  },
];

export const probes: Probe[] = [
  {
    id: 'probe-1',
    name: '探头-A1-上层',
    shelfId: 'shelf-1',
    position: [-4, 2.5, 0],
    status: 'online',
    currentTemp: -18.2,
    history: Array.from({ length: 24 }, (_, i) => ({
      timestamp: `2026-06-01 ${String(i).padStart(2, '0')}:00:00`,
      temp: -18 + Math.sin(i * 0.5) * 2,
    })),
    lastCalibration: '2026-05-15',
  },
  {
    id: 'probe-2',
    name: '探头-A1-下层',
    shelfId: 'shelf-1',
    position: [-4, 0.5, 0],
    status: 'offline',
    currentTemp: -15.8,
    history: Array.from({ length: 24 }, (_, i) => ({
      timestamp: `2026-06-01 ${String(i).padStart(2, '0')}:00:00`,
      temp: -16 + Math.cos(i * 0.3) * 1.5,
    })),
    lastCalibration: '2026-05-20',
  },
  {
    id: 'probe-3',
    name: '探头-A2-中层',
    shelfId: 'shelf-2',
    position: [-4, 1.5, 2],
    status: 'online',
    currentTemp: -19.5,
    history: Array.from({ length: 24 }, (_, i) => ({
      timestamp: `2026-06-01 ${String(i).padStart(2, '0')}:00:00`,
      temp: -19.5 + Math.sin(i * 0.4) * 1,
    })),
    lastCalibration: '2026-05-28',
  },
  {
    id: 'probe-4',
    name: '探头-B1-上层',
    shelfId: 'shelf-3',
    position: [4, 2.5, 0],
    status: 'warning',
    currentTemp: -12.3,
    history: Array.from({ length: 24 }, (_, i) => ({
      timestamp: `2026-06-01 ${String(i).padStart(2, '0')}:00:00`,
      temp: -15 + i * 0.2,
    })),
    lastCalibration: '2026-05-10',
  },
  {
    id: 'probe-5',
    name: '探头-B1-下层',
    shelfId: 'shelf-3',
    position: [4, 0.5, 0],
    status: 'online',
    currentTemp: -20.1,
    history: Array.from({ length: 24 }, (_, i) => ({
      timestamp: `2026-06-01 ${String(i).padStart(2, '0')}:00:00`,
      temp: -20 + Math.cos(i * 0.6) * 0.8,
    })),
    lastCalibration: '2026-05-25',
  },
  {
    id: 'probe-6',
    name: '探头-B2-中层',
    shelfId: 'shelf-4',
    position: [4, 1.5, 2],
    status: 'online',
    currentTemp: -18.8,
    history: Array.from({ length: 24 }, (_, i) => ({
      timestamp: `2026-06-01 ${String(i).padStart(2, '0')}:00:00`,
      temp: -18.8 + Math.sin(i * 0.35) * 1.2,
    })),
    lastCalibration: '2026-06-01',
  },
];

export const fans: Fan[] = [
  {
    id: 'fan-1',
    name: '风机-01',
    position: [0, 3.5, -3],
    status: 'running',
    speed: 100,
  },
  {
    id: 'fan-2',
    name: '风机-02',
    position: [0, 3.5, 3],
    status: 'stopped',
    speed: 0,
  },
  {
    id: 'fan-3',
    name: '风机-03',
    position: [-6, 3.5, 0],
    status: 'running',
    speed: 85,
  },
  {
    id: 'fan-4',
    name: '风机-04',
    position: [6, 3.5, 0],
    status: 'running',
    speed: 95,
  },
];

export const products: ProductBatch[] = [
  {
    id: 'product-1',
    name: '进口三文鱼批次-20260528',
    shelfId: 'shelf-1',
    position: [-4, 1, 0],
    dimensions: { width: 1.5, height: 0.8, depth: 0.8 },
    temperatureSensitivity: 'high',
    storageTime: '2026-05-28 14:30:00',
    isBlocking: false,
  },
  {
    id: 'product-2',
    name: '冷冻牛肉批次-20260530',
    shelfId: 'shelf-3',
    position: [4, 1.8, 0],
    dimensions: { width: 1.6, height: 1, depth: 0.9 },
    temperatureSensitivity: 'high',
    storageTime: '2026-05-30 09:15:00',
    isBlocking: true,
  },
  {
    id: 'product-3',
    name: '速冻水饺批次-20260601',
    shelfId: 'shelf-2',
    position: [-4, 0.8, 2],
    dimensions: { width: 1.2, height: 0.6, depth: 0.7 },
    temperatureSensitivity: 'medium',
    storageTime: '2026-06-01 07:00:00',
    isBlocking: false,
  },
  {
    id: 'product-4',
    name: '冰淇淋批次-20260525',
    shelfId: 'shelf-4',
    position: [4, 1, 2],
    dimensions: { width: 1.4, height: 0.9, depth: 0.8 },
    temperatureSensitivity: 'high',
    storageTime: '2026-05-25 16:45:00',
    isBlocking: false,
  },
];

export const events: Event[] = [
  {
    id: 'event-1',
    type: 'probe_offline',
    timestamp: '2026-06-01 10:23:45',
    severity: 'critical',
    sourceId: 'probe-2',
    sourceType: 'probe',
    description: '温度探头离线，无法获取实时数据',
    location: 'A区货架-01 下层',
    triggerSource: '探头-A1-下层 通信中断',
    blockPosition: '货架编号 A1 / 位置 下层',
    nextAction: '1. 检查探头供电连接；2. 重启探头设备；3. 如仍离线，更换备用探头',
    relatedClues: [
      { type: 'shelf', id: 'shelf-1', name: 'A区货架-01' },
      { type: 'product', id: 'product-1', name: '进口三文鱼批次-20260528' },
    ],
  },
  {
    id: 'event-2',
    type: 'product_block',
    timestamp: '2026-06-01 09:45:12',
    severity: 'warning',
    sourceId: 'product-2',
    sourceType: 'product',
    description: '货品遮挡探头，影响温度检测准确性',
    location: 'B区货架-01 上层',
    triggerSource: '冷冻牛肉批次-20260530 堆放过高',
    blockPosition: '货架编号 B1 / 层位 上层 / 距离探头 0.3米',
    nextAction: '1. 调整货品堆放位置；2. 确保探头周围30cm内无遮挡；3. 重新校准温度读数',
    relatedClues: [
      { type: 'shelf', id: 'shelf-3', name: 'B区货架-01' },
      { type: 'probe', id: 'probe-4', name: '探头-B1-上层' },
    ],
  },
  {
    id: 'event-3',
    type: 'fan_stop',
    timestamp: '2026-06-01 08:15:33',
    severity: 'critical',
    sourceId: 'fan-2',
    sourceType: 'fan',
    description: '风机停转，可能导致局部温度异常',
    location: '冷库东侧顶部',
    triggerSource: '风机-02 电机过载保护触发',
    blockPosition: '位置坐标 (0, 3.5, 3) / 风道 东侧回风',
    nextAction: '1. 关闭风机电源并检查电机；2. 清理风道杂物；3. 重置保护开关后重启',
    relatedClues: [
      { type: 'probe', id: 'probe-3', name: '探头-A2-中层' },
      { type: 'product', id: 'product-3', name: '速冻水饺批次-20260601' },
    ],
  },
];

export const generateTemperatureData = (): TemperatureData[] => {
  const timestamps = Array.from({ length: 12 }, (_, i) => {
    const hour = 8 + i;
    return `2026-06-01 ${String(hour).padStart(2, '0')}:00:00`;
  });

  return timestamps.map((timestamp) => {
    const grid: { x: number; y: number; z: number; temp: number }[] = [];
    for (let x = -6; x <= 6; x += 2) {
      for (let y = 0; y <= 3; y += 1) {
        for (let z = -3; z <= 3; z += 1.5) {
          const baseTemp = -18;
          const fanEffect = x === 0 && z === 3 ? 3 : 0;
          const randomVariation = (Math.random() - 0.5) * 2;
          grid.push({
            x,
            y,
            z,
            temp: Math.round((baseTemp + fanEffect + randomVariation) * 10) / 10,
          });
        }
      }
    }
    return { timestamp, grid };
  });
};

export const temperatureData = generateTemperatureData();

export const timelinePoints = [
  { time: '08:00', label: '巡检开始' },
  { time: '08:15', label: '风机-02停转', isEvent: true },
  { time: '09:00', label: '温度采样' },
  { time: '09:45', label: '货品遮挡告警', isEvent: true },
  { time: '10:00', label: '货架调整' },
  { time: '10:23', label: '探头离线', isEvent: true },
  { time: '11:00', label: '当前状态' },
];
