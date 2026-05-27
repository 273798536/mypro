import { SolarParams, ValidationError } from '../types';

const VALID_TIMEZONES = [
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Singapore',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Australia/Sydney'
];

export function validateParams(params: SolarParams): ValidationError[] {
  const errors: ValidationError[] = [];

  if (params.location.lat < -90 || params.location.lat > 90) {
    errors.push({
      field: 'latitude',
      message: '纬度必须在 -90° 到 90° 之间',
      type: 'error'
    });
  }

  if (params.location.lng < -180 || params.location.lng > 180) {
    errors.push({
      field: 'longitude',
      message: '经度必须在 -180° 到 180° 之间',
      type: 'error'
    });
  }

  if (!VALID_TIMEZONES.includes(params.location.timezone) && params.location.timezone) {
    errors.push({
      field: 'timezone',
      message: `时区 "${params.location.timezone}" 可能不正确，已使用默认时区计算`,
      type: 'warning'
    });
  }

  if (params.tiltAngle < 0 || params.tiltAngle > 90) {
    errors.push({
      field: 'tiltAngle',
      message: '倾角越界！倾角必须在 0° 到 90° 之间，当前值已被限制',
      type: 'error'
    });
  }

  if (params.weatherFactor < 0.1 || params.weatherFactor > 1.0) {
    errors.push({
      field: 'weatherFactor',
      message: params.weatherFactor < 0.3 
        ? '阴天系数过低，计算结果可能不准确' 
        : '天气系数异常，建议在 0.3 - 1.0 之间',
      type: 'warning'
    });
  }

  if (params.panelArea <= 0 || params.panelArea > 100) {
    errors.push({
      field: 'panelArea',
      message: '面板面积必须在 0 - 100 平方米之间',
      type: 'error'
    });
  }

  const dateObj = new Date(params.date);
  if (isNaN(dateObj.getTime())) {
    errors.push({
      field: 'date',
      message: '日期格式无效',
      type: 'error'
    });
  }

  return errors;
}

export function clampParams(params: SolarParams): SolarParams {
  return {
    ...params,
    location: {
      ...params.location,
      lat: Math.max(-90, Math.min(90, params.location.lat)),
      lng: Math.max(-180, Math.min(180, params.location.lng))
    },
    tiltAngle: Math.max(0, Math.min(90, params.tiltAngle)),
    weatherFactor: Math.max(0.1, Math.min(1.0, params.weatherFactor)),
    panelArea: Math.max(0.1, Math.min(100, params.panelArea))
  };
}
