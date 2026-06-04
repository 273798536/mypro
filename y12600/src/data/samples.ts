import type { InspectionRecord } from '../types';

export const sampleRecords: InspectionRecord[] = [
  {
    id: 'REC-001',
    name: '水文监测点A-01',
    status: 'success',
    actualCoords: { x: 280, y: 320 },
    displayedCoords: { x: 280, y: 320 },
    isFlipped: false,
    trajectory: [
      { x: 100, y: 200 },
      { x: 150, y: 220 },
      { x: 200, y: 250 },
      { x: 240, y: 280 },
      { x: 280, y: 320 },
    ],
    sourceMeta: {
      originalRow: 15,
      imageName: 'river_survey_2024_03_15_001.jpg',
      remark: '2024年春季汛前巡检，数据完整',
      dataSource: '河道巡检数据表_2024Q1.xlsx',
    },
    hint: '这是一条标准的顺利记录，坐标与轨迹清晰对应，请在轨迹终点附近标注巡检点位置。',
  },
  {
    id: 'REC-002',
    name: '水质监测点B-07',
    status: 'pending',
    actualCoords: { x: 420, y: 180 },
    displayedCoords: { x: 410, y: 175 },
    isFlipped: false,
    trajectory: [
      { x: 350, y: 280 },
      { x: 375, y: 240 },
      { x: 395, y: 210 },
      { x: 405, y: 190 },
    ],
    sourceMeta: {
      originalRow: 42,
      imageName: 'water_quality_2024_04_02_042.jpg',
      remark: 'GPS信号较弱，坐标存在轻微漂移，建议人工复核',
      dataSource: '水质监测记录表_202404.xlsx',
    },
    hint: '这条记录的轨迹存在断点，坐标有轻微偏差，属于待确认数据。请仔细判断巡检点的真实位置。',
  },
  {
    id: 'REC-003',
    name: '岸坡监测点C-12',
    status: 'flipped',
    actualCoords: { x: 180, y: 450 },
    displayedCoords: { x: 450, y: 180 },
    isFlipped: true,
    trajectory: [
      { x: 500, y: 100 },
      { x: 480, y: 120 },
      { x: 460, y: 150 },
      { x: 450, y: 180 },
    ],
    sourceMeta: {
      originalRow: 78,
      imageName: 'slope_monitor_2024_05_20_078.jpg',
      remark: '注意：该条记录疑似X/Y坐标翻转，请与原始照片核对后使用',
      dataSource: '岸坡稳定性监测_202405.xlsx',
    },
    hint: '仔细观察坐标与轨迹的对应关系，这条记录可能存在坐标翻转问题。如果发现异常，请尝试在翻转后的位置标注。',
  },
];

export const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    success: '顺利记录',
    pending: '待确认',
    error: '异常数据',
    flipped: '坐标翻转',
  };
  return labels[status] || status;
};

export const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    success: 'bg-emerald-500',
    pending: 'bg-amber-500',
    error: 'bg-red-500',
    flipped: 'bg-rose-500',
  };
  return colors[status] || 'bg-gray-500';
};

export const getDataStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    direct_use: '可直接使用',
    needs_review: '需教研复核',
    bad_data: '异常数据',
  };
  return labels[status] || status;
};

export const getDataStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    direct_use: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    needs_review: 'text-amber-600 bg-amber-50 border-amber-200',
    bad_data: 'text-red-600 bg-red-50 border-red-200',
  };
  return colors[status] || 'text-gray-600 bg-gray-50 border-gray-200';
};
