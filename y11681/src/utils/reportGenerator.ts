import type { TrajectoryResult } from '@/types/trajectory';
import { convertFromMs } from './unitConverter';
import { formatTrajectorySource, generateErrorMarkdown } from './errorFormatter';

export function generateReportContent(results: TrajectoryResult[], notes?: string): string {
  const now = new Date();
  const dateStr = now.toLocaleString('zh-CN');

  let md = `# 高尔夫弹道分析报告

**生成时间**: ${dateStr}
**分析数量**: ${results.length}

---

`;

  if (notes) {
    md += `## 备注\n${notes}\n\n---\n\n`;
  }

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const p = r.params;
    const speedMs = convertFromMs(p.ballSpeed, 'km/h');

    md += `## ${i + 1}. 弹道分析 #${p.id.slice(0, 8)}

**来源**: ${formatTrajectorySource(p.source)}
**时间戳**: ${new Date(p.timestamp).toLocaleString('zh-CN')}

### 击球参数

| 参数 | 值 |
|------|-----|
| 球速 | ${p.ballSpeed} ${p.ballSpeedUnit} (${speedMs.toFixed(1)} km/h) |
| 发射角 | ${p.launchAngle}° |
| 发射方向 | ${p.launchDirection}° |
| 后旋 | ${p.backspin} rpm |
| 侧旋 | ${p.sidespin} rpm |

### 环境参数

| 参数 | 值 |
|------|-----|
| 风速 | ${p.windSpeed} ${p.windSpeedUnit} |
| 风向 | ${p.windDirection}° |
| 温度 | ${p.temperature}°C |
| 湿度 | ${p.humidity}% |
| 海拔 | ${p.altitude}m |

### 计算结果

| 指标 | 值 |
|------|-----|
| 总距离 | ${r.landing.distance.toFixed(1)} 米 |
| 飞行距离 | ${r.landing.carry.toFixed(1)} 米 |
| 滚动距离 | ${r.landing.roll.toFixed(1)} 米 |
| 横向偏差 | ${r.landing.x.toFixed(1)} 米 |
| 最大高度 | ${r.apex.height.toFixed(1)} 米 |
| 飞行时间 | ${r.flightTime.toFixed(2)} 秒 |
| 落地状态 | ${r.landing.outOfBounds ? '⚠️ 超界' : '✅ 正常'} |

${r.landing.outOfBounds ? `> **警告**: ${r.landing.outOfBoundsReason}\n` : ''}

### 验证结果

${generateErrorMarkdown(r.validation)}

---

`;
  }

  return md;
}

export function generateCSVExport(results: TrajectoryResult[]): string {
  const headers = [
    'id',
    'timestamp',
    'source_type',
    'source_origin',
    'source_line',
    'ball_speed',
    'ball_speed_unit',
    'launch_angle',
    'launch_direction',
    'backspin',
    'sidespin',
    'wind_speed',
    'wind_speed_unit',
    'wind_direction',
    'temperature',
    'humidity',
    'altitude',
    'total_distance',
    'carry_distance',
    'roll_distance',
    'landing_x',
    'landing_z',
    'apex_height',
    'apex_distance',
    'flight_time',
    'out_of_bounds',
    'ob_reason',
  ];

  const rows = results.map(r => {
    const p = r.params;
    return [
      p.id,
      p.timestamp,
      p.source.type,
      p.source.origin || '',
      p.source.lineNumber || '',
      p.ballSpeed,
      p.ballSpeedUnit,
      p.launchAngle,
      p.launchDirection,
      p.backspin,
      p.sidespin,
      p.windSpeed,
      p.windSpeedUnit,
      p.windDirection,
      p.temperature,
      p.humidity,
      p.altitude,
      r.landing.distance.toFixed(2),
      r.landing.carry.toFixed(2),
      r.landing.roll.toFixed(2),
      r.landing.x.toFixed(2),
      r.landing.z.toFixed(2),
      r.apex.height.toFixed(2),
      r.apex.distance.toFixed(2),
      r.flightTime.toFixed(3),
      r.landing.outOfBounds ? 'YES' : 'NO',
      r.landing.outOfBoundsReason || '',
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

export function generateJSONExport(results: TrajectoryResult[]): string {
  return JSON.stringify(results, null, 2);
}
