import { AttitudeFrame, DataQuality, EulerAngles, AttitudeWarning } from '../types';
import { ANGLE_WARNING_RANGE } from '../utils/constants';
import { predictNextValue, isAngleOutOfRange, generateId, normalizeAngle } from '../utils/math';

export const validateFrame = (
  frame: AttitudeFrame,
  prevFrames: AttitudeFrame[],
  frameIndex: number
): {
  validatedFrame: AttitudeFrame;
  warnings: AttitudeWarning[];
  dataQuality: DataQuality;
} => {
  const warnings: AttitudeWarning[] = [];
  const missingFields: Array<'pitch' | 'yaw' | 'roll'> = [];
  const lateAxes: Array<'pitch' | 'yaw' | 'roll'> = [];
  const remarks: string[] = [];

  const validatedFrame = { ...frame };

  const axes: Array<'pitch' | 'yaw' | 'roll'> = ['pitch', 'yaw', 'roll'];

  axes.forEach((axis) => {
    if (frame[axis] === undefined) {
      missingFields.push(axis);
      const prevValues = prevFrames
        .filter((f) => f[axis] !== undefined)
        .map((f) => f[axis] as number);
      const predictedValue = predictNextValue(prevValues);
      validatedFrame[axis] = predictedValue;

      warnings.push({
        id: generateId(),
        type: 'missing_data',
        axis,
        currentValue: predictedValue,
        expectedRange: ANGLE_WARNING_RANGE,
        message: `第${frameIndex}帧${axis === 'pitch' ? '俯仰角' : axis === 'yaw' ? '偏航角' : '滚转角'}数据缺失，已使用预测值 ${predictedValue.toFixed(1)}° 填充`,
        correctionSteps: [
          '检查数据采集设备是否正常工作',
          '检查数据传输链路是否稳定',
          '考虑使用更高频率的数据采样',
          '对缺失数据使用线性插值或卡尔曼滤波进行更精确的填充',
        ],
      });
    }

    if (frame.axisArrival && frame.axisArrival[axis] === false) {
      lateAxes.push(axis);
      warnings.push({
        id: generateId(),
        type: 'late_axis',
        axis,
        message: `第${frameIndex}帧${axis === 'pitch' ? '俯仰角' : axis === 'yaw' ? '偏航角' : '滚转角'}数据到达延迟`,
        correctionSteps: [
          '检查传感器同步时钟是否准确',
          '调整数据采集时序，确保三轴数据同步到达',
          '考虑使用硬件时间戳进行数据对齐',
        ],
      });
    }
  });

  if (frame.remark) {
    remarks.push(frame.remark);
  }

  const validatedAngles = {
    pitch: validatedFrame.pitch ?? 0,
    yaw: validatedFrame.yaw ?? 0,
    roll: validatedFrame.roll ?? 0,
  };

  axes.forEach((axis) => {
    const value = validatedAngles[axis];
    if (isAngleOutOfRange(value, ANGLE_WARNING_RANGE)) {
      warnings.push({
        id: generateId(),
        type: 'angle_out_of_range',
        axis,
        currentValue: value,
        expectedRange: ANGLE_WARNING_RANGE,
        message: `${axis === 'pitch' ? '俯仰角' : axis === 'yaw' ? '偏航角' : '滚转角'} ${value.toFixed(1)}° 超出正常范围 [${ANGLE_WARNING_RANGE[0]}°, ${ANGLE_WARNING_RANGE[1]}°]`,
        correctionSteps: [
          `使用 angle % 360 归一化到 [-180°, 180°]，当前值归一化后为 ${normalizeAngle(value).toFixed(1)}°`,
          '检查数据采集设备的量程设置是否正确',
          '对连续帧进行平滑处理，去除异常跳变',
          '检查传感器是否存在零点漂移',
        ],
      });
    }
  });

  if (prevFrames.length > 0) {
    const prevFrame = prevFrames[prevFrames.length - 1];
    axes.forEach((axis) => {
      const prevValue = prevFrame[axis];
      const currValue = validatedFrame[axis];
      if (prevValue !== undefined && currValue !== undefined) {
        const delta = currValue - prevValue;
        if (Math.abs(delta) > 180) {
          const likelyReversed = delta > 180 ? currValue - 360 : currValue + 360;
          warnings.push({
            id: generateId(),
            type: 'axis_reversed',
            axis,
            currentValue: currValue,
            message: `${axis === 'pitch' ? '俯仰角' : axis === 'yaw' ? '偏航角' : '滚转角'}可能存在方向反转，单帧变化 ${delta.toFixed(1)}° 超过180°`,
            correctionSteps: [
              `对该轴角度取负值或加/减360°修正，建议值：${likelyReversed.toFixed(1)}°`,
              '检查传感器安装方向是否正确',
              '在校准矩阵中添加符号修正因子',
              '确认坐标系定义是否与预期一致',
            ],
          });
        }
      }
    });

    if (prevFrames.length >= 3) {
      axes.forEach((axis) => {
        const recentDeltas: number[] = [];
        for (let i = Math.max(0, prevFrames.length - 3); i < prevFrames.length; i++) {
          const curr = prevFrames[i][axis];
          const prev = i > 0 ? prevFrames[i - 1][axis] : undefined;
          if (curr !== undefined && prev !== undefined) {
            recentDeltas.push((curr as number) - (prev as number));
          }
        }

        if (recentDeltas.length >= 2) {
          const prevTrendPositive = recentDeltas.slice(0, -1).every((d) => d > 0);
          const prevTrendNegative = recentDeltas.slice(0, -1).every((d) => d < 0);
          const lastDelta = recentDeltas[recentDeltas.length - 1];
          const currValue = validatedFrame[axis];
          const prevValue = prevFrame[axis];

          if (prevValue !== undefined && currValue !== undefined) {
            const currentDelta = currValue - prevValue;
            const minTrendDelta = 2;
            const hasTrend = prevTrendPositive || prevTrendNegative;
            const trendSign = prevTrendPositive ? 1 : -1;
            const trendMagnitude = Math.abs(recentDeltas[recentDeltas.length - 1]);

            if (
              hasTrend &&
              trendMagnitude >= minTrendDelta &&
              Math.sign(currentDelta) !== Math.sign(trendSign) &&
              Math.abs(currentDelta) >= minTrendDelta
            ) {
              const suggestedValue = prevValue + trendSign * Math.abs(currentDelta);
              warnings.push({
                id: generateId(),
                type: 'trend_reversed',
                axis,
                currentValue: currValue,
                message: `${axis === 'pitch' ? '俯仰角' : axis === 'yaw' ? '偏航角' : '滚转角'}趋势反转，从${prevTrendPositive ? '递增' : '递减'}突变为${currentDelta > 0 ? '递增' : '递减'}（变化 ${currentDelta > 0 ? '+' : ''}${currentDelta.toFixed(1)}°）`,
                correctionSteps: [
                  `若传感器方向装反，对该轴取负值修正，建议值：${(-currValue).toFixed(1)}°`,
                  `若坐标轴定义翻转，对该轴加/减360°修正，建议值：${suggestedValue.toFixed(1)}°`,
                  '检查传感器安装方向是否正确',
                  '确认数据源坐标系定义与系统预期一致',
                ],
              });
            }
          }
        }
      });
    }
  }

  const dataQuality: DataQuality = {
    hasMissingFields: missingFields.length > 0,
    missingFields,
    hasLateAxes: lateAxes.length > 0,
    lateAxes,
    hasRemarks: remarks.length > 0,
    remarks,
  };

  return { validatedFrame, warnings, dataQuality };
};

export const fillMissingFields = (
  frame: AttitudeFrame,
  prevFrames: AttitudeFrame[]
): EulerAngles => {
  const result: EulerAngles = { pitch: 0, yaw: 0, roll: 0 };
  const axes: Array<'pitch' | 'yaw' | 'roll'> = ['pitch', 'yaw', 'roll'];

  axes.forEach((axis) => {
    if (frame[axis] !== undefined) {
      result[axis] = frame[axis] as number;
    } else {
      const prevValues = prevFrames
        .filter((f) => f[axis] !== undefined)
        .map((f) => f[axis] as number);
      result[axis] = predictNextValue(prevValues);
    }
  });

  return result;
};

export const validateAllFrames = (
  frames: AttitudeFrame[]
): {
  validatedFrames: AttitudeFrame[];
  allWarnings: AttitudeWarning[][];
  overallQuality: DataQuality;
} => {
  const validatedFrames: AttitudeFrame[] = [];
  const allWarnings: AttitudeWarning[][] = [];
  const allMissingFields = new Set<'pitch' | 'yaw' | 'roll'>();
  const allLateAxes = new Set<'pitch' | 'yaw' | 'roll'>();
  const allRemarks: string[] = [];

  frames.forEach((frame, index) => {
    const { validatedFrame, warnings, dataQuality } = validateFrame(frame, validatedFrames, index);
    validatedFrames.push(validatedFrame);
    allWarnings.push(warnings);

    dataQuality.missingFields.forEach((f) => allMissingFields.add(f));
    dataQuality.lateAxes.forEach((a) => allLateAxes.add(a));
    allRemarks.push(...dataQuality.remarks);
  });

  const overallQuality: DataQuality = {
    hasMissingFields: allMissingFields.size > 0,
    missingFields: Array.from(allMissingFields),
    hasLateAxes: allLateAxes.size > 0,
    lateAxes: Array.from(allLateAxes),
    hasRemarks: allRemarks.length > 0,
    remarks: allRemarks,
  };

  return { validatedFrames, allWarnings, overallQuality };
};
