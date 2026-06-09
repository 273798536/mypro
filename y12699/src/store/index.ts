import { create } from 'zustand';
import type {
  BatchMaterial, SliceParam, OutlierPoint, CollisionFrame,
  MeasurementRecord, AnomalyItem, PointCloudData
} from '@/types';
import {
  mockBatches, defaultSliceParam, mockOutliers, mockCollisionFrames,
  mockMeasurements, mockAnomalies, mockPointClouds
} from '@/data/mockData';

interface AppState {
  currentBatchId: string | null;
  batchList: BatchMaterial[];
  sliceParams: SliceParam;
  outlierPoints: OutlierPoint[];
  selectedOutlierId: string | null;
  collisionFrames: CollisionFrame[];
  currentCollisionTime: number;
  measurementRecords: MeasurementRecord[];
  anomalies: AnomalyItem[];
  pointCloud: PointCloudData | null;

  selectBatch: (id: string) => void;
  updateSliceParam: <K extends keyof SliceParam>(key: K, value: SliceParam[K]) => void;
  validateSliceBounds: () => { valid: boolean; reason?: string };
  toggleOutlierReview: (id: string) => void;
  selectOutlier: (id: string | null) => void;
  setCollisionTime: (t: number) => void;
  updateCollisionDuration: (seconds: number) => void;
  recomputeCollisionFrames: () => void;
  markAnomalyResolved: (id: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  currentBatchId: mockBatches[0]?.id ?? null,
  batchList: mockBatches,
  sliceParams: { ...defaultSliceParam },
  outlierPoints: mockOutliers[mockBatches[0]?.id] ?? [],
  selectedOutlierId: null,
  collisionFrames: mockCollisionFrames[mockBatches[0]?.id] ?? [],
  currentCollisionTime: 0,
  measurementRecords: mockMeasurements[mockBatches[0]?.id] ?? [],
  anomalies: mockAnomalies[mockBatches[0]?.id] ?? [],
  pointCloud: mockPointClouds[mockBatches[0]?.id] ?? null,

  selectBatch: (id: string) => {
    set({
      currentBatchId: id,
      outlierPoints: mockOutliers[id] ?? [],
      collisionFrames: mockCollisionFrames[id] ?? [],
      measurementRecords: mockMeasurements[id] ?? [],
      anomalies: mockAnomalies[id] ?? [],
      pointCloud: mockPointClouds[id] ?? null,
      selectedOutlierId: null,
      currentCollisionTime: 0,
      sliceParams: { ...defaultSliceParam },
    });
  },

  updateSliceParam: (key, value) => {
    set((state) => {
      const newParams = { ...state.sliceParams, [key]: value };
      const { valid, reason } = validateSliceBoundsInternal(newParams, state.pointCloud);
      newParams.isOutOfBounds = !valid;
      newParams.outOfBoundReason = reason ?? null;
      return { sliceParams: newParams };
    });
  },

  validateSliceBounds: () => {
    const { sliceParams, pointCloud } = get();
    return validateSliceBoundsInternal(sliceParams, pointCloud);
  },

  toggleOutlierReview: (id: string) => {
    set((state) => ({
      outlierPoints: state.outlierPoints.map(p =>
        p.id === id ? { ...p, reviewed: !p.reviewed } : p
      ),
    }));
  },

  selectOutlier: (id: string | null) => set({ selectedOutlierId: id }),

  setCollisionTime: (t: number) => set({ currentCollisionTime: t }),

  updateCollisionDuration: (seconds: number) => {
    const step = 0.5;
    const frameCount = Math.floor(seconds / step) + 1;
    const batchId = get().currentBatchId ?? 'unknown';
    const newFrames: CollisionFrame[] = Array.from({ length: frameCount }, (_, i) => {
      const t = i * step;
      const angle = (i / (frameCount - 1 || 1)) * Math.PI;
      const hasCollision = i >= Math.floor(frameCount * 0.55) && i <= Math.floor(frameCount * 0.75);
      return {
        id: `frame-${i}`,
        batchId,
        timeSecond: t,
        hasCollision,
        collisionDetail: hasCollision
          ? `关节J3与障碍物最小距离 ${(3 - (i - Math.floor(frameCount * 0.55)) * 0.3).toFixed(2)}mm，低于安全阈值5mm`
          : '无碰撞风险，最小距离大于安全阈值',
        minDistance_mm: hasCollision ? 3 - (i - Math.floor(frameCount * 0.55)) * 0.3 : 8 + Math.sin(angle) * 3,
        jointAngles: [0, angle, -angle * 0.5, angle * 0.3, 0, 0],
      };
    });
    set({ collisionFrames: newFrames });
  },

  recomputeCollisionFrames: () => {
    const state = get();
    const duration = state.collisionFrames.length > 0
      ? state.collisionFrames[state.collisionFrames.length - 1].timeSecond
      : 10;
    get().updateCollisionDuration(duration);
  },

  markAnomalyResolved: (id: string) => {
    set((state) => ({
      anomalies: state.anomalies.map(a =>
        a.id === id ? { ...a, resolved: true } : a
      ),
    }));
  },
}));

function validateSliceBoundsInternal(
  params: SliceParam,
  pc: PointCloudData | null
): { valid: boolean; reason?: string } {
  if (!pc) return { valid: true };

  const { bounds } = pc;
  const { planeX, planeY, planeZ, thickness_mm, normalX, normalY, normalZ } = params;

  if (thickness_mm < 0.1) {
    return {
      valid: false,
      reason: `切片厚度 ${thickness_mm.toFixed(2)}mm 低于算法下限 0.1mm，过薄会导致切片点数量不足无法分析。允许范围：0.1mm ~ 50mm。建议修改厚度值。`,
    };
  }

  if (thickness_mm > 50) {
    return {
      valid: false,
      reason: `切片厚度 ${thickness_mm.toFixed(2)}mm 超过上限 50mm，过厚会模糊层间特征。允许范围：0.1mm ~ 50mm。建议减小厚度值。`,
    };
  }

  const normLen = Math.sqrt(normalX ** 2 + normalY ** 2 + normalZ ** 2);
  if (Math.abs(normLen - 1.0) > 0.01) {
    return {
      valid: false,
      reason: `法向量 [${normalX.toFixed(3)}, ${normalY.toFixed(3)}, ${normalZ.toFixed(3)}] 未归一化（模长=${normLen.toFixed(4)}），公式要求法向量模长=1。建议使用归一化按钮重新计算。`,
    };
  }

  const planeDist = normalX * planeX + normalY * planeY + normalZ * planeZ;
  const halfThick = thickness_mm / 2;

  const corners = [
    [bounds.minX, bounds.minY, bounds.minZ],
    [bounds.maxX, bounds.minY, bounds.minZ],
    [bounds.minX, bounds.maxY, bounds.minZ],
    [bounds.maxX, bounds.maxY, bounds.minZ],
    [bounds.minX, bounds.minY, bounds.maxZ],
    [bounds.maxX, bounds.minY, bounds.maxZ],
    [bounds.minX, bounds.maxY, bounds.maxZ],
    [bounds.maxX, bounds.maxY, bounds.maxZ],
  ];

  const cornerDists = corners.map(
    ([x, y, z]) => normalX * x + normalY * y + normalZ * z
  );
  const minCornerDist = Math.min(...cornerDists);
  const maxCornerDist = Math.max(...cornerDists);

  if (planeDist + halfThick < minCornerDist) {
    return {
      valid: false,
      reason: `剖切面位置 ${planeDist.toFixed(2)}mm 完全在点云外侧。点云在该法向的范围为 [${minCornerDist.toFixed(2)}, ${maxCornerDist.toFixed(2)}]mm，切面+厚度上界=${(planeDist + halfThick).toFixed(2)}mm < 下界。建议将切面位置向点云中心方向移动。`,
    };
  }

  if (planeDist - halfThick > maxCornerDist) {
    return {
      valid: false,
      reason: `剖切面位置 ${planeDist.toFixed(2)}mm 完全在点云外侧。点云在该法向的范围为 [${minCornerDist.toFixed(2)}, ${maxCornerDist.toFixed(2)}]mm，切面-厚度下界=${(planeDist - halfThick).toFixed(2)}mm > 上界。建议将切面位置向点云中心方向移动。`,
    };
  }

  return { valid: true };
}
