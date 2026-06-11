import type { SensorRecord, HistoricalNote, AnomalyRecord, FilterCriteria } from '@/types';

function generateSensorData(): SensorRecord[] {
  const records: SensorRecord[] = [];
  const channels = ['冷通道A', '冷通道B', '冷通道C'];
  const cabinets = ['A01', 'A02', 'A03', 'A04', 'A05'];
  const types: Array<{ type: SensorRecord['type']; unit: string; base: number; range: number }> = [
    { type: 'temperature', unit: '°C', base: 22, range: 4 },
    { type: 'humidity', unit: '%', base: 45, range: 10 },
    { type: 'pressure', unit: 'Pa', base: 1013, range: 5 },
  ];

  const baseDate = new Date('2026-06-10T00:00:00');
  let id = 1;

  for (const channel of channels) {
    for (const cabinet of cabinets) {
      for (const { type, unit, base, range } of types) {
        for (let i = 0; i < 48; i++) {
          const ts = new Date(baseDate.getTime() + i * 30 * 60 * 1000);
          const noise = (Math.random() - 0.5) * range;
          const spike = i === 15 || i === 32 ? (Math.random() - 0.5) * range * 3 : 0;
          records.push({
            id: `s-${id++}`,
            sensorName: `${channel}-${cabinet}-${type === 'temperature' ? 'T' : type === 'humidity' ? 'H' : 'P'}`,
            channel,
            cabinet,
            type,
            value: Math.round((base + noise + spike) * 10) / 10,
            timestamp: ts.toISOString(),
            unit,
          });
        }
      }
    }
  }

  return records;
}

function getSensorId(data: SensorRecord[], name: string): string {
  return data.find((d) => d.sensorName === name)?.id ?? 's-1';
}

export const mockSensorData = generateSensorData();

const defaultFilter: FilterCriteria = {
  id: 'f-default',
  timeRangeStart: '2026-06-10T00:00:00',
  timeRangeEnd: '2026-06-10T23:59:59',
  channel: '冷通道A',
  sensorType: 'temperature',
};

const SENSOR_A01T = getSensorId(mockSensorData, '冷通道A-A01-T');
const SENSOR_A02H = getSensorId(mockSensorData, '冷通道A-A02-H');
const SENSOR_A03T = getSensorId(mockSensorData, '冷通道A-A03-T');
const SENSOR_B03T = getSensorId(mockSensorData, '冷通道B-B03-T');
const SENSOR_C01P = getSensorId(mockSensorData, '冷通道C-C01-P');
const SENSOR_A05T = getSensorId(mockSensorData, '冷通道A-A05-T');

export const mockHistoricalNotes: HistoricalNote[] = [
  {
    id: 'hn-1',
    sensorId: SENSOR_A01T,
    sensorName: '冷通道A-A01-T',
    content: '巡检发现该点位温度偏高，已调低送风量',
    author: '张工',
    timestamp: '2026-06-10T08:30:00',
    isLatest: false,
  },
  {
    id: 'hn-2',
    sensorId: SENSOR_A01T,
    sensorName: '冷通道A-A01-T',
    content: '调整后温度回落至正常区间',
    author: '李工',
    timestamp: '2026-06-10T10:15:00',
    screenshotUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=data%20center%20cold%20aisle%20temperature%20monitoring%20dashboard%20dark%20theme%20green%20line%20chart&image_size=landscape_16_9',
    isLatest: false,
  },
  {
    id: 'hn-3',
    sensorId: SENSOR_A01T,
    sensorName: '冷通道A-A01-T',
    content: '持续观察24h，确认稳定',
    author: '赵经理',
    timestamp: '2026-06-10T14:00:00',
    isLatest: true,
  },
  {
    id: 'hn-4',
    sensorId: SENSOR_A02H,
    sensorName: '冷通道A-A02-H',
    content: '湿度传感器读数跳变，疑似硬件故障',
    author: '张工',
    timestamp: '2026-06-10T09:00:00',
    screenshotUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=humidity%20sensor%20spike%20anomaly%20chart%20dark%20background%20blue%20line&image_size=landscape_16_9',
    isLatest: false,
  },
  {
    id: 'hn-5',
    sensorId: SENSOR_A02H,
    sensorName: '冷通道A-A02-H',
    content: '更换传感器后恢复正常',
    author: '王工',
    timestamp: '2026-06-10T11:30:00',
    isLatest: true,
  },
  {
    id: 'hn-6',
    sensorId: SENSOR_A03T,
    sensorName: '冷通道A-A03-T',
    content: 'A03机柜相邻点位温差异常，疑似合错',
    author: '赵经理',
    timestamp: '2026-06-10T07:45:00',
    isLatest: false,
  },
  {
    id: 'hn-7',
    sensorId: SENSOR_A03T,
    sensorName: '冷通道A-A03-T',
    content: '已确认是布线错误导致合点，已修正',
    author: '李工',
    timestamp: '2026-06-10T16:20:00',
    isLatest: true,
  },
];

export const mockAnomalyRecords: AnomalyRecord[] = [
  {
    id: 'a-1',
    sensorId: SENSOR_A03T,
    sensorName: '冷通道A-A03-T',
    filterId: 'f-default',
    type: 'adjacent_merge_error',
    description: 'A03与A04机柜相邻点位温差>3°C，疑似合错',
    status: 'processing',
    result: '异常-相邻点位合错：A03/A04布线交叉',
    screenshotUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=data%20center%20adjacent%20cabinet%20temperature%20anomaly%20comparison%20chart%20dark%20theme%20red%20alert&image_size=landscape_16_9',
    sourceObjectId: SENSOR_A03T,
    filterSnapshot: { ...defaultFilter, cabinet: 'A03' },
    createdAt: '2026-06-10T07:45:00',
    materials: [
      { id: 'm-1', name: '巡检照片.jpg', type: 'screenshot', url: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=server%20room%20cabinet%20wiring%20inspection%20photo%20dark&image_size=landscape_16_9', uploadedAt: '2026-06-10T08:00:00' },
    ],
  },
  {
    id: 'a-2',
    sensorId: SENSOR_A02H,
    sensorName: '冷通道A-A02-H',
    filterId: 'f-default',
    type: 'value_out_of_range',
    description: '湿度读数突然跳变至78%，超出正常范围(35%-65%)',
    status: 'resolved',
    result: '异常-数值超限：湿度传感器硬件故障已更换',
    screenshotUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=humidity%20sensor%20spike%20out%20of%20range%20alert%20dark%20dashboard%20amber&image_size=landscape_16_9',
    sourceObjectId: SENSOR_A02H,
    filterSnapshot: { ...defaultFilter, sensorType: 'humidity' },
    createdAt: '2026-06-10T09:00:00',
    materials: [],
  },
  {
    id: 'a-3',
    sensorId: SENSOR_B03T,
    sensorName: '冷通道B-B03-T',
    filterId: 'f-default',
    type: 'sensor_offline',
    description: '冷通道B-B03温度传感器连续30分钟无数据上报',
    status: 'pending',
    result: '异常-传感器离线：待排查网络连接',
    sourceObjectId: SENSOR_B03T,
    filterSnapshot: { ...defaultFilter, channel: '冷通道B' },
    createdAt: '2026-06-10T12:30:00',
    materials: [],
  },
  {
    id: 'a-4',
    sensorId: SENSOR_C01P,
    sensorName: '冷通道C-C01-P',
    filterId: 'f-default',
    type: 'data_gap',
    description: '冷通道C-C01气压数据存在15分钟断档',
    status: 'pending',
    result: '异常-数据断档：采集服务中断',
    screenshotUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=pressure%20data%20gap%20missing%20time%20series%20chart%20dark%20background&image_size=landscape_16_9',
    sourceObjectId: SENSOR_C01P,
    filterSnapshot: { ...defaultFilter, channel: '冷通道C', sensorType: 'pressure' },
    createdAt: '2026-06-10T15:00:00',
    materials: [
      { id: 'm-2', name: '采集服务日志.txt', type: 'file', content: '2026-06-10 14:45:00 [ERROR] Connection timeout to C01-P sensor', uploadedAt: '2026-06-10T15:10:00' },
    ],
  },
  {
    id: 'a-5',
    sensorId: SENSOR_A05T,
    sensorName: '冷通道A-A05-T',
    filterId: 'f-default',
    type: 'adjacent_merge_error',
    description: 'A05与B01机柜相邻点位读数高度一致，疑似合错',
    status: 'processing',
    result: '异常-相邻点位合错：A05/B01线缆标签混淆',
    sourceObjectId: SENSOR_A05T,
    filterSnapshot: { ...defaultFilter, cabinet: 'A05' },
    createdAt: '2026-06-10T16:00:00',
    materials: [],
  },
];
