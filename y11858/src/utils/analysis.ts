import type {
  SliceSettings,
  ColorScaleIssue,
  SliceViolation,
  NormalizationCheck,
  ColorScaleCheck,
  SliceBoundsCheck,
  ResultClassification,
  RunResult,
  ParameterChange,
} from '../types';
import { numericalIntegral } from './orbitalCalculations';

export function checkNormalization(
  data: Float32Array,
  gridSize: number,
  resolution: number,
  tolerance = 0.1
): NormalizationCheck {
  const integralValue = numericalIntegral(data, gridSize, resolution);
  return {
    passed: Math.abs(integralValue - 1) <= tolerance,
    integralValue,
    tolerance,
  };
}

export function checkColorScale(
  data: Float32Array,
  colorRange: [number, number],
  useLogScale: boolean
): ColorScaleCheck {
  const issues: ColorScaleIssue[] = [];
  const [rangeMin, rangeMax] = colorRange;
  const range = rangeMax - rangeMin;

  let inRange = 0;
  let inLow10 = 0;
  let saturated = 0;
  const total = data.length;

  for (let i = 0; i < total; i++) {
    const v = data[i];
    const mapped = useLogScale
      ? (v > 0 ? Math.log10(v + 1) : 0)
      : v;

    if (mapped >= rangeMin && mapped <= rangeMax) {
      inRange++;
      if (mapped <= rangeMin + range * 0.1) {
        inLow10++;
      }
    }
    if (mapped > rangeMax) {
      saturated++;
    }
  }

  const lowRatio = inRange > 0 ? inLow10 / inRange : 0;
  const satRatio = saturated / total;

  if (lowRatio > 0.95) {
    issues.push({
      type: 'compression',
      severity: 'error',
      message: `95%以上的数据集中在色阶底部10%范围内（实际${(lowRatio * 100).toFixed(1)}%）`,
      suggestion: '建议使用对数刻度或缩小色阶范围',
    });
  } else if (lowRatio > 0.8) {
    issues.push({
      type: 'compression',
      severity: 'warning',
      message: `80%以上的数据集中在色阶底部10%范围内（实际${(lowRatio * 100).toFixed(1)}%）`,
      suggestion: '考虑使用对数刻度改善可视化效果',
    });
  }

  if (satRatio > 0.1) {
    issues.push({
      type: 'saturation',
      severity: 'error',
      message: `${(satRatio * 100).toFixed(1)}%的数据超出色阶范围上限`,
      suggestion: '建议扩大色阶范围或使用截断映射',
    });
  } else if (satRatio > 0.02) {
    issues.push({
      type: 'saturation',
      severity: 'warning',
      message: `${(satRatio * 100).toFixed(1)}%的数据超出色阶范围上限`,
      suggestion: '部分数据溢出，考虑微调色阶范围',
    });
  }

  return {
    passed: issues.filter(i => i.severity === 'error').length === 0,
    issues,
  };
}

export function checkSliceBounds(
  sliceSettings: SliceSettings,
  gridSize: number
): SliceBoundsCheck {
  const violations: SliceViolation[] = [];

  const checkAxis = (axis: 'x' | 'y' | 'z', enabled: boolean, position: number) => {
    if (!enabled) return;
    if (Math.abs(position) > gridSize) {
      const corrected = Math.sign(position) * gridSize;
      violations.push({
        axis,
        requestedValue: position,
        maxValue: gridSize,
        correctedValue: corrected,
      });
    }
  };

  checkAxis('x', sliceSettings.xEnabled, sliceSettings.xPosition);
  checkAxis('y', sliceSettings.yEnabled, sliceSettings.yPosition);
  checkAxis('z', sliceSettings.zEnabled, sliceSettings.zPosition);

  return {
    passed: violations.length === 0,
    violations,
  };
}

export function classifyResult(
  normCheck: NormalizationCheck,
  colorCheck: ColorScaleCheck,
  sliceCheck: SliceBoundsCheck
): ResultClassification {
  const hasErrors = colorCheck.issues.some(i => i.severity === 'error');
  if (hasErrors) return 'misleading';

  if (!normCheck.passed || !colorCheck.passed || !sliceCheck.passed) {
    return 'needs-review';
  }

  return 'ready';
}

export function compareRuns(run1: RunResult, run2: RunResult): ParameterChange[] {
  const changes: ParameterChange[] = [];

  const compare = (path: string, label: string, oldVal: unknown, newVal: unknown) => {
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes.push({ path, oldValue: oldVal, newValue: newVal, label });
    }
  };

  compare('params.n', '主量子数 n', run1.params.n, run2.params.n);
  compare('params.l', '角量子数 l', run1.params.l, run2.params.l);
  compare('params.m', '磁量子数 m', run1.params.m, run2.params.m);
  compare('params.isNormalized', '归一化状态', run1.params.isNormalized, run2.params.isNormalized);
  compare('vizSettings.resolution', '分辨率', run1.vizSettings.resolution, run2.vizSettings.resolution);
  compare('vizSettings.gridSize', '空间范围', run1.vizSettings.gridSize, run2.vizSettings.gridSize);
  compare('vizSettings.colorMap', '色图', run1.vizSettings.colorMap, run2.vizSettings.colorMap);
  compare('vizSettings.colorRange', '色阶范围', run1.vizSettings.colorRange, run2.vizSettings.colorRange);
  compare('vizSettings.useLogScale', '对数刻度', run1.vizSettings.useLogScale, run2.vizSettings.useLogScale);
  compare('vizSettings.isoThreshold', '等值面阈值', run1.vizSettings.isoThreshold, run2.vizSettings.isoThreshold);
  compare('sliceSettings.xEnabled', 'X切片开关', run1.sliceSettings.xEnabled, run2.sliceSettings.xEnabled);
  compare('sliceSettings.yEnabled', 'Y切片开关', run1.sliceSettings.yEnabled, run2.sliceSettings.yEnabled);
  compare('sliceSettings.zEnabled', 'Z切片开关', run1.sliceSettings.zEnabled, run2.sliceSettings.zEnabled);
  compare('sliceSettings.xPosition', 'X切片位置', run1.sliceSettings.xPosition, run2.sliceSettings.xPosition);
  compare('sliceSettings.yPosition', 'Y切片位置', run1.sliceSettings.yPosition, run2.sliceSettings.yPosition);
  compare('sliceSettings.zPosition', 'Z切片位置', run1.sliceSettings.zPosition, run2.sliceSettings.zPosition);

  return changes;
}
