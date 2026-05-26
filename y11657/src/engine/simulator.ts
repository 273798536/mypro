import {
  GameMaterials,
  DefrostSlot,
  Task,
  ColdZone,
  Evaporator,
  TempLayer,
  OpReport,
  OpEventType,
  TemperaturePoint,
  AlertItem,
  ScoreEvent,
  LevelResult,
} from '@/types';

const HEAT_RATE = 0.12;
const COOL_RATE = 0.18;
const TOTAL_MINUTES = 24 * 60;

export interface SimulationContext {
  zones: ColdZone[];
  evaporators: Evaporator[];
  tempLayers: TempLayer[];
  tasks: Task[];
  defrostSlots: DefrostSlot[];
}

export interface SimulationResult {
  temperatureSeries: TemperaturePoint[];
  opReports: OpReport[];
  alerts: AlertItem[];
}

export function simulate(ctx: SimulationContext): SimulationResult {
  const { zones, evaporators, tasks, defrostSlots, tempLayers } = ctx;
  const temps: Record<string, number> = {};
  zones.forEach((z) => (temps[z.id] = z.targetTemp));

  const series: TemperaturePoint[] = [];
  const reports: OpReport[] = [];
  const alerts: AlertItem[] = [];

  const evapByZone: Record<string, Evaporator[]> = {};
  evaporators.forEach((e) => {
    if (!evapByZone[e.zoneId]) evapByZone[e.zoneId] = [];
    evapByZone[e.zoneId].push(e);
  });

  const layersByZone: Record<string, TempLayer[]> = {};
  tempLayers.forEach((l) => {
    if (!layersByZone[l.zoneId]) layersByZone[l.zoneId] = [];
    layersByZone[l.zoneId].push(l);
  });

  for (let t = 0; t < TOTAL_MINUTES; t++) {
    const activeEvapIds = new Set<string>();
    defrostSlots.forEach((slot) => {
      if (t >= slot.start && t < slot.end) activeEvapIds.add(slot.evaporatorId);
    });

    zones.forEach((zone) => {
      const evapList = evapByZone[zone.id] || [];
      const defrostingCount = evapList.filter((e) => activeEvapIds.has(e.id)).length;
      let temp = temps[zone.id];
      if (defrostingCount > 0) {
        temp += HEAT_RATE * defrostingCount;
      } else {
        temp -= COOL_RATE;
        if (temp < zone.targetTemp) temp = zone.targetTemp;
      }
      temps[zone.id] = temp;

      const layers = layersByZone[zone.id] || [];
      let eventType: OpEventType = 'normal';
      if (defrostingCount > 0) eventType = 'defrost';

      layers.forEach((layer) => {
        if (temp > layer.tempCeiling) {
          eventType = 'alert';
          if (t % 5 === 0 || temp === layer.tempCeiling + HEAT_RATE) {
            alerts.push({
              time: t,
              zoneId: zone.id,
              type: 'temp',
              message: `${zone.name} / ${layer.name} 温度 ${temp.toFixed(2)}℃ 超阈 ${layer.tempCeiling}℃`,
            });
          }
        }
      });

      series.push({ time: t, zoneId: zone.id, temperature: temp, eventType });
      if (t % 10 === 0) {
        reports.push({
          id: `r-${zone.id}-${t}`,
          zoneId: zone.id,
          timestamp: t,
          temperature: temp,
          eventType,
        });
      }
    });
  }

  defrostSlots.forEach((slot) => {
    const evap = evaporators.find((e) => e.id === slot.evaporatorId);
    if (!evap) return;
    const duration = slot.end - slot.start;
    const over = duration - evap.defrostDurationMin;
    if (over > 0) {
      alerts.push({
        time: slot.end,
        type: 'overtime',
        message: `${evap.name} 除霜超时 ${over} 分钟`,
      });
    }
  });

  tasks.forEach((task) => {
    if (task.type !== 'out') return;
    const relatedSlots = defrostSlots.filter((s) => {
      const e = evaporators.find((ev) => ev.id === s.evaporatorId);
      return e && e.zoneId === task.zoneId;
    });
    relatedSlots.forEach((s) => {
      if (s.end > task.scheduledStart) {
        const delay = Math.min(s.end, task.scheduledEnd) - task.scheduledStart;
        if (delay > 0) {
          alerts.push({
            time: task.scheduledStart,
            zoneId: task.zoneId,
            type: 'delay',
            message: `出库任务 ${task.id} 被除霜延误 ${delay} 分钟`,
          });
        }
      }
    });
  });

  return { temperatureSeries: series, opReports: reports, alerts };
}

export interface ScoreConfig {
  base: number;
  overtimePerMin: number;
  tempPerMin: number;
  delayPerMin: number;
  allOnTimeBonus: number;
  noAlertBonus: number;
}

export const DEFAULT_SCORE_CONFIG: ScoreConfig = {
  base: 1000,
  overtimePerMin: -10,
  tempPerMin: -15,
  delayPerMin: -20,
  allOnTimeBonus: 50,
  noAlertBonus: 100,
};

export function scoreLevel(
  sim: SimulationResult,
  ctx: SimulationContext,
  cfg: ScoreConfig = DEFAULT_SCORE_CONFIG,
): LevelResult {
  const events: ScoreEvent[] = [];
  let score = cfg.base;
  events.push({ time: 0, type: 'base', value: cfg.base, detail: '基础分' });

  const overtimeMin = sim.alerts
    .filter((a) => a.type === 'overtime')
    .reduce((sum, a) => {
      const m = /(\d+)\s*分钟/.exec(a.message);
      return sum + (m ? Number(m[1]) : 0);
    }, 0);

  const delayMin = sim.alerts
    .filter((a) => a.type === 'delay')
    .reduce((sum, a) => {
      const m = /(\d+)\s*分钟/.exec(a.message);
      return sum + (m ? Number(m[1]) : 0);
    }, 0);

  let tempMinutes = 0;
  const zoneMaxTemp: Record<string, number> = {};
  sim.temperatureSeries.forEach((p) => {
    const layer = ctx.tempLayers.find((l) => l.zoneId === p.zoneId);
    if (layer && p.temperature > layer.tempCeiling) tempMinutes++;
    zoneMaxTemp[p.zoneId] = Math.max(zoneMaxTemp[p.zoneId] ?? -Infinity, p.temperature);
  });

  if (overtimeMin > 0) {
    const v = overtimeMin * cfg.overtimePerMin;
    score += v;
    events.push({
      time: 0,
      type: 'overtime',
      value: v,
      detail: `除霜超时共 ${overtimeMin} 分钟，每分 ${cfg.overtimePerMin}`,
    });
  }
  if (tempMinutes > 0) {
    const v = tempMinutes * cfg.tempPerMin;
    score += v;
    events.push({
      time: 0,
      type: 'temp',
      value: v,
      detail: `温度越阈 ${tempMinutes} 分钟，每分 ${cfg.tempPerMin}`,
    });
  }
  if (delayMin > 0) {
    const v = delayMin * cfg.delayPerMin;
    score += v;
    events.push({
      time: 0,
      type: 'delay',
      value: v,
      detail: `出库延误 ${delayMin} 分钟，每分 ${cfg.delayPerMin}`,
    });
  }
  if (overtimeMin === 0) {
    score += cfg.allOnTimeBonus;
    events.push({ time: 0, type: 'bonus', value: cfg.allOnTimeBonus, detail: '所有除霜按时完成奖励' });
  }
  if (sim.alerts.length === 0) {
    score += cfg.noAlertBonus;
    events.push({ time: 0, type: 'bonus', value: cfg.noAlertBonus, detail: '零告警完美运行奖励' });
  }

  const grade: LevelResult['grade'] =
    score >= 1000 ? 'S' : score >= 850 ? 'A' : score >= 700 ? 'B' : score >= 500 ? 'C' : score >= 300 ? 'D' : 'F';
  const passed = score >= 500;

  return {
    score,
    grade,
    events,
    passed,
    maxTemp: Math.max(0, ...Object.values(zoneMaxTemp)),
    totalDelayMin: delayMin,
    totalOvertimeMin: overtimeMin,
  };
}

export function defaultMaterials(): GameMaterials {
  const zones: ColdZone[] = [
    { id: 'z1', name: '冷冻区 A', targetTemp: -18, maxTemp: -10, minTemp: -25 },
    { id: 'z2', name: '冷藏区 B', targetTemp: 4, maxTemp: 8, minTemp: 0 },
  ];
  const evaporators: Evaporator[] = [
    { id: 'e1', name: '蒸发器 #1', zoneId: 'z1', powerKw: 5, defrostDurationMin: 30, defrostIntervalMin: 360 },
    { id: 'e2', name: '蒸发器 #2', zoneId: 'z1', powerKw: 5, defrostDurationMin: 30, defrostIntervalMin: 360 },
    { id: 'e3', name: '蒸发器 #3', zoneId: 'z2', powerKw: 3, defrostDurationMin: 20, defrostIntervalMin: 360 },
  ];
  const tempLayers: TempLayer[] = [
    { id: 'l1', zoneId: 'z1', name: '冷冻温层', tempCeiling: -15, maxDeviation: 3 },
    { id: 'l2', zoneId: 'z2', name: '冷藏温层', tempCeiling: 7, maxDeviation: 3 },
  ];
  const tasks: Task[] = [
    { id: 't1', type: 'out', zoneId: 'z1', scheduledStart: 8 * 60, scheduledEnd: 9 * 60, penaltyPerMin: 20 },
    { id: 't2', type: 'out', zoneId: 'z2', scheduledStart: 14 * 60, scheduledEnd: 15 * 60, penaltyPerMin: 20 },
    { id: 't3', type: 'in', zoneId: 'z1', scheduledStart: 11 * 60, scheduledEnd: 12 * 60, penaltyPerMin: 10 },
  ];
  const defrostSlots: DefrostSlot[] = [
    { id: 'd1', evaporatorId: 'e1', start: 2 * 60, end: 2 * 60 + 30, status: 'planned' },
    { id: 'd2', evaporatorId: 'e3', start: 6 * 60, end: 6 * 60 + 20, status: 'planned' },
  ];
  return { zones, evaporators, tempLayers, tasks, defrostSlots, opReports: [] };
}
