import * as THREE from 'three';
import type { CoilConfig, MagneticFieldSample, Vector3 as Vector3Type } from '../types';
import { useAppStore } from '../store/useAppStore';

const MU0 = 4 * Math.PI * 1e-7;

const toThreeVector = (v: Vector3Type): THREE.Vector3 =>
  new THREE.Vector3(v.x, v.y, v.z);

const fromThreeVector = (v: THREE.Vector3): Vector3Type => ({
  x: v.x,
  y: v.y,
  z: v.z,
});

const validateCoilConfig = (coil: CoilConfig, sourceLine: number): boolean => {
  const sourceRef = `magneticField.ts:calculateFieldFromCoil:${sourceLine}`;

  if (coil.current === 0) {
    return true;
  }

  if (!coil.enabled) {
    return true;
  }

  if (coil.radius <= 0) {
    useAppStore.getState().addError({
      type: 'invalid_parameter',
      severity: 'error',
      message: `线圈 ${coil.name} 的半径无效 (${coil.radius})，必须大于 0`,
      sourceLocation: {
        file: 'src/utils/magneticField.ts',
        line: sourceLine,
        column: 3,
        functionName: 'calculateFieldFromCoil',
      },
      suggestion: '请检查线圈半径参数，设置为正值',
      rawData: { coilId: coil.id, radius: coil.radius },
    });
    return false;
  }

  if (Math.abs(coil.current) > 1000) {
    useAppStore.getState().addError({
      type: 'invalid_parameter',
      severity: 'warning',
      message: `线圈 ${coil.name} 的电流值异常 (${coil.current}A)`,
      sourceLocation: {
        file: 'src/utils/magneticField.ts',
        line: sourceLine + 10,
        column: 3,
        functionName: 'calculateFieldFromCoil',
      },
      suggestion: '建议电流值在合理范围内（0-100A）',
      rawData: { coilId: coil.id, current: coil.current },
    });
  }

  return true;
};

export const calculateFieldFromCoil = (
  coil: CoilConfig,
  point: THREE.Vector3
): THREE.Vector3 => {
  if (!validateCoilConfig(coil, 45)) {
    return new THREE.Vector3(0, 0, 0);
  }

  const coilPos = toThreeVector(coil.position);
  const relPos = point.clone().sub(coilPos);

  if (relPos.length() < 0.01) {
    return new THREE.Vector3(0, 0, 0);
  }

  const direction = coil.direction === 'clockwise' ? -1 : 1;
  const current = coil.current * direction;
  const turns = coil.turns;
  const radius = coil.radius;

  const r = relPos.length();
  const theta = Math.acos(relPos.y / r);
  const phi = Math.atan2(relPos.z, relPos.x);

  const k = Math.sqrt(
    (4 * radius * r * Math.sin(theta)) /
      (radius * radius + r * r + 2 * radius * r * Math.sin(theta))
  );

  const B0 = (MU0 * current * turns) / (2 * Math.PI);
  const denominator = Math.sqrt(
    radius * radius + r * r + 2 * radius * r * Math.sin(theta)
  );

  const K = ellipticK(k);
  const E = ellipticE(k);

  const alpha = radius * radius + r * r;
  const beta = 2 * radius * r * Math.sin(theta);

  const Br =
    (B0 * relPos.y / (r * r * Math.sqrt(alpha - beta))) *
    ((alpha / (alpha - beta)) * E - K);

  const Btheta =
    (B0 / (r * Math.sqrt(alpha - beta))) *
    ((alpha - 2 * r * r * Math.sin(theta) * Math.sin(theta)) / (alpha - beta)) * E -
    K;

  const Bx =
    Br * Math.sin(theta) * Math.cos(phi) + Btheta * Math.cos(theta) * Math.cos(phi);
  const By = Br * Math.cos(theta) - Btheta * Math.sin(theta);
  const Bz =
    Br * Math.sin(theta) * Math.sin(phi) + Btheta * Math.cos(theta) * Math.sin(phi);

  return new THREE.Vector3(Bx * 1e6, By * 1e6, Bz * 1e6);
};

const ellipticK = (k: number): number => {
  if (k >= 1) return Infinity;
  if (k === 0) return Math.PI / 2;

  const m = k * k;
  let sum = Math.PI / 2;
  let term = 1;
  let numerator = 1;
  let denominator = 2;

  for (let n = 1; n < 20; n++) {
    numerator *= 2 * n - 1;
    denominator *= 2 * n;
    term = (numerator / denominator) * (numerator / denominator);
    sum += term * Math.pow(m, n);
  }

  return sum;
};

const ellipticE = (k: number): number => {
  if (k >= 1) return 1;
  if (k === 0) return Math.PI / 2;

  const m = k * k;
  let sum = Math.PI / 2;
  let term = 1;
  let numerator = 1;
  let denominator = 2;

  for (let n = 1; n < 20; n++) {
    numerator *= 2 * n - 1;
    denominator *= 2 * n;
    term = (numerator / denominator) * (numerator / denominator) / (2 * n - 1);
    sum -= term * Math.pow(m, n);
  }

  return sum;
};

export const calculateTotalField = (
  coils: CoilConfig[],
  point: THREE.Vector3
): THREE.Vector3 => {
  const totalField = new THREE.Vector3(0, 0, 0);

  for (const coil of coils) {
    if (coil.enabled && Math.abs(coil.current) > 0) {
      const field = calculateFieldFromCoil(coil, point);
      totalField.add(field);
    }
  }

  return totalField;
};

export const generateFieldSamples = (
  coils: CoilConfig[],
  bounds: { min: THREE.Vector3; max: THREE.Vector3 },
  density: number
): MagneticFieldSample[] => {
  const samples: MagneticFieldSample[] = [];
  const stepX = (bounds.max.x - bounds.min.x) / density;
  const stepY = (bounds.max.y - bounds.min.y) / density;
  const stepZ = (bounds.max.z - bounds.min.z) / density;

  let sampleIndex = 0;
  const sourceRefBase = 'magneticField.ts:generateFieldSamples';

  for (let x = bounds.min.x; x <= bounds.max.x; x += stepX) {
    for (let y = bounds.min.y; y <= bounds.max.y; y += stepY) {
      for (let z = bounds.min.z; z <= bounds.max.z; z += stepZ) {
        const point = new THREE.Vector3(x, y, z);
        const field = calculateTotalField(coils, point);
        const strength = field.length();

        if (strength > 0.01) {
          samples.push({
            position: fromThreeVector(point),
            fieldStrength: strength,
            fieldDirection: fromThreeVector(field.normalize()),
            sourceRef: `${sourceRefBase}:${150 + sampleIndex}`,
          });
        }
        sampleIndex++;
      }
    }
  }

  return samples;
};

export const generateSectionSamples = (
  coils: CoilConfig[],
  planeNormal: THREE.Vector3,
  planePoint: THREE.Vector3,
  size: number,
  resolution: number
): MagneticFieldSample[] => {
  const samples: MagneticFieldSample[] = [];
  const normal = planeNormal.clone().normalize();

  const up = new THREE.Vector3(0, 1, 0);
  if (Math.abs(normal.dot(up)) > 0.9) {
    up.set(1, 0, 0);
  }

  const u = new THREE.Vector3().crossVectors(normal, up).normalize();
  const v = new THREE.Vector3().crossVectors(normal, u).normalize();

  const halfSize = size / 2;
  const step = size / resolution;

  let sampleIndex = 0;
  const sourceRefBase = 'magneticField.ts:generateSectionSamples';

  for (let i = 0; i <= resolution; i++) {
    for (let j = 0; j <= resolution; j++) {
      const uCoord = -halfSize + i * step;
      const vCoord = -halfSize + j * step;

      const point = planePoint
        .clone()
        .add(u.clone().multiplyScalar(uCoord))
        .add(v.clone().multiplyScalar(vCoord));

      const field = calculateTotalField(coils, point);
      const strength = field.length();

      samples.push({
        position: fromThreeVector(point),
        fieldStrength: strength,
        fieldDirection: fromThreeVector(field.length() > 0 ? field.normalize() : new THREE.Vector3(0, 0, 1)),
        sourceRef: `${sourceRefBase}:${200 + sampleIndex}`,
      });
      sampleIndex++;
    }
  }

  return samples;
};

export const getFieldColor = (
  strength: number,
  min: number,
  max: number,
  colormap: string = 'viridis'
): THREE.Color => {
  if (max <= min) {
    useAppStore.getState().addError({
      type: 'color_scale_mismatch',
      severity: 'warning',
      message: `颜色比例范围无效: min=${min}, max=${max}`,
      sourceLocation: {
        file: 'src/utils/magneticField.ts',
        line: 230,
        column: 3,
        functionName: 'getFieldColor',
      },
      suggestion: '确保颜色范围的最大值大于最小值',
      rawData: { min, max },
    });
    return new THREE.Color(0x808080);
  }

  const normalized = Math.max(0, Math.min(1, (strength - min) / (max - min)));

  switch (colormap) {
    case 'viridis':
      return viridisColormap(normalized);
    case 'plasma':
      return plasmaColormap(normalized);
    case 'jet':
      return jetColormap(normalized);
    case 'rainbow':
      return rainbowColormap(normalized);
    default:
      return viridisColormap(normalized);
  }
};

const viridisColormap = (t: number): THREE.Color => {
  const colors = [
    [0.267, 0.004, 0.329],
    [0.282, 0.140, 0.458],
    [0.253, 0.265, 0.529],
    [0.206, 0.371, 0.553],
    [0.163, 0.471, 0.558],
    [0.127, 0.566, 0.550],
    [0.134, 0.658, 0.517],
    [0.266, 0.752, 0.440],
    [0.477, 0.821, 0.318],
    [0.741, 0.873, 0.150],
    [0.993, 0.906, 0.144],
  ];

  const idx = Math.min(colors.length - 2, Math.floor(t * (colors.length - 1)));
  const frac = t * (colors.length - 1) - idx;

  const c0 = colors[idx];
  const c1 = colors[idx + 1];

  return new THREE.Color(
    c0[0] + frac * (c1[0] - c0[0]),
    c0[1] + frac * (c1[1] - c0[1]),
    c0[2] + frac * (c1[2] - c0[2])
  );
};

const plasmaColormap = (t: number): THREE.Color => {
  const colors = [
    [0.050, 0.029, 0.527],
    [0.188, 0.028, 0.653],
    [0.345, 0.019, 0.693],
    [0.491, 0.005, 0.680],
    [0.624, 0.019, 0.620],
    [0.741, 0.080, 0.528],
    [0.835, 0.184, 0.418],
    [0.906, 0.309, 0.308],
    [0.959, 0.451, 0.208],
    [0.993, 0.603, 0.115],
    [0.999, 0.761, 0.046],
  ];

  const idx = Math.min(colors.length - 2, Math.floor(t * (colors.length - 1)));
  const frac = t * (colors.length - 1) - idx;

  const c0 = colors[idx];
  const c1 = colors[idx + 1];

  return new THREE.Color(
    c0[0] + frac * (c1[0] - c0[0]),
    c0[1] + frac * (c1[1] - c0[1]),
    c0[2] + frac * (c1[2] - c0[2])
  );
};

const jetColormap = (t: number): THREE.Color => {
  const fourValue = 4 * t;
  const red = Math.min(fourValue - 1.5, -fourValue + 4.5);
  const green = Math.min(fourValue - 0.5, -fourValue + 3.5);
  const blue = Math.min(fourValue + 0.5, -fourValue + 2.5);

  return new THREE.Color(
    Math.max(0, Math.min(1, red)),
    Math.max(0, Math.min(1, green)),
    Math.max(0, Math.min(1, blue))
  );
};

const rainbowColormap = (t: number): THREE.Color => {
  const hue = (1 - t) * 0.7;
  return new THREE.Color().setHSL(hue, 1, 0.5);
};

export const checkCurrentDirectionConsistency = (coils: CoilConfig[]): void => {
  const enabledCoils = coils.filter((c) => c.enabled && Math.abs(c.current) > 0);
  if (enabledCoils.length < 2) return;

  const clockwiseCount = enabledCoils.filter(
    (c) => c.direction === 'clockwise'
  ).length;
  const counterCount = enabledCoils.filter(
    (c) => c.direction === 'counterclockwise'
  ).length;

  if (clockwiseCount === 0 || counterCount === 0) {
    useAppStore.getState().addError({
      type: 'current_direction',
      severity: 'warning',
      message: '所有启用线圈的电流方向一致，可能产生异常磁场分布',
      sourceLocation: {
        file: 'src/utils/magneticField.ts',
        line: 350,
        column: 3,
        functionName: 'checkCurrentDirectionConsistency',
      },
      suggestion: '建议部分线圈使用顺时针，部分使用逆时针方向',
      rawData: {
        clockwiseCount,
        counterCount,
        coils: enabledCoils.map((c) => c.name),
      },
    });
  }
};
