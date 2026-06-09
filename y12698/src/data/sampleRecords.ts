import type { DataRecord, ProfileVersion, Viewpoint, ThresholdConfig } from '../types';

function makeProfileImage(baseColor: string, label: string): string {
  const size = 400;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grd = ctx.createLinearGradient(0, 0, 0, size);
  grd.addColorStop(0, '#0A1628');
  grd.addColorStop(1, baseColor);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = 'rgba(0,212,170,0.5)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 20; i++) {
    ctx.beginPath();
    const y = size * 0.5 + Math.sin(i * 0.8) * 40 + i * 4;
    ctx.moveTo(0, y);
    for (let x = 0; x <= size; x += 10) {
      ctx.lineTo(x, y + Math.sin((x + i * 30) * 0.02) * 8);
    }
    ctx.stroke();
  }
  ctx.fillStyle = '#00D4AA';
  ctx.font = 'bold 28px monospace';
  ctx.fillText(label, 20, 50);
  ctx.fillStyle = '#FF6B35';
  ctx.font = '14px monospace';
  ctx.fillText('HYDROTHERMAL VENT PROFILE', 20, 80);
  ctx.beginPath();
  ctx.arc(size * 0.5, size * 0.6, 40, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,107,53,0.4)';
  ctx.fill();
  ctx.strokeStyle = '#FF6B35';
  ctx.lineWidth = 2;
  ctx.stroke();
  return canvas.toDataURL('image/png');
}

export const THRESHOLDS: ThresholdConfig = {
  temperatureMax: 380,
  temperatureMin: 2,
  flowRateMax: 5.0,
  flowRateMin: 0.1,
};

export const SAMPLE_RECORDS: DataRecord[] = [
  {
    id: 'rec-001',
    sourceFile: 'survey_2024_q1.xlsx',
    sourceLine: 42,
    sourceNote: '2024年3月第3次下潜ROV KAIKO主测点',
    coordinateSystem: 'WGS84',
    x: 121.5023,
    y: 25.0018,
    z_m: 2480,
    temperature: 352,
    flowRate: 2.3,
    timeParam: '2024-03-15T10:00',
    conclusion: '高温黑烟型喷口，流速稳定，建议列为长期监测点A1。{{time:2024-03-15T10:00}}处温度峰值符合基线。',
    version: 'V2',
    reviewStatus: 'approved',
    isDuplicate: false,
    isOutOfBounds: false,
    createdAt: '2024-03-15T10:00:00Z',
    updatedAt: '2024-03-20T14:30:00Z',
  },
  {
    id: 'rec-002',
    sourceFile: 'survey_2024_q1.xlsx',
    sourceLine: 58,
    sourceNote: '同一测点UTM坐标系补录',
    coordinateSystem: 'UTM51N',
    x: 250230.5,
    y: 2760200.0,
    z_m: 2480,
    temperature: 352,
    flowRate: 2.3,
    timeParam: '2024-03-15T10:00',
    conclusion: '与rec-001坐标重合，疑似重复导入。',
    version: 'V1',
    reviewStatus: 'pending',
    isDuplicate: true,
    duplicateOf: 'rec-001',
    isOutOfBounds: false,
    createdAt: '2024-03-15T10:05:00Z',
    updatedAt: '2024-03-15T10:05:00Z',
  },
  {
    id: 'rec-003',
    sourceFile: 'survey_2024_q1.xlsx',
    sourceLine: 71,
    sourceNote: '喷口群东北方向次级喷口',
    coordinateSystem: 'WGS84',
    x: 121.5045,
    y: 25.0032,
    z_m: 2510,
    temperature: 285,
    flowRate: 1.8,
    timeParam: '2024-03-15T11:20',
    conclusion: '中温型喷口，矿物沉积速率较高。{{time:2024-03-15T11:20}}观测到白色菌席。',
    version: 'V1',
    reviewStatus: 'pending',
    isDuplicate: false,
    isOutOfBounds: false,
    createdAt: '2024-03-15T11:20:00Z',
    updatedAt: '2024-03-15T11:20:00Z',
  },
  {
    id: 'rec-004',
    sourceFile: 'rov_log_march.csv',
    sourceLine: 12,
    sourceNote: 'ROV航迹插值点',
    coordinateSystem: 'UTM51N',
    x: 250410.0,
    y: 2760080.0,
    z_m: 2495,
    temperature: 405,
    flowRate: 3.6,
    timeParam: '2024-03-15T12:40',
    conclusion: '温度超出历史阈值(380℃)，需二次确认传感器校准。{{time:2024-03-15T12:40}}可能存在仪器漂移。',
    version: 'V2',
    reviewStatus: 'disputed',
    isDuplicate: false,
    isOutOfBounds: true,
    outOfBoundsFields: ['temperature'],
    createdAt: '2024-03-15T12:40:00Z',
    updatedAt: '2024-03-22T09:15:00Z',
  },
  {
    id: 'rec-005',
    sourceFile: 'rov_log_march.csv',
    sourceLine: 28,
    sourceNote: '局部坐标系施工记录',
    coordinateSystem: 'LOCAL',
    x: 1250.5,
    y: 820.3,
    z_m: 2520,
    temperature: 120,
    flowRate: 0.8,
    timeParam: '2024-03-15T14:00',
    conclusion: '低温扩散流区域，适合底栖生物观测。',
    version: 'V1',
    reviewStatus: 'approved',
    isDuplicate: false,
    isOutOfBounds: false,
    createdAt: '2024-03-15T14:00:00Z',
    updatedAt: '2024-03-15T14:00:00Z',
  },
  {
    id: 'rec-006',
    sourceFile: 'rov_log_march.csv',
    sourceLine: 45,
    sourceNote: '喷口C主烟囱',
    coordinateSystem: 'UTM51N',
    x: 250090.8,
    y: 2759950.2,
    z_m: 2475,
    temperature: 368,
    flowRate: 5.8,
    timeParam: '2024-03-15T15:30',
    conclusion: '流速异常偏高(5.8>5.0m/s)，需检查剖面V2与V1差异。{{time:2024-03-15T15:30}}烟囱高度增长约3米。',
    version: 'V2',
    reviewStatus: 'disputed',
    isDuplicate: false,
    isOutOfBounds: true,
    outOfBoundsFields: ['flowRate'],
    createdAt: '2024-03-15T15:30:00Z',
    updatedAt: '2024-03-25T16:45:00Z',
  },
  {
    id: 'rec-007',
    sourceFile: 'local_survey_notes.xlsx',
    sourceLine: 3,
    sourceNote: '现场施工测量补录',
    coordinateSystem: 'LOCAL',
    x: 680.0,
    y: 1100.0,
    z_m: 2505,
    temperature: 180,
    flowRate: 1.2,
    timeParam: '2024-03-16T09:15',
    conclusion: '过渡带喷口，温度波动较大。',
    version: 'V1',
    reviewStatus: 'pending',
    isDuplicate: false,
    isOutOfBounds: false,
    createdAt: '2024-03-16T09:15:00Z',
    updatedAt: '2024-03-16T09:15:00Z',
  },
];

export const SAMPLE_PROFILES: ProfileVersion[] = [
  {
    id: 'prof-001-v1',
    recordId: 'rec-001',
    version: 'V1',
    imageName: 'profile_A1_V1.png',
    imageDataUrl: makeProfileImage('#1a3a5c', 'PROFILE A1 — V1 (OLD)'),
    note: '初始勘测剖面图，2024-03-10',
    createdAt: '2024-03-10T00:00:00Z',
  },
  {
    id: 'prof-001-v2',
    recordId: 'rec-001',
    version: 'V2',
    imageName: 'profile_A1_V2.png',
    imageDataUrl: makeProfileImage('#2d5a3a', 'PROFILE A1 — V2 (REVIEW)'),
    note: '评审员修正：右侧热液通道加深2.5m',
    createdAt: '2024-03-20T14:30:00Z',
  },
  {
    id: 'prof-004-v1',
    recordId: 'rec-004',
    version: 'V1',
    imageName: 'profile_B3_V1.png',
    imageDataUrl: makeProfileImage('#5c2a1a', 'PROFILE B3 — V1 (OLD)'),
    note: '温度异常点原始剖面',
    createdAt: '2024-03-15T12:40:00Z',
  },
  {
    id: 'prof-004-v2',
    recordId: 'rec-004',
    version: 'V2',
    imageName: 'profile_B3_V2.png',
    imageDataUrl: makeProfileImage('#7c3a1a', 'PROFILE B3 — V2 (REVIEW)'),
    note: '评审员复核：传感器位置偏移修正后温度降为372℃',
    createdAt: '2024-03-22T09:15:00Z',
  },
  {
    id: 'prof-006-v1',
    recordId: 'rec-006',
    version: 'V1',
    imageName: 'profile_C1_V1.png',
    imageDataUrl: makeProfileImage('#4a2a5c', 'PROFILE C1 — V1 (OLD)'),
    note: '喷口C原始剖面',
    createdAt: '2024-03-15T15:30:00Z',
  },
  {
    id: 'prof-006-v2',
    recordId: 'rec-006',
    version: 'V2',
    imageName: 'profile_C1_V2.png',
    imageDataUrl: makeProfileImage('#6a3a7c', 'PROFILE C1 — V2 (REVIEW)'),
    note: '评审员修正：烟囱高度+3m，流速重新计算',
    createdAt: '2024-03-25T16:45:00Z',
  },
];

export const DEFAULT_VIEWPOINTS: Viewpoint[] = [
  {
    id: 'vp-overview',
    name: '全景俯视',
    camera: {
      position: { x: 0, y: 120, z: 0 },
      target: { x: 0, y: -30, z: 0 },
    },
    savedAt: '2024-03-01T00:00:00Z',
  },
  {
    id: 'vp-vent-closeup',
    name: '喷口近景',
    camera: {
      position: { x: 25, y: -15, z: 35 },
      target: { x: 0, y: -35, z: 0 },
    },
    savedAt: '2024-03-01T00:00:00Z',
  },
  {
    id: 'vp-section-side',
    name: '剖面侧视',
    camera: {
      position: { x: 80, y: 0, z: 0 },
      target: { x: 0, y: -30, z: 0 },
    },
    savedAt: '2024-03-01T00:00:00Z',
  },
];

export const TIME_PARAMS = [
  '2024-03-15T10:00',
  '2024-03-15T11:20',
  '2024-03-15T12:40',
  '2024-03-15T14:00',
  '2024-03-15T15:30',
  '2024-03-16T09:15',
];
