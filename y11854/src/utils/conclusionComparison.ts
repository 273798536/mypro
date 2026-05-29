import type { Charge, TestPoint, Anomaly } from './fieldCalculation';

export interface ConclusionState {
  chargePositions: Record<string, [number, number, number]>;
  fieldDirections: Record<string, [number, number, number]>;
  timestamp: number;
}

export interface ConclusionChange {
  changed: boolean;
  details: string[];
}

export function captureConclusionState(
  charges: Charge[],
  testPoints: TestPoint[],
  calculateFieldAt: (point: [number, number, number], charges: Charge[]) => { vector: [number, number, number]; magnitude: number }
): ConclusionState {
  const chargePositions: Record<string, [number, number, number]> = {};
  for (const c of charges) {
    chargePositions[c.id] = [...c.position] as [number, number, number];
  }

  const fieldDirections: Record<string, [number, number, number]> = {};
  for (const tp of testPoints) {
    const field = calculateFieldAt(tp.position, charges);
    if (field.magnitude > 0 && isFinite(field.magnitude)) {
      fieldDirections[tp.id] = [
        field.vector[0] / field.magnitude,
        field.vector[1] / field.magnitude,
        field.vector[2] / field.magnitude,
      ];
    }
  }

  return {
    chargePositions,
    fieldDirections,
    timestamp: Date.now(),
  };
}

export function compareConclusions(
  previous: ConclusionState | null,
  current: ConclusionState
): ConclusionChange {
  if (!previous) {
    return { changed: false, details: ['首次记录，无对比基准'] };
  }

  const details: string[] = [];
  let changed = false;

  for (const [chargeId, pos] of Object.entries(current.chargePositions)) {
    const prevPos = previous.chargePositions[chargeId];
    if (!prevPos) {
      details.push(`新增电荷 ${chargeId}，位置(${pos[0].toFixed(2)}, ${pos[1].toFixed(2)}, ${pos[2].toFixed(2)})`);
      changed = true;
      continue;
    }

    const dx = pos[0] - prevPos[0];
    const dy = pos[1] - prevPos[1];
    const dz = pos[2] - prevPos[2];
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (dist > 0.05) {
      details.push(`电荷 ${chargeId} 位置变更：(${prevPos.map(v => v.toFixed(2)).join(', ')}) → (${pos.map(v => v.toFixed(2)).join(', ')})，位移=${dist.toFixed(3)}`);
      changed = true;
    }
  }

  for (const chargeId of Object.keys(previous.chargePositions)) {
    if (!current.chargePositions[chargeId]) {
      details.push(`电荷 ${chargeId} 已被删除`);
      changed = true;
    }
  }

  for (const [tpId, dir] of Object.entries(current.fieldDirections)) {
    const prevDir = previous.fieldDirections[tpId];
    if (!prevDir) {
      details.push(`新增试探点 ${tpId}，场方向(${dir.map(v => v.toFixed(3)).join(', ')})`);
      changed = true;
      continue;
    }

    const dot = dir[0] * prevDir[0] + dir[1] * prevDir[1] + dir[2] * prevDir[2];
    const cosAngle = Math.max(-1, Math.min(1, dot));
    const angleDeg = Math.acos(cosAngle) * 180 / Math.PI;

    if (angleDeg > 10) {
      details.push(`试探点 ${tpId} 场方向变更：夹角=${angleDeg.toFixed(1)}°`);
      changed = true;
    }
  }

  for (const tpId of Object.keys(previous.fieldDirections)) {
    if (!current.fieldDirections[tpId]) {
      details.push(`试探点 ${tpId} 已被删除`);
      changed = true;
    }
  }

  if (!changed) {
    details.push('所有电荷位置和场方向结论均未发生变更');
  }

  return { changed, details };
}
