import * as THREE from 'three';

export interface Charge {
  id: string;
  position: [number, number, number];
  magnitude: number;
  label: string;
}

export interface TestPoint {
  id: string;
  position: [number, number, number];
}

export interface FieldResult {
  vector: [number, number, number];
  magnitude: number;
}

export interface Anomaly {
  type: 'overlap' | 'explosion' | 'direction_reversal';
  severity: 'critical' | 'warning';
  message: string;
  reason: string;
  relatedChargeIds: string[];
  relatedTestPointIds: string[];
}

const K = 1;
const OVERLAP_THRESHOLD = 0.3;
const EXPLOSION_THRESHOLD = 500;
const DIRECTION_REVERSAL_ANGLE = 120;

export function calculateFieldAt(
  point: [number, number, number],
  charges: Charge[]
): FieldResult {
  let ex = 0;
  let ey = 0;
  let ez = 0;

  for (const charge of charges) {
    const dx = point[0] - charge.position[0];
    const dy = point[1] - charge.position[1];
    const dz = point[2] - charge.position[2];
    const r2 = dx * dx + dy * dy + dz * dz;
    const r = Math.sqrt(r2);

    if (r < 0.01) {
      return { vector: [0, 0, 0], magnitude: Infinity };
    }

    const eMag = K * charge.magnitude / r2;
    ex += eMag * dx / r;
    ey += eMag * dy / r;
    ez += eMag * dz / r;
  }

  const magnitude = Math.sqrt(ex * ex + ey * ey + ez * ez);
  return { vector: [ex, ey, ez], magnitude };
}

export function traceFieldLine(
  start: [number, number, number],
  charges: Charge[],
  steps: number = 200,
  stepSize: number = 0.15,
  direction: number = 1
): [number, number, number][] {
  const points: [number, number, number][] = [];
  let current: [number, number, number] = [...start] as [number, number, number];

  const absMagSum = charges.reduce((s, c) => s + Math.abs(c.magnitude), 0);
  if (absMagSum === 0) return [start];

  for (let i = 0; i < steps; i++) {
    points.push([...current]);

    const field = calculateFieldAt(current, charges);
    if (field.magnitude === Infinity || field.magnitude < 0.001) break;

    const nx = direction * field.vector[0] / field.magnitude;
    const ny = direction * field.vector[1] / field.magnitude;
    const nz = direction * field.vector[2] / field.magnitude;

    current = [
      current[0] + nx * stepSize,
      current[1] + ny * stepSize,
      current[2] + nz * stepSize,
    ];

    const dist = Math.sqrt(
      current[0] * current[0] + current[1] * current[1] + current[2] * current[2]
    );
    if (dist > 20) break;

    for (const charge of charges) {
      if (direction > 0 && charge.magnitude < 0) {
        const dr = Math.sqrt(
          (current[0] - charge.position[0]) ** 2 +
          (current[1] - charge.position[1]) ** 2 +
          (current[2] - charge.position[2]) ** 2
        );
        if (dr < 0.2) {
          points.push([...current]);
          return points;
        }
      }
      if (direction < 0 && charge.magnitude > 0) {
        const dr = Math.sqrt(
          (current[0] - charge.position[0]) ** 2 +
          (current[1] - charge.position[1]) ** 2 +
          (current[2] - charge.position[2]) ** 2
        );
        if (dr < 0.2) {
          points.push([...current]);
          return points;
        }
      }
    }
  }

  return points;
}

export function generateFieldLines(
  charges: Charge[],
  linesPerUnitCharge: number = 8
): [number, number, number][][] {
  const allLines: [number, number, number][][] = [];

  for (const charge of charges) {
    if (charge.magnitude === 0) continue;

    const numLines = Math.max(4, Math.round(Math.abs(charge.magnitude) * linesPerUnitCharge));
    const direction = charge.magnitude > 0 ? 1 : -1;

    for (let i = 0; i < numLines; i++) {
      const phi = (2 * Math.PI * i) / numLines;
      for (let thetaIdx = 0; thetaIdx < 2; thetaIdx++) {
        const theta = thetaIdx === 0 ? Math.PI / 4 : (3 * Math.PI) / 4;
        const startX = charge.position[0] + 0.25 * Math.sin(theta) * Math.cos(phi);
        const startY = charge.position[1] + 0.25 * Math.sin(theta) * Math.sin(phi);
        const startZ = charge.position[2] + 0.25 * Math.cos(theta);

        const linePoints = traceFieldLine(
          [startX, startY, startZ],
          charges,
          200,
          0.12,
          direction
        );

        if (linePoints.length > 3) {
          allLines.push(linePoints);
        }
      }
    }
  }

  return allLines;
}

export function detectAnomalies(
  charges: Charge[],
  testPoints: TestPoint[]
): Anomaly[] {
  const anomalies: Anomaly[] = [];

  for (let i = 0; i < charges.length; i++) {
    for (let j = i + 1; j < charges.length; j++) {
      const dx = charges[i].position[0] - charges[j].position[0];
      const dy = charges[i].position[1] - charges[j].position[1];
      const dz = charges[i].position[2] - charges[j].position[2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist < OVERLAP_THRESHOLD) {
        const signInfo = (charges[i].magnitude > 0 && charges[j].magnitude > 0)
          ? '同号电荷重叠，场强叠加增强'
          : (charges[i].magnitude < 0 && charges[j].magnitude < 0)
            ? '同号负电荷重叠，场强叠加增强'
            : '异号电荷重叠，趋于抵消';

        anomalies.push({
          type: 'overlap',
          severity: 'critical',
          message: `电荷 ${charges[i].label} 和 ${charges[j].label} 位置重叠`,
          reason: `距离=${dist.toFixed(3)}，小于阈值${OVERLAP_THRESHOLD}。${signInfo}。请将电荷分开放置以获得正确的电场分布。`,
          relatedChargeIds: [charges[i].id, charges[j].id],
          relatedTestPointIds: [],
        });
      }
    }
  }

  for (const tp of testPoints) {
    const field = calculateFieldAt(tp.position, charges);

    if (field.magnitude > EXPLOSION_THRESHOLD) {
      let closestCharge = '';
      let minDist = Infinity;
      for (const c of charges) {
        const dx = tp.position[0] - c.position[0];
        const dy = tp.position[1] - c.position[1];
        const dz = tp.position[2] - c.position[2];
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d < minDist) {
          minDist = d;
          closestCharge = c.label;
        }
      }

      anomalies.push({
        type: 'explosion',
        severity: 'critical',
        message: `试探点处场强爆炸：|E|=${field.magnitude.toFixed(1)}`,
        reason: `场强=${field.magnitude.toFixed(1)} 超出安全阈值${EXPLOSION_THRESHOLD}。距离电荷${closestCharge}过近(r=${minDist.toFixed(3)})，库仑定律E∝1/r²导致奇点。建议将试探点移远或降低电荷电量。`,
        relatedChargeIds: [],
        relatedTestPointIds: [tp.id],
      });
    }
  }

  if (testPoints.length >= 2) {
    for (let i = 0; i < testPoints.length; i++) {
      for (let j = i + 1; j < testPoints.length; j++) {
        const dx = testPoints[i].position[0] - testPoints[j].position[0];
        const dy = testPoints[i].position[1] - testPoints[j].position[1];
        const dz = testPoints[i].position[2] - testPoints[j].position[2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < 1.5) {
          const fi = calculateFieldAt(testPoints[i].position, charges);
          const fj = calculateFieldAt(testPoints[j].position, charges);

          if (fi.magnitude > 0.01 && fj.magnitude > 0.01) {
            const dot = fi.vector[0] * fj.vector[0] +
                        fi.vector[1] * fj.vector[1] +
                        fi.vector[2] * fj.vector[2];
            const cosAngle = dot / (fi.magnitude * fj.magnitude);
            const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle))) * 180 / Math.PI;

            if (angle > DIRECTION_REVERSAL_ANGLE) {
              const reasons: string[] = [];
              const hasNegCharge = charges.some(c => c.magnitude < 0);
              if (hasNegCharge) reasons.push('附近存在负电荷，电场线指向负电荷');
              if (fi.magnitude < 0.5 || fj.magnitude < 0.5) reasons.push('零场强点附近，数值误差导致方向不稳定');
              const overlapAnomaly = anomalies.find(a => a.type === 'overlap');
              if (overlapAnomaly) reasons.push('存在电荷位置重叠，场方向不可靠');

              if (reasons.length === 0) reasons.push('该区域场强方向急剧变化，可能存在鞍点或零场强面');

              anomalies.push({
                type: 'direction_reversal',
                severity: 'warning',
                message: `相邻试探点方向反转（夹角=${angle.toFixed(1)}°）`,
                reason: `方向反转可能原因：${reasons.map((r, idx) => `${idx + 1}. ${r}`).join('；')}`,
                relatedChargeIds: [],
                relatedTestPointIds: [testPoints[i].id, testPoints[j].id],
              });
            }
          }
        }
      }
    }
  }

  return anomalies;
}

export function buildFieldLineGeometry(
  lines: [number, number, number][][]
): THREE.BufferGeometry {
  const positions: number[] = [];
  const colors: number[] = [];
  const CYAN = [0, 0.94, 1];

  for (const line of lines) {
    for (let i = 0; i < line.length; i++) {
      positions.push(line[i][0], line[i][1], line[i][2]);
      colors.push(CYAN[0], CYAN[1], CYAN[2]);

      if (i < line.length - 1) {
        positions.push(line[i][0], line[i][1], line[i][2]);
        colors.push(CYAN[0], CYAN[1], CYAN[2]);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return geometry;
}

export function buildArrowGeometry(
  lines: [number, number, number][][],
  interval: number = 15
): { positions: number[]; directions: number[] } {
  const positions: number[] = [];
  const directions: number[] = [];

  for (const line of lines) {
    for (let i = interval; i < line.length - 1; i += interval) {
      const prev = line[i - 1];
      const curr = line[i];
      const next = line[i + 1];

      const dx = next[0] - prev[0];
      const dy = next[1] - prev[1];
      const dz = next[2] - prev[2];
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (len < 0.0001) continue;

      positions.push(curr[0], curr[1], curr[2]);
      directions.push(dx / len, dy / len, dz / len);
    }
  }

  return { positions, directions };
}
