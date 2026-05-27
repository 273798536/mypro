import {
  TemperatureUnit,
  ValidationResult,
  PHYSICS_CONSTANTS,
  ColorStop,
} from '../types';

export const celsiusToKelvin = (celsius: number): number => celsius + 273.15;

export const fahrenheitToKelvin = (fahrenheit: number): number =>
  (fahrenheit - 32) * (5 / 9) + 273.15;

export const kelvinToCelsius = (kelvin: number): number => kelvin - 273.15;

export const kelvinToFahrenheit = (kelvin: number): number =>
  (kelvin - 273.15) * (9 / 5) + 32;

export const toKelvin = (temperature: number, unit: TemperatureUnit): number => {
  switch (unit) {
    case 'celsius':
      return celsiusToKelvin(temperature);
    case 'fahrenheit':
      return fahrenheitToKelvin(temperature);
    case 'kelvin':
      return temperature;
    default:
      return temperature;
  }
};

export const fromKelvin = (kelvin: number, unit: TemperatureUnit): number => {
  switch (unit) {
    case 'celsius':
      return kelvinToCelsius(kelvin);
    case 'fahrenheit':
      return kelvinToFahrenheit(kelvin);
    case 'kelvin':
      return kelvin;
    default:
      return kelvin;
  }
};

export const convertTemperature = (
  value: number,
  fromUnit: TemperatureUnit,
  toUnit: TemperatureUnit,
): number => {
  if (fromUnit === toUnit) return value;
  const kelvin = toKelvin(value, fromUnit);
  return fromKelvin(kelvin, toUnit);
};

export const calculateDistance = (
  pos1: [number, number, number],
  pos2: [number, number, number],
): number => {
  const dx = pos2[0] - pos1[0];
  const dy = pos2[1] - pos1[1];
  const dz = pos2[2] - pos1[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

export const calculateRadiationIntensity = (
  temperatureKelvin: number,
  emissivity: number,
  area: number,
  distance: number,
): { intensity: number; exitance: number } => {
  const { STEFAN_BOLTZMANN } = PHYSICS_CONSTANTS;
  const exitance = emissivity * STEFAN_BOLTZMANN * Math.pow(temperatureKelvin, 4);
  const safeDistance = Math.max(distance, PHYSICS_CONSTANTS.MIN_DISTANCE);
  const intensity = (exitance * area) / (4 * Math.PI * safeDistance * safeDistance);
  return { intensity, exitance };
};

export const validateTemperature = (
  value: number,
  unit: TemperatureUnit,
): ValidationResult => {
  const kelvin = toKelvin(value, unit);

  if (kelvin < PHYSICS_CONSTANTS.MIN_TEMPERATURE_K) {
    return {
      valid: false,
      level: 'error',
      parameterName: 'temperature',
      message: `温度值 ${value}${unit === 'celsius' ? '°C' : unit === 'fahrenheit' ? '°F' : 'K'} 转换后为 ${kelvin.toFixed(2)}K，低于绝对零度 (0K)`,
      correction: `请输入大于 ${fromKelvin(PHYSICS_CONSTANTS.MIN_TEMPERATURE_K, unit).toFixed(2)}${unit === 'celsius' ? '°C' : unit === 'fahrenheit' ? '°F' : 'K'} 的温度值`,
    };
  }

  if (kelvin > PHYSICS_CONSTANTS.MAX_TEMPERATURE_K) {
    return {
      valid: true,
      level: 'warning',
      parameterName: 'temperature',
      message: `温度值 ${kelvin.toFixed(0)}K 已超过太阳表面温度 (约5800K)，超出常规材料范围`,
      correction: '计算仍将继续，但结果可能不具备实际物理意义',
    };
  }

  return {
    valid: true,
    level: 'info',
    parameterName: 'temperature',
    message: `温度值合法：${kelvin.toFixed(2)}K`,
  };
};

export const validateDistance = (distance: number): ValidationResult => {
  if (distance <= 0) {
    return {
      valid: false,
      level: 'error',
      parameterName: 'distance',
      message: `距离值 ${distance.toFixed(4)}m 无效，距离必须为正数`,
      correction: `系统已将距离自动设置为最小值 ${PHYSICS_CONSTANTS.MIN_DISTANCE}m`,
    };
  }

  if (distance < PHYSICS_CONSTANTS.MIN_DISTANCE) {
    return {
      valid: true,
      level: 'warning',
      parameterName: 'distance',
      message: `距离值 ${distance.toFixed(4)}m 过小，可能导致计算数值不稳定`,
      correction: `系统已将距离自动设置为最小值 ${PHYSICS_CONSTANTS.MIN_DISTANCE}m`,
    };
  }

  return {
    valid: true,
    level: 'info',
    parameterName: 'distance',
    message: `距离值合法：${distance.toFixed(4)}m`,
  };
};

export const validateArea = (area: number): ValidationResult => {
  if (area <= 0) {
    return {
      valid: false,
      level: 'error',
      parameterName: 'area',
      message: `面积值 ${area.toFixed(4)}m² 无效，面积必须为正数`,
      correction: '请输入大于0的面积值',
    };
  }

  return {
    valid: true,
    level: 'info',
    parameterName: 'area',
    message: `面积值合法：${area.toFixed(4)}m²`,
  };
};

export const validateEmissivity = (emissivity: number): ValidationResult => {
  if (emissivity < 0 || emissivity > 1) {
    const clamped = Math.max(0, Math.min(1, emissivity));
    return {
      valid: true,
      level: 'warning',
      parameterName: 'emissivity',
      message: `发射率值 ${emissivity.toFixed(4)} 超出有效范围 [0, 1]`,
      correction: `已自动修正为 ${clamped.toFixed(4)}`,
    };
  }

  return {
    valid: true,
    level: 'info',
    parameterName: 'emissivity',
    message: `发射率值合法：${emissivity.toFixed(4)}`,
  };
};

export const checkColorScaleDistortion = (
  intensity: number,
  referenceIntensity: number,
): ValidationResult => {
  const ratio = intensity / referenceIntensity;
  if (ratio > 10 || ratio < 0.1) {
    return {
      valid: true,
      level: 'warning',
      parameterName: 'colorScale',
      message: `强度值 ${intensity.toExponential(2)} W/m² 与参考值偏差 ${ratio.toFixed(1)} 倍，可能导致色阶失真`,
      correction: '建议调整参数范围或使用对数色阶显示',
    };
  }

  return {
    valid: true,
    level: 'info',
    parameterName: 'colorScale',
    message: '色阶映射正常',
  };
};

export const generateColorStops = (
  maxIntensity: number,
  minIntensity: number = 0,
): ColorStop[] => {
  const range = maxIntensity - minIntensity;
  if (range <= 0) {
    return [
      { position: 0, color: '#1e3a5f' },
      { position: 1, color: '#1e3a5f' },
    ];
  }

  return [
    { position: 0, color: '#0d1b2a' },
    { position: 0.2, color: '#1b3a5f' },
    { position: 0.4, color: '#4169e1' },
    { position: 0.6, color: '#9932cc' },
    { position: 0.8, color: '#ff6b35' },
    { position: 1, color: '#ff0000' },
  ];
};

export const intensityToColor = (
  intensity: number,
  maxIntensity: number,
  minIntensity: number = 0,
): [number, number, number] => {
  const normalized = Math.max(
    0,
    Math.min(1, (intensity - minIntensity) / (maxIntensity - minIntensity || 1)),
  );

  if (normalized < 0.2) {
    const t = normalized / 0.2;
    return [
      Math.floor(13 + (27 - 13) * t),
      Math.floor(27 + (58 - 27) * t),
      Math.floor(42 + (95 - 42) * t),
    ];
  } else if (normalized < 0.4) {
    const t = (normalized - 0.2) / 0.2;
    return [
      Math.floor(27 + (65 - 27) * t),
      Math.floor(58 + (105 - 58) * t),
      Math.floor(95 + (225 - 95) * t),
    ];
  } else if (normalized < 0.6) {
    const t = (normalized - 0.4) / 0.2;
    return [
      Math.floor(65 + (153 - 65) * t),
      Math.floor(105 + (50 - 105) * t),
      Math.floor(225 + (204 - 225) * t),
    ];
  } else if (normalized < 0.8) {
    const t = (normalized - 0.6) / 0.2;
    return [
      Math.floor(153 + (255 - 153) * t),
      Math.floor(50 + (107 - 50) * t),
      Math.floor(204 + (53 - 204) * t),
    ];
  } else {
    const t = (normalized - 0.8) / 0.2;
    return [
      Math.floor(255 + (255 - 255) * t),
      Math.floor(107 + (0 - 107) * t),
      Math.floor(53 + (0 - 53) * t),
    ];
  }
};

export const formatNumber = (num: number, decimals: number = 4): string => {
  if (Math.abs(num) < 0.0001 || Math.abs(num) >= 10000) {
    return num.toExponential(decimals);
  }
  return num.toFixed(decimals);
};

export const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
};

export const formatDateTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
};
