import type { ScheduleItem, Conflict, Artist, Stage, WeatherCard, GameScore, HeatSnapshot } from '../types';
import { stages } from '../data/stages';
import { artists } from '../data/artists';
import { minutesToTimeString } from '../utils/timeUtils';

export function detectConflicts(
  scheduleItems: ScheduleItem[],
  artistsData: Artist[],
  stagesData: Stage[],
  activatedWeather: WeatherCard[]
): Conflict[] {
  const conflicts: Conflict[] = [];
  const stageMap = new Map(stagesData.map((s) => [s.id, s]));
  const artistMap = new Map(artistsData.map((a) => [a.id, a]));

  detectChangeoverConflicts(scheduleItems, artistMap, stageMap, activatedWeather, conflicts);
  detectEquipmentConflicts(scheduleItems, artistMap, stageMap, activatedWeather, conflicts);
  detectCrowdConflicts(scheduleItems, artistMap, stagesData, conflicts);

  return conflicts;
}

function getChangeoverTime(stageId: string, stageMap: Map<string, Stage>, activatedWeather: WeatherCard[]): number {
  const stage = stageMap.get(stageId);
  if (!stage) return 20;
  let base = stage.changeoverTime;
  for (const w of activatedWeather) {
    for (const e of w.effects) {
      if (e.type === 'changeover_modifier') {
        if (e.target) {
          const stage2 = stageMap.get(stageId);
          if (stage2?.equipment.includes(e.target)) {
            base += e.value;
          }
        } else {
          base += e.value;
        }
      }
    }
  }
  return Math.max(5, base);
}

function detectChangeoverConflicts(
  items: ScheduleItem[],
  artistMap: Map<string, Artist>,
  stageMap: Map<string, Stage>,
  activatedWeather: WeatherCard[],
  conflicts: Conflict[]
) {
  const byStage = new Map<string, ScheduleItem[]>();
  for (const item of items) {
    const arr = byStage.get(item.stageId) || [];
    arr.push(item);
    byStage.set(item.stageId, arr);
  }

  for (const [stageId, stageItems] of byStage) {
    const sorted = [...stageItems].sort((a, b) => a.startTime - b.startTime);
    const changeover = getChangeoverTime(stageId, stageMap, activatedWeather);
    const stage = stageMap.get(stageId);

    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];
      const gap = next.startTime - current.endTime;
      if (gap < changeover) {
        const currentArtist = artistMap.get(current.artistId);
        const nextArtist = artistMap.get(next.artistId);
        const overtime = changeover - gap;
        conflicts.push({
          id: `changeover-${current.id}-${next.id}`,
          type: 'changeover',
          severity: overtime > 10 ? 'error' : 'warning',
          scheduleItemIds: [current.id, next.id],
          description: `换场超时：${currentArtist?.name}（${stage?.name} ${minutesToTimeString(current.startTime)}-${minutesToTimeString(current.endTime)}）→ ${nextArtist?.name}（${stage?.name} ${minutesToTimeString(next.startTime)}-${minutesToTimeString(next.endTime)}）：换场需${changeover}分钟，实际仅${gap}分钟间隔，超时${overtime}分钟`,
          sourceRef: `艺人时段：${currentArtist?.name} 结束于 ${minutesToTimeString(current.endTime)}，${nextArtist?.name} 开始于 ${minutesToTimeString(next.startTime)}；舞台设备：${stage?.name} 标准换场时间${changeover}分钟`,
        });
      }
    }
  }
}

function detectEquipmentConflicts(
  items: ScheduleItem[],
  artistMap: Map<string, Artist>,
  stageMap: Map<string, Stage>,
  activatedWeather: WeatherCard[],
  conflicts: Conflict[]
) {
  const disabledEquipment = new Set<string>();
  for (const w of activatedWeather) {
    for (const e of w.effects) {
      if (e.type === 'equipment_disable' && e.target) {
        disabledEquipment.add(e.target);
      }
    }
  }

  for (const item of items) {
    const artist = artistMap.get(item.artistId);
    if (!artist) continue;
    for (const eq of artist.equipment) {
      if (disabledEquipment.has(eq)) {
        const stage = stageMap.get(item.stageId);
        conflicts.push({
          id: `equip-disable-${item.id}-${eq}`,
          type: 'equipment',
          severity: 'error',
          scheduleItemIds: [item.id],
          description: `设备禁用：${artist.name}（${stage?.name} ${minutesToTimeString(item.startTime)}-${minutesToTimeString(item.endTime)}）需要"${eq}"，但该设备因天气原因已被禁用`,
          sourceRef: `艺人时段：${artist.name} 设备需求含"${eq}"；天气卡已禁用该设备`,
        });
      }
    }
  }

  const equipmentUsage = new Map<string, ScheduleItem[]>();
  for (const item of items) {
    const artist = artistMap.get(item.artistId);
    if (!artist) continue;
    for (const eq of artist.equipment) {
      const arr = equipmentUsage.get(eq) || [];
      arr.push(item);
      equipmentUsage.set(eq, arr);
    }
  }

  for (const [eqName, eqItems] of equipmentUsage) {
    if (eqItems.length < 2) continue;
    const shared = ['重型音响', 'LED屏'];
    if (!shared.includes(eqName)) continue;

    const sorted = [...eqItems].sort((a, b) => a.startTime - b.startTime);
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i];
      const b = sorted[i + 1];
      if (a.startTime < b.endTime && b.startTime < a.endTime) {
        const artistA = artistMap.get(a.artistId);
        const artistB = artistMap.get(b.artistId);
        const stageA = stageMap.get(a.stageId);
        const stageB = stageMap.get(b.stageId);
        const overlapStart = Math.max(a.startTime, b.startTime);
        const overlapEnd = Math.min(a.endTime, b.endTime);
        const overlapMinutes = overlapEnd - overlapStart;
        conflicts.push({
          id: `equip-overlap-${a.id}-${b.id}-${eqName}`,
          type: 'equipment',
          severity: overlapMinutes > 15 ? 'error' : 'warning',
          scheduleItemIds: [a.id, b.id],
          description: `设备冲突："${eqName}"：${artistA?.name}（${stageA?.name} ${minutesToTimeString(a.startTime)}-${minutesToTimeString(a.endTime)}）与${artistB?.name}（${stageB?.name} ${minutesToTimeString(b.startTime)}-${minutesToTimeString(b.endTime)}）共用，时段重叠${overlapMinutes}分钟`,
          sourceRef: `艺人时段：${artistA?.name}（${stageA?.name} ${minutesToTimeString(a.startTime)}-${minutesToTimeString(a.endTime)}）与${artistB?.name}（${stageB?.name} ${minutesToTimeString(b.startTime)}-${minutesToTimeString(b.endTime)}）；设备："${eqName}"同时被两场演出需要`,
        });
      }
    }
  }
}

function detectCrowdConflicts(
  items: ScheduleItem[],
  artistMap: Map<string, Artist>,
  stagesData: Stage[],
  conflicts: Conflict[]
) {
  const sorted = [...items].sort((a, b) => a.startTime - b.startTime);

  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i];
      const b = sorted[j];
      if (a.stageId === b.stageId) continue;
      if (b.startTime > a.endTime + 30) break;

      const overlapStart = Math.max(a.startTime, b.startTime);
      const overlapEnd = Math.min(a.endTime, b.endTime);
      if (overlapEnd <= overlapStart) continue;

      const artistA = artistMap.get(a.artistId);
      const artistB = artistMap.get(b.artistId);
      if (!artistA || !artistB) continue;

      const totalHeat = artistA.heat + artistB.heat;
      if (totalHeat < 7) continue;

      const isOneEnding = overlapStart >= a.startTime && overlapEnd <= a.endTime;
      const isOneStarting = overlapStart >= b.startTime && overlapEnd <= b.endTime;

      let crowdLevel: string;
      let crowdDesc: string;
      if (totalHeat >= 9) {
        crowdLevel = '高';
      } else if (totalHeat >= 7) {
        crowdLevel = '中';
      } else {
        continue;
      }

      const stageA = stagesData.find((s) => s.id === a.stageId);
      const stageB = stagesData.find((s) => s.id === b.stageId);

      let flowDesc = '';
      if (isOneEnding && isOneStarting) {
        flowDesc = `${artistA.name}散场观众与${artistB.name}入场观众流交汇`;
      } else if (isOneEnding) {
        flowDesc = `${artistA.name}散场观众流与${artistB.name}进行中的观众重叠`;
      } else {
        flowDesc = `${artistA.name}与${artistB.name}观众流在同时段重叠`;
      }

      conflicts.push({
        id: `crowd-${a.id}-${b.id}`,
        type: 'crowd',
        severity: crowdLevel === '高' ? 'error' : 'warning',
        scheduleItemIds: [a.id, b.id],
        description: `人流拥堵（等级：${crowdLevel}）：${minutesToTimeString(overlapStart)}-${minutesToTimeString(overlapEnd)}，${flowDesc}，源自${artistA.name}时段（${stageA?.name} ${minutesToTimeString(a.startTime)}-${minutesToTimeString(a.endTime)}）与${artistB.name}时段（${stageB?.name} ${minutesToTimeString(b.startTime)}-${minutesToTimeString(b.endTime)}）的时段重叠`,
        sourceRef: `艺人时段：${artistA.name}（${stageA?.name} ${minutesToTimeString(a.startTime)}-${minutesToTimeString(a.endTime)}，热度${'★'.repeat(artistA.heat)}）与${artistB.name}（${stageB?.name} ${minutesToTimeString(b.startTime)}-${minutesToTimeString(b.endTime)}，热度${'★'.repeat(artistB.heat)}）`,
      });
    }
  }
}

export function calculateHeatSnapshots(
  scheduleItems: ScheduleItem[],
  artistsData: Artist[],
  activatedWeather: WeatherCard[]
): HeatSnapshot[] {
  const snapshots: HeatSnapshot[] = [];
  const artistMap = new Map(artistsData.map((a) => [a.id, a]));

  let weatherMod = 0;
  for (const w of activatedWeather) {
    for (const e of w.effects) {
      if (e.type === 'heat_modifier') {
        weatherMod += e.value;
      }
    }
  }

  for (const item of scheduleItems) {
    const artist = artistMap.get(item.artistId);
    if (!artist) continue;

    let heat = artist.heat * 20;
    const startHour = Math.floor(item.startTime / 60);
    if (startHour >= 18 && startHour < 21) {
      heat = heat * 1.3;
    }
    heat = heat * (1 + weatherMod / 100);
    heat = Math.max(0, Math.min(100, heat));

    snapshots.push({
      timeSlot: item.startTime,
      heatValue: Math.round(heat),
      artists: [artist.name],
      stageId: item.stageId,
    });
  }

  return snapshots.sort((a, b) => a.timeSlot - b.timeSlot);
}

export function calculateScore(
  scheduleItems: ScheduleItem[],
  conflicts: Conflict[],
  artistsData: Artist[],
  heatSnapshots: HeatSnapshot[],
  activatedWeather: WeatherCard[]
): GameScore {
  const totalArtists = artistsData.length;
  const arrangedArtists = new Set(scheduleItems.map((s) => s.artistId)).size;
  const schedulingScore = Math.round((arrangedArtists / totalArtists) * 100);

  const changeoverConflicts = conflicts.filter((c) => c.type === 'changeover');
  const changeoverScore = Math.max(0, 100 - changeoverConflicts.length * 25);

  const equipmentConflicts = conflicts.filter((c) => c.type === 'equipment');
  const equipmentScore = Math.max(0, 100 - equipmentConflicts.length * 20);

  const crowdConflicts = conflicts.filter((c) => c.type === 'crowd');
  const crowdScore = Math.max(0, 100 - crowdConflicts.length * 15);

  const avgHeat = heatSnapshots.length > 0
    ? heatSnapshots.reduce((sum, h) => sum + h.heatValue, 0) / heatSnapshots.length
    : 0;
  const heatScore = Math.round(avgHeat);

  const weatherScore = activatedWeather.length > 0 ? 60 : 80;

  const total = Math.round(
    schedulingScore * 0.25 +
    changeoverScore * 0.2 +
    equipmentScore * 0.2 +
    crowdScore * 0.15 +
    heatScore * 0.1 +
    weatherScore * 0.1
  );

  return {
    total,
    scheduling: schedulingScore,
    changeover: changeoverScore,
    equipment: equipmentScore,
    crowd: crowdScore,
    heat: heatScore,
    weather: weatherScore,
  };
}
