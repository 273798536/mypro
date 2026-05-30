import { GimbalLockState, AttitudeWarning, WarningType, EulerAngles } from '../types';
import { normalizeAngle } from '../utils/math';
import { GIMBAL_LOCK_THRESHOLD } from '../utils/constants';

export interface CorrectionResult {
  canAutoCorrect: boolean;
  correctedAngles?: EulerAngles;
  steps: string[];
  explanation: string;
}

export const generateGimbalLockCorrection = (
  state: GimbalLockState,
  currentAngles: EulerAngles
): CorrectionResult => {
  if (!state.isLocked) {
    return {
      canAutoCorrect: false,
      steps: [],
      explanation: '当前无万向节锁，无需修正',
    };
  }

  const targetPitch = state.lockAngle > 0
    ? GIMBAL_LOCK_THRESHOLD - 5
    : -(GIMBAL_LOCK_THRESHOLD - 5);

  const correctedAngles: EulerAngles = {
    ...currentAngles,
    pitch: targetPitch,
  };

  return {
    canAutoCorrect: true,
    correctedAngles,
    explanation: `万向节锁发生在俯仰角接近±90°时，此时偏航角和滚转角的旋转轴重合，失去一个自由度。将俯仰角移出 ${-GIMBAL_LOCK_THRESHOLD}° ~ ${GIMBAL_LOCK_THRESHOLD}° 范围即可恢复。`,
    steps: [
      `将俯仰角从 ${state.lockAngle.toFixed(1)}° 调整到 ${targetPitch.toFixed(1)}°，移出锁定区域`,
      '考虑使用四元数代替欧拉角表示姿态，从根本上避免万向节锁问题',
      '重新规划航天器机动轨迹，避免穿过俯仰角±90°的奇异点',
      '如果必须经过该区域，使用轨迹规划算法确保平滑过渡',
    ],
  };
};

export const generateAngleOutOfRangeCorrection = (
  warning: AttitudeWarning,
  currentAngles: EulerAngles
): CorrectionResult => {
  if (warning.type !== 'angle_out_of_range' || !warning.axis || warning.currentValue === undefined) {
    return {
      canAutoCorrect: false,
      steps: [],
      explanation: '无效的角度越界警告',
    };
  }

  const normalized = normalizeAngle(warning.currentValue);
  const correctedAngles = { ...currentAngles };
  correctedAngles[warning.axis] = normalized;

  return {
    canAutoCorrect: true,
    correctedAngles,
    explanation: `角度越界通常是由于数据采集设备量程设置错误或数据传输异常导致的。通过模360运算可以将角度归一化到[-180°, 180°]范围。`,
    steps: [
      `使用 angle % 360 归一化角度：${warning.currentValue.toFixed(1)}° → ${normalized.toFixed(1)}°`,
      '检查数据采集设备的角度量程设置是否正确',
      '对连续帧数据进行滑动平均平滑处理，去除异常跳变',
      '检查传感器是否存在零点漂移，进行校准',
      '如果是多圈编码器，确认圈数计数是否正确',
    ],
  };
};

export const generateAxisReversedCorrection = (
  warning: AttitudeWarning,
  currentAngles: EulerAngles
): CorrectionResult => {
  if (!warning.axis || warning.currentValue === undefined) {
    return {
      canAutoCorrect: false,
      steps: [],
      explanation: '无效的坐标轴反向警告',
    };
  }

  const correctedValue = -warning.currentValue;
  const correctedAngles = { ...currentAngles };
  correctedAngles[warning.axis] = correctedValue;

  const isTrend = warning.type === 'trend_reversed';
  const explanation = isTrend
    ? `趋势反转通常是由于传感器安装方向与定义坐标系不一致，或数据源坐标系翻转导致的。连续帧变化方向突变是典型特征。`
    : `坐标轴反向通常是由于传感器安装方向与定义坐标系不一致导致的。单帧角度变化超过180°是典型特征。`;

  return {
    canAutoCorrect: true,
    correctedAngles,
    explanation,
    steps: [
      `对${warning.axis === 'pitch' ? '俯仰角' : warning.axis === 'yaw' ? '偏航角' : '滚转角'}取负值：${warning.currentValue.toFixed(1)}° → ${correctedValue.toFixed(1)}°`,
      '检查传感器物理安装方向是否与坐标系定义一致',
      '如果安装方向确实相反，在校准矩阵中添加符号修正因子',
      '确认右手坐标系定义是否正确（X-俯仰，Y-偏航，Z-滚转）',
      '对比参考数据或地面测量值确认修正方向',
    ],
  };
};

export const generateMissingDataCorrection = (
  warning: AttitudeWarning
): CorrectionResult => {
  if (warning.type !== 'missing_data') {
    return {
      canAutoCorrect: false,
      steps: [],
      explanation: '无效的数据缺失警告',
    };
  }

  return {
    canAutoCorrect: false,
    explanation: `数据缺失可能是由于传感器故障、传输中断或采样不同步导致的。当前已使用预测值填充，但建议排查根本原因。`,
    steps: [
      '检查数据采集设备电源和通信连接是否正常',
      '检查数据传输链路是否存在干扰或丢包',
      '考虑增加数据采样频率，提高时间分辨率',
      '对缺失数据使用线性插值或卡尔曼滤波进行更精确的填充',
      '如果是周期性缺失，检查传感器同步触发信号',
      '评估是否需要冗余传感器配置',
    ],
  };
};

export const generateLateAxisCorrection = (
  warning: AttitudeWarning
): CorrectionResult => {
  if (warning.type !== 'late_axis') {
    return {
      canAutoCorrect: false,
      steps: [],
      explanation: '无效的坐标轴晚到警告',
    };
  }

  return {
    canAutoCorrect: false,
    explanation: `坐标轴数据晚到通常是由于多传感器同步不准确或数据处理延迟不一致导致的。`,
    steps: [
      '检查所有传感器的同步时钟是否一致，使用统一的时间源',
      '调整数据采集时序，确保三轴数据同时触发采集',
      '考虑使用硬件时间戳进行精确的数据对齐',
      '在数据处理 pipeline 中添加同步缓冲，等待所有轴数据到达后再处理',
      '如果是网络传输导致，评估网络延迟并考虑本地数据缓存',
    ],
  };
};

export const generateCorrection = (
  warning: AttitudeWarning,
  currentAngles: EulerAngles,
  gimbalLockState?: GimbalLockState
): CorrectionResult => {
  switch (warning.type) {
    case 'gimbal_lock':
      if (gimbalLockState) {
        return generateGimbalLockCorrection(gimbalLockState, currentAngles);
      }
      return {
        canAutoCorrect: false,
        steps: [],
        explanation: '缺少万向节锁状态信息',
      };
    case 'angle_out_of_range':
      return generateAngleOutOfRangeCorrection(warning, currentAngles);
    case 'axis_reversed':
    case 'trend_reversed':
      return generateAxisReversedCorrection(warning, currentAngles);
    case 'missing_data':
      return generateMissingDataCorrection(warning);
    case 'late_axis':
      return generateLateAxisCorrection(warning);
    default:
      return {
        canAutoCorrect: false,
        steps: [],
        explanation: '未知警告类型',
      };
  }
};

export const getWarningTypeLabel = (type: WarningType): string => {
  const labels: Record<WarningType, string> = {
    gimbal_lock: '万向节锁',
    angle_out_of_range: '角度越界',
    axis_reversed: '坐标轴反向',
    trend_reversed: '趋势反转',
    missing_data: '数据缺失',
    late_axis: '坐标轴晚到',
  };
  return labels[type];
};
