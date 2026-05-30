import type { PowerRecord, WindCondition, MaintenancePlan } from '../data/types';
import { detectMaintenanceConflicts } from './schemeComparison';
import { detectCableCrossings } from './cableAnalysis';
import { calculateWakeDeficit } from './wakeModel';
import type { Scheme } from '../data/types';

function csvEscape(val: string | number): string {
  const s = String(val);
  return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportPowerCSV(records: PowerRecord[]) {
  const header = '风机ID,时间戳,发电量(MW),有效风速(m/s),风向(°)';
  const rows = records.map(
    (r) =>
      `${csvEscape(r.turbineId)},${csvEscape(new Date(r.timestamp).toISOString())},${csvEscape(r.powerOutput)},${csvEscape(r.windSpeed)},${csvEscape(r.windDirection)}`
  );
  const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, '发电记录.csv');
}

export function exportWindCSV(conditions: WindCondition[]) {
  const header = '时间戳,风速(m/s),风向(°)';
  const rows = conditions.map(
    (w) => `${csvEscape(new Date(w.timestamp).toISOString())},${csvEscape(w.speed)},${csvEscape(w.direction)}`
  );
  const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, '风况数据.csv');
}

export function exportJSON(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  downloadBlob(blob, filename);
}

export function generateSummary(
  scheme: Scheme,
  windDirection: number,
  windSpeed: number,
  records: PowerRecord[],
  plans: MaintenancePlan[]
): string {
  const wakeResults = calculateWakeDeficit(scheme.turbines, windDirection, windSpeed);
  const crossings = detectCableCrossings(scheme.cables);
  const conflicts = detectMaintenanceConflicts(plans);

  const affectedTurbines = wakeResults.filter((w) => w.deficit > 0.01);
  const overlapTurbines = wakeResults.filter((w) => w.affectedBy.length > 1);
  const avgDeficit =
    wakeResults.length > 0
      ? (wakeResults.reduce((s, w) => s + w.deficit, 0) / wakeResults.length * 100).toFixed(1)
      : '0.0';

  const totalPower = records.reduce((s, r) => s + r.powerOutput, 0).toFixed(1);

  const lines: string[] = [
    `=== 海上风电尾流沙盘 数据摘要 ===`,
    ``,
    `方案: ${scheme.name}`,
    `风机数量: ${scheme.turbines.length}`,
    `当前风向: ${windDirection}° | 风速: ${windSpeed} m/s`,
    ``,
    `--- 尾流分析 ---`,
    `受尾流影响风机: ${affectedTurbines.length}/${scheme.turbines.length}`,
    `尾流重叠风机: ${overlapTurbines.length}`,
    `平均尾流损失: ${avgDeficit}%`,
    overlapTurbines.length > 0
      ? `重叠风机: ${overlapTurbines.map((w) => w.turbineId).join(', ')}`
      : '无尾流重叠',
    ``,
    `--- 海缆分析 ---`,
    `海缆回路: ${scheme.cables.length}`,
    `穿越/交叉点: ${crossings.length}`,
    crossings.length > 0
      ? crossings.map((c) => `  穿越点: (${c.point[0]}, ${c.point[1]}) ${c.cable1Id}×${c.cable2Id}`).join('\n')
      : '  无海缆穿越',
    ``,
    `--- 发电统计 ---`,
    `总发电量: ${totalPower} MW·h`,
    ``,
    `--- 检修分析 ---`,
    `检修计划: ${plans.length} 项`,
    `窗口冲突: ${conflicts.length} 项`,
    conflicts.length > 0
      ? conflicts
          .map(
            (c) =>
              `  冲突: ${c.turbine1Id} 与 ${c.turbine2Id} (船${c.vessel1Id}) 时间重叠 ${new Date(c.overlapStart).toLocaleTimeString()}-${new Date(c.overlapEnd).toLocaleTimeString()}`
          )
          .join('\n')
      : '  无窗口冲突',
    ``,
    `=== 风向数据结论 ===`,
    `在${windDirection}°风向下，${affectedTurbines.length > 0 ? `有${affectedTurbines.length}台风机受尾流影响` : '所有风机处于自由流中'}，`,
    `平均尾流损失${avgDeficit}%，`,
    `${crossings.length > 0 ? `存在${crossings.length}处海缆穿越需关注` : '海缆路径无穿越'}，`,
    `${conflicts.length > 0 ? `有${conflicts.length}项检修窗口冲突` : '检修窗口无冲突'}。`,
  ];

  return lines.join('\n');
}
