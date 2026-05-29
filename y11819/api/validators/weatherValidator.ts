import type { ValidationIssue } from '@shared/types.js';
import type { WeatherRow } from '../db/types.js';

export function validateWeather(records: WeatherRow[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (let i = 0; i < records.length; i++) {
    const rec = records[i];

    if (!rec.weather_start) {
      issues.push({
        row: i + 1,
        field: 'weather_start',
        severity: 'error',
        message: '天气豁免开始时间缺失',
        suggestion: '豁免时段必须包含起止时间，请补充 weather_start',
      });
    }

    if (!rec.weather_end) {
      issues.push({
        row: i + 1,
        field: 'weather_end',
        severity: 'error',
        message: '天气豁免结束时间缺失',
        suggestion: '豁免时段必须包含起止时间，请补充 weather_end',
      });
    }

    if (rec.weather_start && rec.weather_end) {
      const start = new Date(rec.weather_start);
      const end = new Date(rec.weather_end);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end <= start) {
        issues.push({
          row: i + 1,
          field: 'weather_end',
          severity: 'error',
          message: '天气豁免结束时间早于开始时间',
          suggestion: '请检查时间是否颠倒',
        });
      }

      const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      if (diffHours > 72) {
        issues.push({
          row: i + 1,
          field: 'weather_end',
          severity: 'warning',
          message: `天气豁免时长 ${diffHours.toFixed(1)} 小时，超过 72 小时`,
          suggestion: '超长天气豁免可能跨时段，试算时将标注跨时段卡点位置，请结算员复核确认',
        });
      }
    }

    if (!rec.weather_type) {
      issues.push({
        row: i + 1,
        field: 'weather_type',
        severity: 'warning',
        message: '天气类型缺失',
        suggestion: '请补充天气类型（如台风、暴雨、大雾等），有助于复核时确认豁免合理性',
      });
    }

    if (!rec.berth_id && !rec.vessel_name) {
      issues.push({
        row: i + 1,
        field: 'berth_id',
        severity: 'warning',
        message: '天气豁免未关联到靠泊记录',
        suggestion: '请补充 berth_id 或 vessel_name + port，否则无法将豁免匹配到对应船舶',
      });
    }
  }

  return issues;
}
