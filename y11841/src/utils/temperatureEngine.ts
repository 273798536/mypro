import type { FailureReason, CargoBox } from '../data/types';

const BASE_TEMPERATURE = 4;
const CRITICAL_THRESHOLD = 8;
const TEMPERATURE_RISE_PER_10_SECONDS = 0.5;

export const calculateTemperature = (
  remainingTime: number,
  timeLimitSeconds: number
): number => {
  if (remainingTime >= 0) {
    return BASE_TEMPERATURE;
  }

  const overtimeSeconds = Math.abs(remainingTime);
  const temperatureRise = Math.floor(overtimeSeconds / 10) * TEMPERATURE_RISE_PER_10_SECONDS;

  return BASE_TEMPERATURE + temperatureRise;
};

export const checkTimeoutFailure = (
  currentTemperature: number,
  chilledCargoBoxes: CargoBox[]
): FailureReason[] => {
  const failures: FailureReason[] = [];

  if (currentTemperature > CRITICAL_THRESHOLD && chilledCargoBoxes.length > 0) {
    chilledCargoBoxes.forEach(box => {
      failures.push({
        type: 'timeout',
        cargoBoxId: box.id,
        description: `超时升温：由于装车时间过长，车厢温度已升至${currentTemperature.toFixed(1)}°C，超过冷藏货物临界温度${CRITICAL_THRESHOLD}°C。货箱"${box.originalName}"有变质风险。`,
        originalNames: {
          cargoBox: box.originalName,
        },
      });
    });
  }

  return failures;
};

export const getTemperatureStatus = (temp: number): {
  status: 'normal' | 'warning' | 'danger';
  colorClass: string;
  message: string;
} => {
  if (temp <= CRITICAL_THRESHOLD) {
    return {
      status: 'normal',
      colorClass: 'text-cold-chain-success',
      message: '温度正常',
    };
  } else if (temp <= CRITICAL_THRESHOLD + 2) {
    return {
      status: 'warning',
      colorClass: 'text-cold-chain-warning',
      message: '温度偏高，请注意',
    };
  } else {
    return {
      status: 'danger',
      colorClass: 'text-cold-chain-danger',
      message: '温度超标！货物有变质风险',
    };
  }
};

export const formatTime = (seconds: number): string => {
  const absSeconds = Math.abs(seconds);
  const mins = Math.floor(absSeconds / 60);
  const secs = absSeconds % 60;
  const sign = seconds < 0 ? '-' : '';
  return `${sign}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};
