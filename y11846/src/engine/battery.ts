import type { Point, Waypoint, WindField, WindChange, FlightSegment } from '@/types/game';
import { getWindAtPosition, getWindFactor } from './wind';

function distance(a: Point, b: Point): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}

function headingFromTo(from: Point, to: Point): number {
  return (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
}

export function estimateSegmentCost(
  from: Point,
  to: Point,
  windField: WindField,
  headwindMultiplier: number,
  baseDrainRate: number,
): FlightSegment {
  const dist = distance(from, to);
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  const wind = getWindAtPosition(windField, midX, midY);
  const heading = headingFromTo(from, to);
  const windResult = getWindFactor(wind.direction, wind.speed, heading, headwindMultiplier);

  const basePowerCost = dist * baseDrainRate;
  const windEffect = basePowerCost * windResult.coefficient - basePowerCost;
  const actualPowerCost = basePowerCost * windResult.coefficient;

  const headwindExplanation = `基础耗电 ${basePowerCost.toFixed(1)}% × 逆风系数 ${windResult.coefficient.toFixed(1)} = 实际耗电 ${actualPowerCost.toFixed(1)}%（逆风分量 ${Math.abs(windResult.headwindComponent).toFixed(1)} m/s）`;

  return {
    fromWaypoint: '',
    toWaypoint: '',
    fromPos: from,
    toPos: to,
    distance: dist,
    basePowerCost,
    windEffect,
    actualPowerCost,
    isHeadwind: windResult.isHeadwind,
    headwindCoefficient: windResult.coefficient,
    headwindExplanation,
    windChanged: false,
    windChangeLabel: '',
  };
}

export function estimateReturnBattery(
  position: Point,
  home: Point,
  windField: WindField,
  headwindMultiplier: number,
  baseDrainRate: number,
  currentBattery: number,
): { needed: number; remaining: number; isCritical: boolean } {
  const segment = estimateSegmentCost(position, home, windField, headwindMultiplier, baseDrainRate);
  const needed = segment.actualPowerCost;
  const remaining = currentBattery - needed;
  return {
    needed,
    remaining,
    isCritical: remaining < 0,
  };
}

export function generateSegments(
  waypoints: Waypoint[],
  windField: WindField,
  headwindMultiplier: number,
  baseDrainRate: number,
  windChanges: WindChange[] = [],
  version?: number,
): FlightSegment[] {
  const segments: FlightSegment[] = [];

  for (let i = 0; i < waypoints.length - 1; i++) {
    const from = waypoints[i];
    const to = waypoints[i + 1];
    const segment = estimateSegmentCost(
      { x: from.x, y: from.y },
      { x: to.x, y: to.y },
      windField,
      headwindMultiplier,
      baseDrainRate,
    );

    segment.fromWaypoint = from.id;
    segment.toWaypoint = to.id;

    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;
    const affectedChanges = windChanges.filter((change) => {
      const { region } = change;
      return (
        midX >= region.x &&
        midX <= region.x + region.width &&
        midY >= region.y &&
        midY <= region.y + region.height
      );
    });

    if (affectedChanges.length > 0) {
      segment.windChanged = true;
      const labels = affectedChanges.map(
        (c) => `区域${c.segmentIndex}: 风速${c.previousSpeed}→${c.newSpeed} 风向${c.previousDirection}→${c.newDirection}`,
      );
      segment.windChangeLabel = labels.join('; ');
    }

    segments.push(segment);
  }

  return segments;
}
