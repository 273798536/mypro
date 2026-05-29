import type { WindField, WindSegment, WindChange } from '@/types/game';

export function getWindAtPosition(
  windField: WindField,
  x: number,
  y: number,
): { direction: number; speed: number } {
  for (const segment of windField.segments) {
    const { region } = segment;
    if (
      x >= region.x &&
      x <= region.x + region.width &&
      y >= region.y &&
      y <= region.y + region.height
    ) {
      return { direction: segment.direction, speed: segment.speed };
    }
  }
  return { direction: 0, speed: 0 };
}

export function getWindFactor(
  windDirection: number,
  windSpeed: number,
  heading: number,
  headwindMultiplier: number = 1.5,
): {
  coefficient: number;
  isHeadwind: boolean;
  headwindComponent: number;
  explanation: string;
} {
  const angleDiff = windDirection - heading;
  const cosAngle = Math.cos((angleDiff * Math.PI) / 180);
  const headwindComponent = cosAngle * windSpeed;
  const isHeadwind = cosAngle > 0;

  let coefficient: number;
  let explanation: string;

  if (isHeadwind) {
    coefficient = 1 + (headwindComponent / 5) * (headwindMultiplier - 1);
    explanation = `逆风：风向${windDirection}°与航向${heading}°夹角产生逆风分量${headwindComponent.toFixed(1)} m/s，系数${coefficient.toFixed(2)}`;
  } else {
    coefficient = Math.max(0.7, 1 - Math.abs(headwindComponent) * 0.04);
    explanation = `顺风：风向${windDirection}°与航向${heading}°夹角产生顺风分量${Math.abs(headwindComponent).toFixed(1)} m/s，系数${coefficient.toFixed(2)}`;
  }

  return { coefficient, isHeadwind, headwindComponent, explanation };
}

export function compareWindFields(
  oldField: WindField,
  newField: WindField,
): WindChange[] {
  const changes: WindChange[] = [];
  const maxLen = Math.max(oldField.segments.length, newField.segments.length);

  for (let i = 0; i < maxLen; i++) {
    const oldSeg = oldField.segments[i];
    const newSeg = newField.segments[i];

    if (!oldSeg && newSeg) {
      changes.push({
        segmentIndex: i,
        region: newSeg.region,
        previousSpeed: 0,
        previousDirection: 0,
        newSpeed: newSeg.speed,
        newDirection: newSeg.direction,
        affectedFlightSegments: [],
      });
      continue;
    }

    if (oldSeg && !newSeg) {
      changes.push({
        segmentIndex: i,
        region: oldSeg.region,
        previousSpeed: oldSeg.speed,
        previousDirection: oldSeg.direction,
        newSpeed: 0,
        newDirection: 0,
        affectedFlightSegments: [],
      });
      continue;
    }

    if (
      oldSeg &&
      newSeg &&
      (oldSeg.speed !== newSeg.speed || oldSeg.direction !== newSeg.direction)
    ) {
      changes.push({
        segmentIndex: i,
        region: newSeg.region,
        previousSpeed: oldSeg.speed,
        previousDirection: oldSeg.direction,
        newSpeed: newSeg.speed,
        newDirection: newSeg.direction,
        affectedFlightSegments: [],
      });
    }
  }

  return changes;
}
