import { ShotSession, ShotPoint, OutlierType, MaterialSegment } from './types';

const MATERIAL_SEGMENTS: MaterialSegment[] = [
  { id: 'seg-01', name: '第一段-起跳到出手', startIndex: 0, endIndex: 15, sourceFile: '训练记录-20240605-AM.csv' },
  { id: 'seg-02', name: '第二段-出手到最高点', startIndex: 16, endIndex: 30, sourceFile: '训练记录-20240605-AM.csv' },
  { id: 'seg-03', name: '第三段-最高点到入筐', startIndex: 31, endIndex: 49, sourceFile: '训练记录-20240605-AM.csv' },
];

const OUTLIER_TYPE_INFO: Record<OutlierType, { source: string; label: string }> = {
  drift: { source: '设备零点漂移', label: '设备漂移' },
  'camera-loss': { source: '相机视角丢失导致插值异常', label: '视角丢失' },
  interference: { source: '电磁干扰（场地灯光频闪', label: '信号干扰' },
  noise: { source: '传感器随机噪声', label: '随机噪声' },
  unknown: { source: '来源待排查', label: '未知异常' },
};

export const getOutlierTypeLabel = (type: OutlierType) => OUTLIER_TYPE_INFO[type];

function generateParabolaPoint(t: number, _index: number, addNoise: boolean = true) {
  const x = 0.3 + 9.5 * t + (addNoise ? (Math.random() - 0.5) * 0.08 : 0);
  const z = 0.2 + 4.8 * Math.sin(t * Math.PI) + (addNoise ? (Math.random() - 0.5) * 0.06 : 0);
  const y = -4.9 * t * t + 9.8 * t + 2.05 + (addNoise ? (Math.random() - 0.5) * 0.05 : 0);
  return { x, y, z };
}

function getMaterialForIndex(index: number): { id: string; name: string } {
  const seg = MATERIAL_SEGMENTS.find(s => index >= s.startIndex && index <= s.endIndex);
  if (seg) return { id: seg.id, name: seg.name };
  return { id: 'seg-unknown', name: '未知段' };
}

function injectOutlier(
  base: { x: number; y: number; z: number }, type: OutlierType) {
  switch (type) {
    case 'drift':
      return { x: base.x + 2.3, y: base.y + 3.1, z: base.z + 1.5 };
    case 'camera-loss':
      return { x: base.x - 1.8, y: base.y + 5.2, z: base.z - 2.0 };
    case 'interference':
      return { x: base.x + 0.8, y: base.y - 2.5, z: base.z + 1.1 };
    case 'noise':
      return { x: base.x + 0.5, y: base.y + 0.8, z: base.z - 0.4 };
    case 'unknown':
    default:
      return { x: base.x + 1.5, y: base.y + 2.0, z: base.z + 0.9 };
  }
}

function buildPoint(
  index: number, count: number, isOutlier: boolean, outlierType: OutlierType
): ShotPoint {
  const t = index / (count - 1);
  const base = generateParabolaPoint(t, index);
  const final = isOutlier ? injectOutlier(base, outlierType) : base;
  const mat = getMaterialForIndex(index);
  const confidence = isOutlier ? 0.15 + Math.random() * 0.25 : 0.88 + Math.random() * 0.1;

  return {
    id: `pt-${String(index).padStart(3, '0')}`,
    index,
    timestamp: Date.now() - (count - index) * 80,
    x: final.x,
    y: final.y,
    z: final.z,
    originalX: base.x,
    originalY: base.y,
    originalZ: base.z,
    isOutlier,
    outlierType,
    source: isOutlier ? OUTLIER_TYPE_INFO[outlierType].source : 'MotionCapture-正常采集',
    confidence,
    status: 'raw',
    materialId: mat.id,
    materialName: mat.name,
    changeHistory: [],
  };
}

function buildSessionPoints(count: number, outliers: Array<{ index: number; type: OutlierType }>): ShotPoint[] {
  const points: ShotPoint[] = [];
  for (let i = 0; i < count; i++) {
    const outlier = outliers.find(o => o.index === i);
    points.push(buildPoint(i, count, !!outlier, outlier?.type || 'unknown'));
  }
  return points;
}

export const mockShotSessions: ShotSession[] = [
  {
    id: 'session-001',
    name: '2024-06-05 上午投篮训练#03',
    materialName: '训练记录-20240605-AM.csv',
    createdAt: Date.now() - 86400000,
    hasCameraLoss: true,
    cameraLossSegments: [{ start: 22, end: 28 }],
    materialSegments: MATERIAL_SEGMENTS,
    processed: false,
    conclusions: {
      raw: '检测到6个异常点，其中3处位于相机视角丢失段（seg-02），疑似设备插值失败导致轨迹偏离；建议按流程执行重复运行→补录→人工确认三步处理。',
    },
    solutions: {
      're-run': { type: 're-run', applied: false, operator: '', affectedPointIds: [] },
      're-record': { type: 're-record', applied: false, operator: '', affectedPointIds: [] },
      'manual': { type: 'manual', applied: false, operator: '', affectedPointIds: [] },
    },
    points: buildSessionPoints(50, [
      { index: 8, type: 'drift' },
      { index: 23, type: 'camera-loss' },
      { index: 25, type: 'camera-loss' },
      { index: 27, type: 'camera-loss' },
      { index: 36, type: 'interference' },
      { index: 42, type: 'noise' },
    ]),
  },
  {
    id: 'session-002',
    name: '2024-06-05 下午投篮训练#07',
    materialName: '训练记录-20240605-PM.csv',
    createdAt: Date.now() - 172800000,
    hasCameraLoss: false,
    cameraLossSegments: [],
    materialSegments: [
      { id: 'pm-seg-01', name: '完整投篮段', startIndex: 0, endIndex: 44, sourceFile: '训练记录-20240605-PM.csv' },
    ],
    processed: false,
    conclusions: {
      raw: '数据质量良好，检测到2个轻微噪声点，不影响整体抛物面拟合。',
    },
    solutions: {
      're-run': { type: 're-run', applied: false, operator: '', affectedPointIds: [] },
      're-record': { type: 're-record', applied: false, operator: '', affectedPointIds: [] },
      'manual': { type: 'manual', applied: false, operator: '', affectedPointIds: [] },
    },
    points: buildSessionPoints(45, [
      { index: 19, type: 'noise' },
      { index: 31, type: 'noise' },
    ]),
  },
];
