import { RawPoint, MergedPoint, HistoryRecord, Note } from '../types';
import { generateId, calculateDistance } from './geo';

const BATCH_ID = `BATCH-${Date.now().toString().slice(-8)}`;
const NOW = new Date().toISOString();
const OPERATOR = '交通工程师-老何';

function createRawPoint(
  source: string,
  sourceLine: number,
  rawName: string,
  rawLat: number,
  rawLng: number,
  canonicalLat: number,
  canonicalLng: number,
  influenceRadius: number,
  extraFields: Record<string, any> = {}
): Omit<RawPoint, 'id' | 'createdAt' | 'importBatch'> {
  const offsetDistance = calculateDistance(rawLat, rawLng, canonicalLat, canonicalLng);
  const isOffset = offsetDistance > influenceRadius * 0.5;

  return {
    source,
    sourceLine,
    rawName,
    rawLat,
    rawLng,
    rawData: {
      id: `GIS-${sourceLine.toString().padStart(4, '0')}`,
      name: rawName,
      longitude: rawLng,
      latitude: rawLat,
      type: '公交港湾',
      ...extraFields,
    },
    influenceRadius,
    isOffset,
    offsetDistance,
  };
}

export const DEMO_RAW_POINTS: Omit<RawPoint, 'id' | 'createdAt' | 'importBatch'>[] = [
  createRawPoint(
    '2024-Q1-GIS普查数据.csv',
    15,
    '人民广场站',
    31.2304,
    121.4737,
    31.2304,
    121.4737,
    50,
    { source: '上海市测绘院', '采集时间': '2024-01-15' }
  ),
  createRawPoint(
    '2024-Q1-GIS普查数据.csv',
    23,
    '人民广场公交站',
    31.2305,
    121.4738,
    31.2304,
    121.4737,
    50,
    { source: '上海市测绘院', '采集时间': '2024-01-15', operator: '张三' }
  ),
  createRawPoint(
    '2023年历史数据.json',
    8,
    '广场公交停靠点',
    31.2303,
    121.4736,
    31.2304,
    121.4737,
    50,
    { source: '旧系统迁移', '采集时间': '2023-06-20', status: 'active' }
  ),
  createRawPoint(
    '2024-Q1-GIS普查数据.csv',
    47,
    '南京东路站',
    31.2350,
    121.4800,
    31.2350,
    121.4800,
    50,
    { source: '上海市测绘院', '采集时间': '2024-01-16' }
  ),
  createRawPoint(
    '市民反馈补充数据.xlsx',
    12,
    '南京东路地铁站公交站',
    31.2352,
    121.4802,
    31.2350,
    121.4800,
    50,
    { source: '市民热线12345', '反馈时间': '2024-02-10', '反馈人': '王先生' }
  ),
  createRawPoint(
    '2024-Q1-GIS普查数据.csv',
    56,
    '外滩站',
    31.2380,
    121.4900,
    31.2390,
    121.4920,
    50,
    { source: '上海市测绘院', '采集时间': '2024-01-17' }
  ),
  createRawPoint(
    '2024-Q1-GIS普查数据.csv',
    78,
    '陆家嘴站',
    31.2400,
    121.5010,
    31.2400,
    121.5010,
    50,
    { source: '上海市测绘院', '采集时间': '2024-01-17' }
  ),
  createRawPoint(
    '2023年历史数据.json',
    34,
    '陆家嘴环路公交站',
    31.2402,
    121.5012,
    31.2400,
    121.5010,
    50,
    { source: '旧系统迁移', '采集时间': '2023-07-10' }
  ),
  createRawPoint(
    '浦东新区补充采集.csv',
    5,
    '陆家嘴地铁站',
    31.2398,
    121.5008,
    31.2400,
    121.5010,
    50,
    { source: '浦东新区规土局', '采集时间': '2024-03-01' }
  ),
  createRawPoint(
    '2024-Q1-GIS普查数据.csv',
    89,
    '豫园站',
    31.2270,
    121.4920,
    31.2270,
    121.4920,
    50,
    { source: '上海市测绘院', '采集时间': '2024-01-18' }
  ),
  createRawPoint(
    '2024-Q1-GIS普查数据.csv',
    102,
    '静安寺站',
    31.2240,
    121.4480,
    31.2240,
    121.4480,
    50,
    { source: '上海市测绘院', '采集时间': '2024-01-18' }
  ),
  createRawPoint(
    '徐汇区历史数据.csv',
    28,
    '徐家汇站',
    31.1950,
    121.4370,
    31.1950,
    121.4370,
    50,
    { source: '徐汇区交通委', '采集时间': '2023-11-20' }
  ),
];

export function createDemoData(): {
  rawPoints: RawPoint[];
  mergedPoints: MergedPoint[];
  history: HistoryRecord[];
  currentBatch: string;
} {
  const rawPoints: RawPoint[] = DEMO_RAW_POINTS.map((p, index) => ({
    ...p,
    id: generateId(),
    importBatch: BATCH_ID,
    createdAt: new Date(Date.now() - (DEMO_RAW_POINTS.length - index) * 60000).toISOString(),
  }));

  const peopleSquareRawIds = rawPoints.slice(0, 3).map(p => p.id);
  const nanjingRdRawIds = rawPoints.slice(3, 5).map(p => p.id);
  const lujiazuiRawIds = rawPoints.slice(6, 9).map(p => p.id);

  const noteId = generateId();
  const note: Note = {
    id: noteId,
    content: '市民反馈此处站牌损坏，已联系运维部门修复，预计下周三完成。此处坐标偏移较大，建议现场复测确认。',
    isSupplementary: true,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  };

  const mergedPoints: MergedPoint[] = [
    {
      id: generateId(),
      canonicalName: '人民广场公交港湾站',
      status: 'confirmed',
      rawPointIds: peopleSquareRawIds,
      canonicalLat: 31.2304,
      canonicalLng: 121.4737,
      notes: [],
      hasSupplementaryNote: false,
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      updatedAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: generateId(),
      canonicalName: '南京东路公交港湾站',
      status: 'onsite',
      rawPointIds: nanjingRdRawIds,
      canonicalLat: 31.2350,
      canonicalLng: 121.4800,
      notes: [],
      hasSupplementaryNote: false,
      createdAt: new Date(Date.now() - 5400000).toISOString(),
      updatedAt: new Date(Date.now() - 1800000).toISOString(),
    },
    {
      id: generateId(),
      canonicalName: '外滩公交港湾站',
      status: 'conflict',
      rawPointIds: [rawPoints[5].id],
      canonicalLat: 31.2390,
      canonicalLng: 121.4920,
      notes: [note],
      hasSupplementaryNote: true,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      updatedAt: new Date(Date.now() - 1800000).toISOString(),
    },
    {
      id: generateId(),
      canonicalName: '陆家嘴公交港湾站',
      status: 'confirmed',
      rawPointIds: lujiazuiRawIds,
      canonicalLat: 31.2400,
      canonicalLng: 121.5010,
      notes: [],
      hasSupplementaryNote: false,
      createdAt: new Date(Date.now() - 1800000).toISOString(),
      updatedAt: new Date(Date.now() - 900000).toISOString(),
    },
    {
      id: generateId(),
      canonicalName: '豫园公交港湾站',
      status: 'pending',
      rawPointIds: [rawPoints[9].id],
      canonicalLat: 31.2270,
      canonicalLng: 121.4920,
      notes: [],
      hasSupplementaryNote: false,
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      id: generateId(),
      canonicalName: '静安寺公交港湾站',
      status: 'pending',
      rawPointIds: [rawPoints[10].id],
      canonicalLat: 31.2240,
      canonicalLng: 121.4480,
      notes: [],
      hasSupplementaryNote: false,
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      id: generateId(),
      canonicalName: '徐家汇公交港湾站',
      status: 'pending',
      rawPointIds: [rawPoints[11].id],
      canonicalLat: 31.1950,
      canonicalLng: 121.4370,
      notes: [],
      hasSupplementaryNote: false,
      createdAt: NOW,
      updatedAt: NOW,
    },
  ];

  const history: HistoryRecord[] = [
    {
      id: generateId(),
      action: 'import',
      targetType: 'rawPoint',
      targetId: 'batch-' + BATCH_ID,
      before: null,
      after: { count: DEMO_RAW_POINTS.length, batch: BATCH_ID, source: '多源GIS数据整合' },
      operator: OPERATOR,
      timestamp: new Date(Date.now() - 14400000).toISOString(),
    },
    {
      id: generateId(),
      action: 'merge',
      targetType: 'mergedPoint',
      targetId: mergedPoints[0].id,
      before: null,
      after: {
        canonicalName: '人民广场公交港湾站',
        rawPointIds: peopleSquareRawIds,
        rawNames: ['人民广场站', '人民广场公交站', '广场公交停靠点'],
      },
      operator: OPERATOR,
      timestamp: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: generateId(),
      action: 'merge',
      targetType: 'mergedPoint',
      targetId: mergedPoints[1].id,
      before: null,
      after: {
        canonicalName: '南京东路公交港湾站',
        rawPointIds: nanjingRdRawIds,
        rawNames: ['南京东路站', '南京东路地铁站公交站'],
      },
      operator: OPERATOR,
      timestamp: new Date(Date.now() - 5400000).toISOString(),
    },
    {
      id: generateId(),
      action: 'merge',
      targetType: 'mergedPoint',
      targetId: mergedPoints[2].id,
      before: null,
      after: {
        canonicalName: '外滩公交港湾站',
        rawPointIds: [rawPoints[5].id],
        rawNames: ['外滩站'],
        warning: '坐标偏移245米，超出影响范围',
      },
      operator: OPERATOR,
      timestamp: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: generateId(),
      action: 'status',
      targetType: 'mergedPoint',
      targetId: mergedPoints[0].id,
      before: { status: 'pending' },
      after: { status: 'confirmed' },
      operator: OPERATOR,
      timestamp: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: generateId(),
      action: 'status',
      targetType: 'mergedPoint',
      targetId: mergedPoints[1].id,
      before: { status: 'pending' },
      after: { status: 'onsite' },
      operator: OPERATOR,
      timestamp: new Date(Date.now() - 1800000).toISOString(),
    },
    {
      id: generateId(),
      action: 'note',
      targetType: 'mergedPoint',
      targetId: mergedPoints[2].id,
      before: { notes: [] },
      after: { notes: [note] },
      operator: OPERATOR,
      timestamp: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: generateId(),
      action: 'status',
      targetType: 'mergedPoint',
      targetId: mergedPoints[2].id,
      before: { status: 'pending' },
      after: { status: 'conflict' },
      operator: OPERATOR,
      timestamp: new Date(Date.now() - 1800000).toISOString(),
    },
    {
      id: generateId(),
      action: 'merge',
      targetType: 'mergedPoint',
      targetId: mergedPoints[3].id,
      before: null,
      after: {
        canonicalName: '陆家嘴公交港湾站',
        rawPointIds: lujiazuiRawIds,
        rawNames: ['陆家嘴站', '陆家嘴环路公交站', '陆家嘴地铁站'],
      },
      operator: OPERATOR,
      timestamp: new Date(Date.now() - 1800000).toISOString(),
    },
    {
      id: generateId(),
      action: 'status',
      targetType: 'mergedPoint',
      targetId: mergedPoints[3].id,
      before: { status: 'pending' },
      after: { status: 'confirmed' },
      operator: OPERATOR,
      timestamp: new Date(Date.now() - 900000).toISOString(),
    },
  ];

  return {
    rawPoints,
    mergedPoints,
    history,
    currentBatch: BATCH_ID,
  };
}
