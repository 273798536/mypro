import type { Charge, FieldPoint, FieldLineData } from "@/types";

const K = 8.99;
const MAX_FIELD_STRENGTH = 50;
const OVERLAP_THRESHOLD = 0.1;
const FIELD_LINE_STEPS = 120;
const FIELD_LINE_STEP_SIZE = 0.08;
const LINES_PER_UNIT_CHARGE = 8;

export function calculateFieldAtPoint(
  point: [number, number, number],
  charges: Charge[],
  prevDirection?: [number, number, number]
): FieldPoint {
  let ex = 0;
  let ey = 0;
  let ez = 0;
  let overlapDetected = false;

  for (const c of charges) {
    const dx = point[0] - c.position[0];
    const dy = point[1] - c.position[1];
    const dz = point[2] - c.position[2];
    const r2 = dx * dx + dy * dy + dz * dz;
    const r = Math.sqrt(r2);

    if (r < OVERLAP_THRESHOLD) {
      overlapDetected = true;
      continue;
    }

    const r3 = r2 * r;
    const factor = K * c.charge / r3;
    ex += factor * dx;
    ey += factor * dy;
    ez += factor * dz;
  }

  if (overlapDetected && prevDirection) {
    const dot = ex * prevDirection[0] + ey * prevDirection[1] + ez * prevDirection[2];
    if (dot < 0) {
      ex = prevDirection[0] * MAX_FIELD_STRENGTH;
      ey = prevDirection[1] * MAX_FIELD_STRENGTH;
      ez = prevDirection[2] * MAX_FIELD_STRENGTH;
    }
  }

  let magnitude = Math.sqrt(ex * ex + ey * ey + ez * ez);
  let clamped = false;
  if (magnitude > MAX_FIELD_STRENGTH) {
    const scale = MAX_FIELD_STRENGTH / magnitude;
    ex *= scale;
    ey *= scale;
    ez *= scale;
    magnitude = MAX_FIELD_STRENGTH;
    clamped = true;
  }

  return {
    position: point,
    fieldVector: [ex, ey, ez],
    magnitude,
  };
}

export function generateFieldLines(charges: Charge[]): FieldLineData[] {
  const lines: FieldLineData[] = [];
  const positiveCharges = charges.filter((c) => c.charge > 0);
  const negativeCharges = charges.filter((c) => c.charge < 0);

  const sources = positiveCharges.length > 0 ? positiveCharges : charges.filter((c) => c.charge !== 0);
  if (sources.length === 0) return lines;

  for (const source of sources) {
    const numLines = Math.round(Math.abs(source.charge) * LINES_PER_UNIT_CHARGE);
    const isPositive = source.charge > 0;

    for (let i = 0; i < numLines; i++) {
      const phi = (2 * Math.PI * i) / numLines;
      const theta = Math.PI / 4;

      const startX = source.position[0] + 0.15 * Math.sin(theta) * Math.cos(phi);
      const startY = source.position[1] + 0.15 * Math.cos(theta);
      const startZ = source.position[2] + 0.15 * Math.sin(theta) * Math.sin(phi);

      const points = traceFieldLine(
        [startX, startY, startZ],
        charges,
        isPositive ? 1 : -1
      );

      if (points.length > 3) {
        let direction: "normal" | "reversed" = "normal";
        const endPt = points[points.length - 1];
        for (const nc of negativeCharges) {
          const dx = endPt[0] - nc.position[0];
          const dy = endPt[1] - nc.position[1];
          const dz = endPt[2] - nc.position[2];
          if (Math.sqrt(dx * dx + dy * dy + dz * dz) < 0.2) {
            direction = "normal";
            break;
          }
        }

        const midIdx = Math.floor(points.length / 2);
        const midField = calculateFieldAtPoint(points[midIdx], charges);
        const fieldDir: [number, number, number] = midField.fieldVector[0] !== 0 || midField.fieldVector[1] !== 0 || midField.fieldVector[2] !== 0
          ? [midField.fieldVector[0], midField.fieldVector[1], midField.fieldVector[2]]
          : [1, 0, 0];
        const lineDir: [number, number, number] = [
          points[midIdx + 1][0] - points[midIdx][0],
          points[midIdx + 1][1] - points[midIdx][1],
          points[midIdx + 1][2] - points[midIdx][2],
        ];
        const dot = fieldDir[0] * lineDir[0] + fieldDir[1] * lineDir[1] + fieldDir[2] * lineDir[2];
        if (dot < 0) {
          direction = "reversed";
        }

        let avgMag = 0;
        for (let pi = 0; pi < points.length; pi += Math.max(1, Math.floor(points.length / 5))) {
          avgMag += calculateFieldAtPoint(points[pi], charges).magnitude;
        }
        avgMag /= Math.max(1, Math.ceil(points.length / Math.max(1, Math.floor(points.length / 5))));

        lines.push({
          id: `fl-${source.id}-${i}`,
          points,
          direction,
          magnitude: avgMag,
        });
      }
    }
  }

  return lines;
}

function traceFieldLine(
  start: [number, number, number],
  charges: Charge[],
  sign: number
): [number, number, number][] {
  const points: [number, number, number][] = [[...start]];
  let current: [number, number, number] = [...start];
  let prevDir: [number, number, number] | undefined;

  for (let step = 0; step < FIELD_LINE_STEPS; step++) {
    const field = calculateFieldAtPoint(current, charges, prevDir);
    if (field.magnitude < 0.01) break;

    const dir: [number, number, number] = [
      (sign * field.fieldVector[0]) / field.magnitude,
      (sign * field.fieldVector[1]) / field.magnitude,
      (sign * field.fieldVector[2]) / field.magnitude,
    ];
    prevDir = dir;

    current = [
      current[0] + dir[0] * FIELD_LINE_STEP_SIZE,
      current[1] + dir[1] * FIELD_LINE_STEP_SIZE,
      current[2] + dir[2] * FIELD_LINE_STEP_SIZE,
    ];

    if (Math.abs(current[0]) > 10 || Math.abs(current[1]) > 10 || Math.abs(current[2]) > 10) break;

    for (const c of charges) {
      if (c.charge * sign < 0) {
        const dx = current[0] - c.position[0];
        const dy = current[1] - c.position[1];
        const dz = current[2] - c.position[2];
        if (Math.sqrt(dx * dx + dy * dy + dz * dz) < 0.15) {
          points.push([...current]);
          return points;
        }
      }
    }

    points.push([...current]);
  }

  return points;
}

export function fieldStrengthToColor(magnitude: number, maxMag: number = MAX_FIELD_STRENGTH): [number, number, number] {
  const t = Math.min(magnitude / maxMag, 1);
  if (t < 0.5) {
    const s = t * 2;
    return [0.1 + s * 0.0, 0.4 + s * 0.55, 0.9 - s * 0.2];
  } else {
    const s = (t - 0.5) * 2;
    return [0.1 + s * 0.9, 0.95 - s * 0.65, 0.7 - s * 0.6];
  }
}

export function checkOverlap(charges: Charge[]): boolean {
  for (let i = 0; i < charges.length; i++) {
    for (let j = i + 1; j < charges.length; j++) {
      const dx = charges[i].position[0] - charges[j].position[0];
      const dy = charges[i].position[1] - charges[j].position[1];
      const dz = charges[i].position[2] - charges[j].position[2];
      if (Math.sqrt(dx * dx + dy * dy + dz * dz) < OVERLAP_THRESHOLD) {
        return true;
      }
    }
  }
  return false;
}
