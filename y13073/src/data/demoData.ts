import { CadRecord } from '../types';

const baseTimestamp = new Date('2024-01-15T08:00:00').getTime();
const interval = 5 * 60 * 1000;

const generateId = (index: number) => `REC-${String(index).padStart(4, '0')}`;

const sources = ['CAD图层A', 'CAD图层B', '现场测量', '历史数据导入'];
const layers = ['索道中心线', '地面等高线', '支架基础', '附属设施'];
const statuses: CadRecord['processStatus'][] = ['completed', 'completed', 'completed', 'processing', 'pending', 'error'];

const generateY = (x: number, noise = 0): number => {
  return 800 + 200 * Math.sin(x / 200) + 100 * Math.cos(x / 150) + noise;
};

const normalRecords: CadRecord[] = [];

for (let i = 0; i < 45; i++) {
  const x = i * 50;
  const timestamp = new Date(baseTimestamp + i * interval);
  
  normalRecords.push({
    id: generateId(i + 1),
    source: sources[i % sources.length],
    processStatus: statuses[i % statuses.length],
    x,
    y: generateY(x, (Math.random() - 0.5) * 20),
    timestamp: timestamp.toISOString(),
    layer: layers[i % layers.length],
    rowNumber: i + 1,
    originalFields: {
      '原始字段1': `值${i}`,
      '备注': `正常记录-${i + 1}`,
      '采集人': `工程师${(i % 3) + 1}`,
    },
  });
}

const boundaryRecord: CadRecord = {
  id: generateId(46),
  source: 'CAD图层A',
  processStatus: 'error',
  x: 46 * 50,
  y: generateY(46 * 50, 180),
  timestamp: new Date(baseTimestamp + 46 * interval).toISOString(),
  layer: '索道中心线',
  rowNumber: 46,
  originalFields: {
    '原始字段1': '值46',
    '备注': '边界样本-高程异常偏高',
    '采集人': '工程师2',
    '告警等级': '高',
  },
};

const incompleteRecord: CadRecord = {
  id: generateId(47),
  source: '历史数据导入',
  processStatus: 'pending',
  x: 47 * 50,
  y: NaN,
  timestamp: new Date(baseTimestamp + 47 * interval).toISOString(),
  layer: '地面等高线',
  rowNumber: 47,
  originalFields: {
    '原始字段1': '值47',
    '备注': '数据不完整-高程缺失',
    '采集人': '',
  },
};

const mutationRecord1: CadRecord = {
  id: generateId(48),
  source: '现场测量',
  processStatus: 'completed',
  x: 48 * 50,
  y: generateY(48 * 50),
  timestamp: new Date(baseTimestamp + 48 * interval).toISOString(),
  layer: '索道中心线',
  rowNumber: 48,
  originalFields: {
    '原始字段1': '值48',
    '备注': '突变前记录',
    '采集人': '工程师1',
  },
};

const mutationRecord2: CadRecord = {
  id: generateId(49),
  source: '现场测量',
  processStatus: 'completed',
  x: 49 * 50,
  y: generateY(48 * 50) - 150,
  timestamp: new Date(baseTimestamp + 49 * interval).toISOString(),
  layer: '索道中心线',
  rowNumber: 49,
  originalFields: {
    '原始字段1': '值49',
    '备注': '突变异常-高程骤降',
    '采集人': '工程师1',
  },
};

const postGapRecords: CadRecord[] = [];
for (let i = 50; i < 60; i++) {
  const gapOffset = 12;
  const x = (i + gapOffset) * 50;
  const timestamp = new Date(baseTimestamp + (i + gapOffset) * interval);
  
  postGapRecords.push({
    id: generateId(i + 1),
    source: sources[i % sources.length],
    processStatus: statuses[i % statuses.length],
    x,
    y: generateY(x, (Math.random() - 0.5) * 20),
    timestamp: timestamp.toISOString(),
    layer: layers[i % layers.length],
    rowNumber: i + 1,
    originalFields: {
      '原始字段1': `值${i + 1}`,
      '备注': `缺段后记录-${i + 1}`,
      '采集人': `工程师${(i % 3) + 1}`,
    },
  });
}

export const demoCadRecords: CadRecord[] = [
  ...normalRecords,
  boundaryRecord,
  incompleteRecord,
  mutationRecord1,
  mutationRecord2,
  ...postGapRecords,
];

export const demoCsvContent = `行号,数据源,处理状态,X坐标,Y坐标,时间戳,图层,原始字段1,备注,采集人
1,CAD图层A,completed,0,800,2024-01-15T08:00:00.000Z,索道中心线,值0,正常记录-1,工程师1
2,CAD图层B,completed,50,820,2024-01-15T08:05:00.000Z,地面等高线,值1,正常记录-2,工程师2
3,现场测量,completed,100,845,2024-01-15T08:10:00.000Z,支架基础,值2,正常记录-3,工程师3
4,历史数据导入,processing,150,860,2024-01-15T08:15:00.000Z,附属设施,值3,正常记录-4,工程师1
5,CAD图层A,pending,200,850,2024-01-15T08:20:00.000Z,索道中心线,值4,正常记录-5,工程师2
6,CAD图层B,error,250,830,2024-01-15T08:25:00.000Z,地面等高线,值5,正常记录-6,工程师3
7,现场测量,completed,300,810,2024-01-15T08:30:00.000Z,支架基础,值6,正常记录-7,工程师1
46,CAD图层A,error,2300,1080,2024-01-15T11:45:00.000Z,索道中心线,值46,边界样本-高程异常偏高,工程师2
47,历史数据导入,pending,2350,,2024-01-15T11:50:00.000Z,地面等高线,值47,数据不完整-高程缺失,
48,现场测量,completed,2400,890,2024-01-15T11:55:00.000Z,索道中心线,值48,突变前记录,工程师1
49,现场测量,completed,2450,740,2024-01-15T12:00:00.000Z,索道中心线,值49,突变异常-高程骤降,工程师1
61,CAD图层A,completed,3050,820,2024-01-15T13:00:00.000Z,索道中心线,值60,缺段后记录-61,工程师1
62,CAD图层B,completed,3100,840,2024-01-15T13:05:00.000Z,地面等高线,值61,缺段后记录-62,工程师2`;

export const expectedTimelineGaps = [
  {
    id: 'GAP-001',
    startTime: '2024-01-15T12:00:00.000Z',
    endTime: '2024-01-15T13:00:00.000Z',
    duration: 60,
    affectedRecordIds: ['REC-0049', 'REC-0061'],
    startRow: 49,
    endRow: 61,
  },
];
