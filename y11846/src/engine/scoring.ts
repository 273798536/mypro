import type {
  Level,
  Waypoint,
  WindField,
  WindChange,
  FlightSegment,
  FlightEvent,
  ScoreBreakdown,
  ScoreItem,
  FlightReport,
} from '@/types/game';

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}

function optimalPathLength(waypoints: Waypoint[]): number {
  let total = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    total += distance(waypoints[i], waypoints[i + 1]);
  }
  return total;
}

function actualPathLength(segments: FlightSegment[]): number {
  return segments.reduce((sum, s) => sum + s.distance, 0);
}

function calcPathEfficiency(segments: FlightSegment[], waypoints: Waypoint[]): ScoreItem {
  const optimal = optimalPathLength(waypoints);
  const actual = actualPathLength(segments);
  if (optimal === 0) {
    return { score: 20, max: 20, explanation: '无航段数据，默认满分' };
  }
  const ratio = optimal / actual;
  const score = Math.round(Math.min(20, 20 * ratio) * 10) / 10;
  return {
    score,
    max: 20,
    explanation: `最优路径${optimal.toFixed(1)} / 实际路径${actual.toFixed(1)} = 效率比${(ratio * 100).toFixed(1)}%`,
  };
}

function calcBatteryManagement(batteryRemaining: number, events: FlightEvent[]): ScoreItem {
  let penalty = 0;
  const lowBatteryEvents = events.filter((e) => e.type === 'low_battery');
  const criticalEvents = events.filter((e) => e.type === 'return_battery_critical');
  penalty += lowBatteryEvents.length * 3;
  penalty += criticalEvents.length * 5;
  const score = Math.max(0, 20 - penalty);
  return {
    score,
    max: 20,
    explanation: `剩余电量${batteryRemaining.toFixed(1)}%，低电量警告${lowBatteryEvents.length}次，电量告急${criticalEvents.length}次`,
  };
}

function calcNoFlyZoneCompliance(events: FlightEvent[]): ScoreItem {
  const violations = events.filter((e) => e.type === 'no_fly_zone_enter');
  const score = Math.max(0, 20 - violations.length * 5);
  return {
    score,
    max: 20,
    explanation: violations.length === 0
      ? '全程未进入禁飞区'
      : `禁飞区违规${violations.length}次，扣${violations.length * 5}分`,
  };
}

function calcReturnBatteryMargin(batteryRemaining: number, minReturnBattery: number): ScoreItem {
  const margin = batteryRemaining - minReturnBattery;
  if (margin < 0) {
    return {
      score: 0,
      max: 20,
      explanation: `返航电量不足：剩余${batteryRemaining.toFixed(1)}% < 最低要求${minReturnBattery}%`,
    };
  }
  const ratio = margin / (100 - minReturnBattery);
  const score = Math.round(Math.min(20, 20 * ratio) * 10) / 10;
  return {
    score,
    max: 20,
    explanation: `返航余量${margin.toFixed(1)}%（剩余${batteryRemaining.toFixed(1)}% - 最低${minReturnBattery}%）`,
  };
}

function calcHeadwindHandling(segments: FlightSegment[]): ScoreItem {
  const headwindSegments = segments.filter((s) => s.isHeadwind);
  if (headwindSegments.length === 0) {
    return { score: 20, max: 20, explanation: '无逆风航段，满分' };
  }

  const totalActual = headwindSegments.reduce((s, seg) => s + seg.actualPowerCost, 0);
  const totalBase = headwindSegments.reduce((s, seg) => s + seg.basePowerCost, 0);

  if (totalBase === 0) {
    return { score: 20, max: 20, explanation: '无逆风耗电数据' };
  }

  const efficiency = totalBase / totalActual;
  const score = Math.round(Math.min(20, 20 * efficiency) * 10) / 10;
  return {
    score,
    max: 20,
    explanation: `逆风航段${headwindSegments.length}段，基础耗电${totalBase.toFixed(1)}% / 实际耗电${totalActual.toFixed(1)}% = 效率${(efficiency * 100).toFixed(1)}%`,
  };
}

export function calculateScore(
  segments: FlightSegment[],
  events: FlightEvent[],
  level: Level,
  batteryRemaining: number,
  flightSuccess: boolean,
): ScoreBreakdown {
  const pathEfficiency = calcPathEfficiency(segments, level.waypoints);
  const batteryManagement = calcBatteryManagement(batteryRemaining, events);
  const noFlyZoneCompliance = calcNoFlyZoneCompliance(events);
  const returnBatteryMargin = calcReturnBatteryMargin(batteryRemaining, level.minReturnBattery);
  const headwindHandling = calcHeadwindHandling(segments);

  const totalScore = flightSuccess
    ? pathEfficiency.score +
      batteryManagement.score +
      noFlyZoneCompliance.score +
      returnBatteryMargin.score +
      headwindHandling.score
    : 0;

  return {
    pathEfficiency,
    batteryManagement,
    noFlyZoneCompliance,
    returnBatteryMargin,
    headwindHandling,
    totalScore,
    maxTotalScore: 100,
  };
}

export function generateReportText(report: FlightReport): string {
  const lines: string[] = [];
  lines.push(`飞行报告 - ${report.levelName}`);
  lines.push(`时间: ${report.timestamp}`);
  lines.push(`结果: ${report.flightSuccess ? '成功' : '失败'}`);
  lines.push(`剩余电量: ${report.batteryRemaining.toFixed(1)}%`);
  lines.push('');
  lines.push('=== 评分详情 ===');
  lines.push(`路径效率: ${report.score.pathEfficiency.score}/${report.score.pathEfficiency.max} - ${report.score.pathEfficiency.explanation}`);
  lines.push(`电量管理: ${report.score.batteryManagement.score}/${report.score.batteryManagement.max} - ${report.score.batteryManagement.explanation}`);
  lines.push(`禁飞区合规: ${report.score.noFlyZoneCompliance.score}/${report.score.noFlyZoneCompliance.max} - ${report.score.noFlyZoneCompliance.explanation}`);
  lines.push(`返航余量: ${report.score.returnBatteryMargin.score}/${report.score.returnBatteryMargin.max} - ${report.score.returnBatteryMargin.explanation}`);
  lines.push(`逆风应对: ${report.score.headwindHandling.score}/${report.score.headwindHandling.max} - ${report.score.headwindHandling.explanation}`);
  lines.push('');
  lines.push(`总分: ${report.score.totalScore}/${report.score.maxTotalScore}`);

  if (report.windChanges.length > 0) {
    lines.push('');
    lines.push('=== 风场变化 ===');
    for (const change of report.windChanges) {
      lines.push(`区域${change.segmentIndex}: 风速${change.previousSpeed}→${change.newSpeed} 风向${change.previousDirection}→${change.newDirection}`);
    }
  }

  if (report.events.length > 0) {
    lines.push('');
    lines.push('=== 飞行事件 ===');
    for (const event of report.events) {
      lines.push(`[${event.type}] ${event.message}`);
    }
  }

  return lines.join('\n');
}

export function generateFlightReport(
  level: Level,
  waypoints: Waypoint[],
  segments: FlightSegment[],
  events: FlightEvent[],
  score: ScoreBreakdown,
  batteryRemaining: number,
  flightSuccess: boolean,
  windFieldVersion: number,
  windChanges: WindChange[],
): FlightReport {
  const report: FlightReport = {
    levelId: level.id,
    levelName: level.name,
    timestamp: new Date().toISOString(),
    windFieldVersion,
    waypoints: level.waypoints,
    plannedWaypoints: waypoints,
    segments,
    events,
    score,
    batteryRemaining,
    flightSuccess,
    windChanges,
    summaryText: '',
  };

  report.summaryText = generateReportText(report);
  return report;
}
