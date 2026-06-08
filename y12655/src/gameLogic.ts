import { GameState, SectionPlane, Bounds3D, CollisionEvent, MeasurementRecord, Conclusion } from './types';

export const CORAL_BOUNDS: Bounds3D = {
  minX: -50,
  maxX: 50,
  minY: 0,
  maxY: 40,
  minZ: -50,
  maxZ: 50,
};

export function createInitialState(): GameState {
  return {
    status: 'ready',
    elapsedMs: 0,
    bleachingProgress: 0,
    sectionPlanes: [
      {
        id: 'sec-1',
        name: '主剖面-X',
        axis: 'x',
        position: 0,
        color: '#60a5fa',
        enabled: true,
        createdAt: Date.now(),
      },
      {
        id: 'sec-2',
        name: '深度剖面-Y',
        axis: 'y',
        position: 20,
        color: '#4ade80',
        enabled: false,
        createdAt: Date.now(),
      },
      {
        id: 'sec-3',
        name: '横剖面-Z',
        axis: 'z',
        position: 0,
        color: '#fbbf24',
        enabled: false,
        createdAt: Date.now(),
      },
    ],
    screenshots: [],
    conclusions: [
      {
        id: 'conc-1',
        text: '珊瑚礁A区白化率约35%，温度异常持续14天，已超过临界阈值。',
        sourceSectionId: 'sec-1',
        sourceMeasurementId: 'meas-1',
        canUseDirectly: true,
        createdAt: Date.now(),
      },
      {
        id: 'conc-2',
        text: 'B区深度15-20m处白化率存疑，需物理老师复核温度梯度记录。',
        sourceSectionId: 'sec-2',
        sourceMeasurementId: null,
        canUseDirectly: false,
        reviewReason: '缺少测量记录 meas-B-15m，温度数据源不完整',
        createdAt: Date.now(),
      },
      {
        id: 'conc-3',
        text: '横剖面对称分布显示洋流影响方向为Z轴正向，白化扩散速率3.2m/天。',
        sourceSectionId: 'sec-3',
        sourceMeasurementId: 'meas-3',
        canUseDirectly: true,
        createdAt: Date.now(),
      },
    ],
    measurements: [
      {
        id: 'meas-1',
        name: 'A区表层温度',
        source: '浮标站FB-001',
        position: { x: 10, y: 2, z: 5 },
        value: 31.2,
        unit: '°C',
        timestamp: Date.now() - 3600000,
      },
      {
        id: 'meas-2',
        name: 'C区浊度',
        source: 'CTD剖面仪',
        position: { x: -20, y: 10, z: -15 },
        value: 8.4,
        unit: 'NTU',
        timestamp: Date.now() - 7200000,
      },
      {
        id: 'meas-3',
        name: '洋流速度',
        source: 'ADCP测流',
        position: { x: 0, y: 15, z: 25 },
        value: 0.32,
        unit: 'm/s',
        timestamp: Date.now() - 1800000,
      },
    ],
    collisions: [],
    importCount: 0,
    activeConclusionId: null,
    activeSectionId: null,
  };
}

export function checkSectionBounds(plane: SectionPlane, bounds: Bounds3D = CORAL_BOUNDS): { valid: boolean; collision?: CollisionEvent } {
  let min: number, max: number, axisLabel: string;
  switch (plane.axis) {
    case 'x': min = bounds.minX; max = bounds.maxX; axisLabel = 'X轴(横向)'; break;
    case 'y': min = bounds.minY; max = bounds.maxY; axisLabel = 'Y轴(深度)'; break;
    case 'z': min = bounds.minZ; max = bounds.maxZ; axisLabel = 'Z轴(纵向)'; break;
  }

  if (plane.position < min || plane.position > max) {
    const missingHint = plane.position < min
      ? `当前位置 ${plane.position.toFixed(1)} 低于下限 ${min}，请检查测量记录 ${plane.axis.toUpperCase()}-MIN 是否完整导入`
      : `当前位置 ${plane.position.toFixed(1)} 超过上限 ${max}，请检查测量记录 ${plane.axis.toUpperCase()}-MAX 是否完整导入`;
    return {
      valid: false,
      collision: {
        id: `col-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: Date.now(),
        type: 'section_out_of_bounds',
        message: `剖面「${plane.name}」越界：${axisLabel}范围应在 [${min}, ${max}]`,
        actionableHint: missingHint,
        resolved: false,
      },
    };
  }
  return { valid: true };
}

export function checkDuplicateImport(importCount: number): CollisionEvent | null {
  if (importCount > 1) {
    return {
      id: `col-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
      type: 'duplicate_import',
      message: `检测到重复导入：已导入 ${importCount} 次相同数据源`,
      actionableHint: '请点击「去重清理」按钮移除重复记录，或确认是否为不同批次数据',
      resolved: false,
    };
  }
  return null;
}

export function findMissingMeasurements(conclusions: Conclusion[], measurements: MeasurementRecord[]): CollisionEvent[] {
  const events: CollisionEvent[] = [];
  conclusions.forEach((c) => {
    if (c.sourceMeasurementId && !measurements.find((m) => m.id === c.sourceMeasurementId)) {
      events.push({
        id: `col-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: Date.now(),
        type: 'missing_measurement',
        message: `结论「${c.text.slice(0, 20)}...」引用的测量记录 ${c.sourceMeasurementId} 不存在`,
        actionableHint: `请导入测量记录「${c.sourceMeasurementId}」，或在结论编辑中重新关联正确的数据源`,
        resolved: false,
      });
    }
  });
  return events;
}

export function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function generateScreenshotName(index: number, plane: SectionPlane | null): string {
  const ts = new Date();
  const timeStr = `${ts.getHours().toString().padStart(2, '0')}${ts.getMinutes().toString().padStart(2, '0')}${ts.getSeconds().toString().padStart(2, '0')}`;
  const planeStr = plane ? `_${plane.axis.toUpperCase()}${plane.position.toFixed(0)}` : '';
  return `coral_bleach_${String(index + 1).padStart(3, '0')}${planeStr}_${timeStr}.png`;
}

export function needsReview(plane: SectionPlane | null): boolean {
  if (!plane) return false;
  const { valid } = checkSectionBounds(plane);
  return !valid;
}
