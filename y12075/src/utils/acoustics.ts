import type { Musician, InstrumentSPL, Seat, SeatPressure, SeatPressureContribution, OcclusionResult } from '../types';

const REFERENCE_DISTANCE = 1;

function distance3D(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number }
): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function computeOcclusionFactor(
  musician: Musician,
  seat: Seat,
  allMusicians: Musician[]
): number {
  if (!musician.position) return 1;

  const dx = seat.position.x - musician.position.x;
  const dz = seat.position.z - musician.position.z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  if (dist < 0.01) return 0;

  const dirX = dx / dist;
  const dirZ = dz / dist;

  let maxBlockage = 0;

  for (const other of allMusicians) {
    if (other.id === musician.id) continue;
    if (other.sectionId === musician.sectionId) continue;
    if (!other.position) continue;

    const toOtherX = other.position.x - musician.position.x;
    const toOtherZ = other.position.z - musician.position.z;
    const otherDist = Math.sqrt(toOtherX * toOtherX + toOtherZ * toOtherZ);

    if (otherDist >= dist) continue;

    const projLen = toOtherX * dirX + toOtherZ * dirZ;
    if (projLen <= 0) continue;

    const perpDist = Math.abs(toOtherX * dirZ - toOtherZ * dirX);
    const occlusionRadius = 0.5;

    if (perpDist < occlusionRadius) {
      const blockage = (1 - perpDist / occlusionRadius) * 0.6;
      maxBlockage = Math.max(maxBlockage, blockage);
    }
  }

  return maxBlockage;
}

export function computeSeatPressures(
  musicians: Musician[],
  spls: InstrumentSPL[],
  seats: Seat[]
): SeatPressure[] {
  const splMap = new Map<string, InstrumentSPL>();
  for (const s of spls) {
    splMap.set(s.musicianId, s);
  }

  const sectionAvgSPL = new Map<string, number>();
  const sectionCount = new Map<string, number>();
  for (const s of spls) {
    if (s.spl !== null) {
      const m = musicians.find((mu) => mu.id === s.musicianId);
      if (m) {
        sectionAvgSPL.set(m.sectionId, (sectionAvgSPL.get(m.sectionId) || 0) + s.spl);
        sectionCount.set(m.sectionId, (sectionCount.get(m.sectionId) || 0) + 1);
      }
    }
  }
  for (const [sec, total] of sectionAvgSPL) {
    const cnt = sectionCount.get(sec) || 1;
    sectionAvgSPL.set(sec, total / cnt);
  }

  return seats.map((seat) => {
    const contributions: SeatPressureContribution[] = [];
    const energySumParts: number[] = [];

    for (const m of musicians) {
      if (!m.position) continue;

      const splData = splMap.get(m.id);
      let sourceSPL = splData?.spl ?? null;
      if (sourceSPL === null) {
        sourceSPL = sectionAvgSPL.get(m.sectionId) ?? 85;
      }

      const dist = distance3D(m.position, seat.position);
      const occlusionFactor = computeOcclusionFactor(m, seat, musicians);
      const occlusionLoss = occlusionFactor * 10;

      const splAtSeat = sourceSPL - 20 * Math.log10(Math.max(dist, REFERENCE_DISTANCE) / REFERENCE_DISTANCE) - occlusionLoss;

      contributions.push({
        musicianId: m.id,
        spl: Math.round(splAtSeat * 10) / 10,
        distance: Math.round(dist * 100) / 100,
        occlusionFactor: Math.round(occlusionFactor * 1000) / 1000,
      });

      energySumParts.push(Math.pow(10, splAtSeat / 10));
    }

    const totalSPL = 10 * Math.log10(energySumParts.reduce((a, b) => a + b, 1e-10));

    return {
      seatId: seat.id,
      totalSPL: Math.round(totalSPL * 10) / 10,
      contributions,
    };
  });
}

export function computeOcclusionResults(
  musicians: Musician[],
  seats: Seat[],
  seatPressures: SeatPressure[]
): OcclusionResult[] {
  const results: OcclusionResult[] = [];
  const sectionIds = [...new Set(musicians.map((m) => m.sectionId))];

  for (const sourceId of sectionIds) {
    for (const blockedId of sectionIds) {
      if (sourceId === blockedId) continue;

      const sourceMusicians = musicians.filter((m) => m.sectionId === sourceId);
      const blockedMusicians = musicians.filter((m) => m.sectionId === blockedId);

      const blockedSeatIds: string[] = [];
      let totalOcclusionLoss = 0;
      let occludedCount = 0;

      for (const sp of seatPressures) {
        const seat = seats.find((s) => s.id === sp.seatId);
        if (!seat) continue;

        let hasSource = false;
        let sourceOcclusion = 0;

        for (const c of sp.contributions) {
          const cm = musicians.find((m) => m.id === c.musicianId);
          if (cm?.sectionId === sourceId && c.occlusionFactor > 0.1) {
            hasSource = true;
            sourceOcclusion = Math.max(sourceOcclusion, c.occlusionFactor);
          }
        }

        if (hasSource && sourceOcclusion > 0.3) {
          blockedSeatIds.push(sp.seatId);
          totalOcclusionLoss += sourceOcclusion * 10;
          occludedCount++;
        }
      }

      if (blockedSeatIds.length > 0) {
        results.push({
          sourceSectionId: sourceId,
          blockedSectionId: blockedId,
          blockedSeatIds,
          blockedRatio: Math.round((blockedSeatIds.length / seats.length) * 1000) / 1000,
          avgOcclusionLoss: Math.round((totalOcclusionLoss / occludedCount) * 10) / 10,
        });
      }
    }
  }

  return results;
}

export function splToColor(spl: number, minSPL: number, maxSPL: number): string {
  const t = maxSPL === minSPL ? 0.5 : (spl - minSPL) / (maxSPL - minSPL);
  const clamped = Math.max(0, Math.min(1, t));

  if (clamped < 0.25) {
    const s = clamped / 0.25;
    return `rgb(${Math.round(30 + 30 * s)}, ${Math.round(80 + 175 * s)}, ${Math.round(220 - 80 * s)})`;
  } else if (clamped < 0.5) {
    const s = (clamped - 0.25) / 0.25;
    return `rgb(${Math.round(60 + 140 * s)}, ${Math.round(255 - 30 * s)}, ${Math.round(140 - 100 * s)})`;
  } else if (clamped < 0.75) {
    const s = (clamped - 0.5) / 0.25;
    return `rgb(${Math.round(200 + 55 * s)}, ${Math.round(225 - 100 * s)}, ${Math.round(40 - 30 * s)})`;
  } else {
    const s = (clamped - 0.75) / 0.25;
    return `rgb(255, ${Math.round(125 - 95 * s)}, ${Math.round(10 + 20 * s)})`;
  }
}

export function getSPLRange(seatPressures: SeatPressure[]): { min: number; max: number } {
  if (seatPressures.length === 0) return { min: 40, max: 90 };
  let min = Infinity;
  let max = -Infinity;
  for (const sp of seatPressures) {
    min = Math.min(min, sp.totalSPL);
    max = Math.max(max, sp.totalSPL);
  }
  return { min: Math.round(min), max: Math.round(max) };
}
