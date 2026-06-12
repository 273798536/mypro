import type { WeatherForecast, ImportValidationError } from '@/types';

export const REQUIRED_WEATHER_FIELDS = ['timestamp', 'windSpeed', 'waveHeight', 'wavePeriod'];
export const OPTIONAL_WEATHER_FIELDS = ['windDirection', 'airPressure', 'temperature'];
export const FIELD_HINT_MAP: Record<string, string> = {
  timestamp: '时间戳（2026-06-12 08:00）',
  windSpeed: '风速（m/s）',
  windDirection: '风向（° 0-360）',
  waveHeight: '有效波高（m）',
  wavePeriod: '波浪周期（s）',
  airPressure: '气压（hPa）',
  temperature: '气温（℃）',
};

export interface WeatherValidateResult {
  ok: boolean;
  data: WeatherForecast[];
  errors: ImportValidationError[];
  warnings: ImportValidationError[];
}

export function validateWeatherRows(raws: Record<string, any>[], sourceName: string): WeatherValidateResult {
  const errors: ImportValidationError[] = [];
  const warnings: ImportValidationError[] = [];
  const data: WeatherForecast[] = [];

  if (!raws.length) {
    errors.push({ message: 'CSV/Excel 未包含任何数据行', suggestion: '请检查导出文件是否为空' });
    return { ok: false, data, errors, warnings };
  }

  const headers = Object.keys(raws[0]);
  const missingFields = REQUIRED_WEATHER_FIELDS.filter(f => !headers.includes(f));
  if (missingFields.length) {
    errors.push({
      message: `缺少必填列：${missingFields.map(f => `${f}（${FIELD_HINT_MAP[f]}）`).join('、')}`,
      suggestion: '请按模板补充列或重新导出气象预报数据',
    });
    return { ok: false, data, errors, warnings };
  }

  let nullCount = 0;
  raws.forEach((row, idx) => {
    const i = idx + 2;
    const reqNull = REQUIRED_WEATHER_FIELDS.filter(f => row[f] === undefined || row[f] === null || row[f] === '');
    if (reqNull.length) {
      nullCount++;
      warnings.push({
        row: i, field: reqNull[0],
        message: `第 ${i} 行「${FIELD_HINT_MAP[reqNull[0]]}」为空`,
        suggestion: '补录该条记录或删除该行，空值超过 10% 将判定为不合格',
      });
      return;
    }
    const ws = Number(row.windSpeed);
    const wh = Number(row.waveHeight);
    const wp = Number(row.wavePeriod);
    if (ws < 0 || ws > 60) {
      warnings.push({ row: i, field: 'windSpeed', message: `第 ${i} 行风速 ${row.windSpeed} 超出合理范围（0-60 m/s）` });
    }
    if (wh < 0 || wh > 20) {
      warnings.push({ row: i, field: 'waveHeight', message: `第 ${i} 行波高 ${row.waveHeight} 超出合理范围（0-20 m）` });
    }
    if (wp < 1 || wp > 30) {
      warnings.push({ row: i, field: 'wavePeriod', message: `第 ${i} 行周期 ${row.wavePeriod} 超出合理范围（1-30 s）` });
    }
    data.push({
      timestamp: String(row.timestamp).trim(),
      windSpeed: +ws.toFixed(2),
      windDirection: row.windDirection != null ? Number(row.windDirection) : 0,
      waveHeight: +wh.toFixed(2),
      wavePeriod: +wp.toFixed(2),
      airPressure: row.airPressure != null ? Number(row.airPressure) : 1013,
      temperature: row.temperature != null ? +Number(row.temperature).toFixed(1) : undefined,
      source: sourceName,
    });
  });

  if (nullCount / raws.length > 0.1) {
    errors.push({
      message: `空值行占比 ${Math.round(nullCount / raws.length * 100)}%，超过阈值 10%`,
      suggestion: '请补录缺失行数据后重新导入',
    });
    return { ok: false, data, errors, warnings };
  }
  return { ok: true, data, errors, warnings };
}
