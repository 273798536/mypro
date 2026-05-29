import type { Building, NoiseSource, NoiseContribution, FloorNoise, ConflictItem, TimeRange } from "@/types";

function getDistance3D(
  p1: [number, number, number],
  p2: [number, number, number]
): number {
  const dx = p1[0] - p2[0];
  const dy = p1[1] - p2[1];
  const dz = p1[2] - p2[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function sourceAttenuation(distance: number, baseLevel: number, sourceType: string): number {
  if (distance < 1) distance = 1;
  const refDist = 7.5;
  if (sourceType === "road") {
    return baseLevel - 10 * Math.log10(distance / refDist);
  }
  if (sourceType === "commercial") {
    return baseLevel - 15 * Math.log10(distance / refDist);
  }
  return baseLevel - 20 * Math.log10(distance / refDist);
}

function checkOcclusion(
  sourcePos: [number, number, number],
  receiverPos: [number, number, number],
  buildings: Building[]
): { occluded: boolean; blockingBuilding?: Building } {
  for (const b of buildings) {
    const bx = b.position[0];
    const bz = b.position[2];
    const hw = b.width / 2 + 2;
    const hd = b.depth / 2 + 2;

    const dx = receiverPos[0] - sourcePos[0];
    const dz = receiverPos[2] - sourcePos[2];
    const len = Math.sqrt(dx * dx + dz * dz);
    if (len < 0.01) continue;

    const t = ((bx - sourcePos[0]) * dx + (bz - sourcePos[2]) * dz) / (len * len);
    if (t < 0.1 || t > 0.9) continue;

    const cx = sourcePos[0] + t * dx;
    const cz = sourcePos[2] + t * dz;

    if (Math.abs(cx - bx) < hw && Math.abs(cz - bz) < hd) {
      return { occluded: true, blockingBuilding: b };
    }
  }
  return { occluded: false };
}

function getLevelAtHour(source: NoiseSource, hour: number): number | null {
  for (const tr of source.timeRanges) {
    if (hour >= tr.startHour && hour < tr.endHour) {
      return tr.level;
    }
  }
  return null;
}

export function computeFloorNoise(
  building: Building,
  sources: NoiseSource[],
  buildings: Building[],
  hour: number,
  enabledTypes: Set<string>
): FloorNoise[] {
  const results: FloorNoise[] = [];

  for (let floor = 1; floor <= building.floors; floor++) {
    const receiverPos: [number, number, number] = [
      building.position[0],
      floor * building.floorHeight,
      building.position[2],
    ];

    const contributions: NoiseContribution[] = [];
    const linearSumParts: number[] = [];

    for (const source of sources) {
      if (!enabledTypes.has(source.type)) continue;

      const levelAtHour = getLevelAtHour(source, hour);
      if (levelAtHour === null) continue;

      const distance = getDistance3D(source.position, receiverPos);
      let attenuated = sourceAttenuation(distance, levelAtHour, source.type);

      const { occluded, blockingBuilding } = checkOcclusion(
        source.position,
        receiverPos,
        buildings.filter((b) => b.id !== building.id)
      );

      let occlusionNote = "";
      if (occluded && blockingBuilding) {
        const reduction = 5 + (Math.abs(source.position[0] - receiverPos[0]) % 5);
        attenuated -= reduction;
        occlusionNote = `前方${blockingBuilding.name}遮挡，减少约${Math.round(reduction)} dB`;
      }

      attenuated = Math.max(attenuated, 0);
      const linearPart = Math.pow(10, attenuated / 10);
      linearSumParts.push(linearPart);

      contributions.push({
        sourceId: source.id,
        sourceType: source.type,
        sourceName: source.name,
        level: Math.round(attenuated * 10) / 10,
        percentage: 0,
        distance: Math.round(distance * 10) / 10,
        attenuationNote: `距声源${Math.round(distance)}m，${source.type === "road" ? "线声源" : source.type === "commercial" ? "面声源" : "点声源"}衰减${Math.round(levelAtHour - attenuated)} dB`,
      });
    }

    const totalLinear = linearSumParts.reduce((a, b) => a + b, 0);
    const totalLevel = totalLinear > 0 ? 10 * Math.log10(totalLinear) : 0;

    for (const c of contributions) {
      const cLinear = Math.pow(10, c.level / 10);
      c.percentage = totalLinear > 0 ? Math.round((cLinear / totalLinear) * 1000) / 10 : 0;
    }

    contributions.sort((a, b) => b.level - a.level);

    const { occluded, blockingBuilding } = (() => {
      for (const source of sources) {
        if (!enabledTypes.has(source.type)) continue;
        const levelAtHour = getLevelAtHour(source, hour);
        if (levelAtHour === null) continue;
        const occ = checkOcclusion(
          source.position,
          receiverPos,
          buildings.filter((b) => b.id !== building.id)
        );
        if (occ.occluded) return occ;
      }
      return { occluded: false, blockingBuilding: undefined };
    })();

    results.push({
      buildingId: building.id,
      floor,
      totalLevel: Math.round(totalLevel * 10) / 10,
      contributions,
      occlusionNote:
        occluded && blockingBuilding
          ? `前方${blockingBuilding.name}遮挡部分声源传播`
          : undefined,
    });
  }

  return results;
}

export function getAvailableHours(sources: NoiseSource[], enabledTypes: Set<string>): number[] {
  const hours = new Set<number>();
  for (const source of sources) {
    if (!enabledTypes.has(source.type)) continue;
    for (const tr of source.timeRanges) {
      for (let h = tr.startHour; h < tr.endHour; h++) {
        hours.add(h);
      }
    }
  }
  return Array.from(hours).sort((a, b) => a - b);
}

export function getTimeCoverage(
  sources: NoiseSource[],
  enabledTypes: Set<string>
): { hour: number; hasData: boolean; sourceTypes: string[] }[] {
  const coverage: { hour: number; hasData: boolean; sourceTypes: string[] }[] = [];
  for (let h = 0; h < 24; h++) {
    const types: string[] = [];
    for (const source of sources) {
      if (!enabledTypes.has(source.type)) continue;
      for (const tr of source.timeRanges) {
        if (h >= tr.startHour && h < tr.endHour) {
          types.push(source.type);
          break;
        }
      }
    }
    coverage.push({ hour: h, hasData: types.length > 0, sourceTypes: [...new Set(types)] });
  }
  return coverage;
}

export function detectConflicts(sources: NoiseSource[]): ConflictItem[] {
  const conflicts: ConflictItem[] = [];

  const roadSources = sources.filter((s) => s.type === "road");
  const constructionSources = sources.filter((s) => s.type === "construction");

  for (const cs of constructionSources) {
    for (const rs of roadSources) {
      for (const ctr of cs.timeRanges) {
        for (const rtr of rs.timeRanges) {
          const overlap = ctr.startHour < rtr.endHour && ctr.endHour > rtr.startHour;
          if (overlap) {
            const gapStart = Math.max(ctr.startHour, rtr.startHour);
            const gapEnd = Math.min(ctr.endHour, rtr.endHour);
            if (gapEnd - gapStart >= 2) {
              conflicts.push({
                type: "time_mismatch",
                sources: [cs.name, rs.name],
                timeRange: { startHour: gapStart, endHour: gapEnd, level: 0 },
                suggestion: `${cs.name}与${rs.name}在${gapStart}:00-${gapEnd}:00同时活跃，叠加后可能超标，建议关注该时段叠加噪声`,
              });
            }
          }
        }
      }
    }
  }

  const seen = new Map<string, NoiseSource>();
  for (const s of sources) {
    const key = `${s.type}:${s.position[0]}:${s.position[2]}:${s.baseLevel}`;
    if (seen.has(key)) {
      conflicts.push({
        type: "source_duplicate",
        sources: [s.name, seen.get(key)!.name],
        suggestion: `${s.name}与${seen.get(key)!.name}位置和声压级相同，可能是重复导入，建议合并`,
      });
    } else {
      seen.set(key, s);
    }
  }

  return conflicts;
}

export function computeAllFloorNoise(
  buildings: Building[],
  sources: NoiseSource[],
  hour: number,
  enabledTypes: Set<string>
): Map<string, FloorNoise[]> {
  const map = new Map<string, FloorNoise[]>();
  for (const building of buildings) {
    map.set(building.id, computeFloorNoise(building, sources, buildings, hour, enabledTypes));
  }
  return map;
}
