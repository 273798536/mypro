import { StationRecord, Device } from '../types';
import { detectCoordinateFlip, generateFlipExplanation, generateId, calculateRecordScore } from '../utils/coordinateUtils';

export const sampleDevices: Device[] = [
  {
    id: 'dev-001',
    name: 'A区闸机群-01',
    location: '站厅东北侧',
    status: 'active',
  },
  {
    id: 'dev-002',
    name: 'B区闸机群-02',
    location: '站厅西南侧',
    status: 'active',
  },
  {
    id: 'dev-003',
    name: '中央导视屏',
    location: '站厅中央',
    status: 'inactive',
  },
  {
    id: 'dev-004',
    name: '出口指示牌-北',
    location: '站厅北侧',
    status: 'active',
  },
];

function createRecord(
  partial: Partial<StationRecord> & { label: string; xCoordinate: number; yCoordinate: number }
): StationRecord {
  const now = new Date().toISOString();
  const isFlipped = detectCoordinateFlip({
    xCoordinate: partial.xCoordinate,
    yCoordinate: partial.yCoordinate,
  });

  const base: StationRecord = {
    id: generateId(),
    type: 'guide',
    status: isFlipped ? 'pending' : 'success',
    createdAt: now,
    updatedAt: now,
    isFlipped,
    flipExplanation: undefined,
    label: partial.label,
    xCoordinate: partial.xCoordinate,
    yCoordinate: partial.yCoordinate,
    ...partial,
  };

  if (isFlipped) {
    base.flipExplanation = generateFlipExplanation(base);
  }

  base.score = calculateRecordScore(base);

  return base;
}

export const sampleRecords: StationRecord[] = [
  createRecord({
    label: '出口A导流箭头',
    type: 'guide',
    xCoordinate: 150,
    yCoordinate: 200,
    status: 'success',
    deviceId: 'dev-004',
    annotation: {
      id: 'ann-001',
      recordId: '',
      content: '位置已核对，与现场施工图一致，可直接投入使用。',
      author: '张主管',
      createdAt: new Date().toISOString(),
    },
  }),

  createRecord({
    label: '换乘通道警示贴',
    type: 'warning',
    xCoordinate: 680,
    yCoordinate: 50,
    status: 'pending',
    isFlipped: true,
    annotation: {
      id: 'ann-002',
      recordId: '',
      content: '这个坐标不对哦，我看现场实际是Y680 X50，明显录入的时候搞反了，等下让小李去现场再拍个照确认一下再改。',
      author: '王训练员',
      createdAt: new Date().toISOString(),
    },
  }),

  createRecord({
    label: '票务中心信息牌',
    type: 'info',
    xCoordinate: 9999,
    yCoordinate: -100,
    status: 'error',
    annotation: {
      id: 'ann-003',
      recordId: '',
      content: '这组数据完全不能用，原始采集的时候设备就没连上GPS，坐标全乱了，直接废弃不用再看了。',
      author: '李班长',
      createdAt: new Date().toISOString(),
    },
  }),

  createRecord({
    label: 'B出口地面指引',
    type: 'guide',
    xCoordinate: 450,
    yCoordinate: 600,
    status: 'success',
    deviceId: 'dev-002',
  }),

  createRecord({
    label: '无障碍电梯提示',
    type: 'info',
    xCoordinate: 320,
    yCoordinate: 450,
    status: 'success',
    deviceId: 'dev-001',
  }),

  createRecord({
    label: '安检入口导流',
    type: 'guide',
    xCoordinate: 720,
    yCoordinate: 30,
    status: 'pending',
    isFlipped: true,
  }),

  createRecord({
    label: '自动扶梯安全贴',
    type: 'warning',
    xCoordinate: 880,
    yCoordinate: 350,
    status: 'success',
  }),
];

export function initializeSampleData(): { records: StationRecord[]; devices: Device[] } {
  const records = sampleRecords.map((r) => ({
    ...r,
    annotation: r.annotation ? { ...r.annotation, recordId: r.id } : undefined,
  }));

  return {
    records,
    devices: [...sampleDevices],
  };
}
