import { Pendulum, CouplingParams, CorrectionEntry, CorrectionType } from '../types';

const MAX_ANGLE = Math.PI / 2;
const MAX_ANGULAR_ACCEL = 100;
const PHASE_DIFF_THRESHOLD = 0.1;

export function computeAngularAcceleration(
  index: number,
  angles: number[],
  velocities: number[],
  pendulums: Pendulum[],
  params: CouplingParams
): number {
  const pendulum = pendulums[index];
  const { couplingCoeff, damping, gravity } = params;
  const n = pendulums.length;

  const gravityTerm = -(gravity / pendulum.length) * angles[index];
  const dampingTerm = -damping * velocities[index];

  let couplingTerm = 0;
  if (index > 0) {
    couplingTerm -= (couplingCoeff / pendulum.mass) * (angles[index] - angles[index - 1]);
  }
  if (index < n - 1) {
    couplingTerm -= (couplingCoeff / pendulum.mass) * (angles[index] - angles[index + 1]);
  }

  return gravityTerm + dampingTerm + couplingTerm;
}

export function rk4Step(
  pendulums: Pendulum[],
  params: CouplingParams
): { newAngles: number[]; newVelocities: number[] } {
  const n = pendulums.length;
  const h = params.timeStep;

  const angles = pendulums.map(p => p.angle);
  const velocities = pendulums.map(p => p.angularVelocity);

  const k1v = angles.map((_, i) =>
    computeAngularAcceleration(i, angles, velocities, pendulums, params)
  );
  const k1x = velocities.slice();

  const angles2 = angles.map((a, i) => a + (h / 2) * k1x[i]);
  const velocities2 = velocities.map((v, i) => v + (h / 2) * k1v[i]);
  const k2v = angles2.map((_, i) =>
    computeAngularAcceleration(i, angles2, velocities2, pendulums, params)
  );
  const k2x = velocities2.slice();

  const angles3 = angles.map((a, i) => a + (h / 2) * k2x[i]);
  const velocities3 = velocities.map((v, i) => v + (h / 2) * k2v[i]);
  const k3v = angles3.map((_, i) =>
    computeAngularAcceleration(i, angles3, velocities3, pendulums, params)
  );
  const k3x = velocities3.slice();

  const angles4 = angles.map((a, i) => a + h * k3x[i]);
  const velocities4 = velocities.map((v, i) => v + h * k3v[i]);
  const k4v = angles4.map((_, i) =>
    computeAngularAcceleration(i, angles4, velocities4, pendulums, params)
  );
  const k4x = velocities4.slice();

  const newAngles = angles.map(
    (a, i) => a + (h / 6) * (k1x[i] + 2 * k2x[i] + 2 * k3x[i] + k4x[i])
  );
  const newVelocities = velocities.map(
    (v, i) => v + (h / 6) * (k1v[i] + 2 * k2v[i] + 2 * k3v[i] + k4v[i])
  );

  return { newAngles, newVelocities };
};

export function checkStability(
  newAngles: number[],
  oldAngles: number[],
  newVelocities: number[],
  pendulums: Pendulum[],
  params: CouplingParams,
  currentTime: number
): CorrectionEntry[] {
  const corrections: CorrectionEntry[] = [];

  newAngles.forEach((angle, i) => {
    if (Math.abs(angle) > MAX_ANGLE) {
      const clampedAngle = Math.sign(angle) * MAX_ANGLE * 0.95;
      corrections.push({
        time: currentTime,
        type: 'angle_overflow' as CorrectionType,
        description: `摆${i + 1}角度越界: ${angle.toFixed(3)} rad，已修正为 ${clampedAngle.toFixed(3)} rad`,
        autoFixed: true,
        beforeValue: angle,
        afterValue: clampedAngle,
        pendulumId: i,
      });
      newAngles[i] = clampedAngle;
      newVelocities[i] = -newVelocities[i] * 0.5;
    }

    const accel = computeAngularAcceleration(i, newAngles, newVelocities, pendulums, params);
    if (Math.abs(accel) > MAX_ANGULAR_ACCEL) {
      const dampedVel = newVelocities[i] * 0.3;
      corrections.push({
        time: currentTime,
        type: 'numerical_explosion' as CorrectionType,
        description: `摆${i + 1}数值爆炸: 加速度=${accel.toFixed(2)} rad/s²，已衰减速度`,
        autoFixed: true,
        beforeValue: newVelocities[i],
        afterValue: dampedVel,
        pendulumId: i,
      });
      newVelocities[i] = dampedVel;
    }
  });

  if (newAngles.length >= 2) {
    const phaseDiff = Math.abs(newAngles[0] - newAngles[newAngles.length - 1]);
    if (phaseDiff > PHASE_DIFF_THRESHOLD && phaseDiff < Math.PI) {
      const avgPhase = newAngles.reduce((a, b) => a + b, 0) / newAngles.length;
      const mismatchPendulums: number[] = [];
      newAngles.forEach((angle, i) => {
        if (Math.abs(angle - avgPhase) > PHASE_DIFF_THRESHOLD * 3) {
          mismatchPendulums.push(i + 1);
        }
      });
      if (mismatchPendulums.length > 0) {
        corrections.push({
          time: currentTime,
          type: 'phase_mismatch' as CorrectionType,
          description: `摆[${mismatchPendulums.join(', ')}]相位偏差过大，请人工确认`,
          autoFixed: false,
          pendulumId: mismatchPendulums[0] - 1,
        });
      }
    }
  }

  return corrections;
}

export function computePhase(angle: number, velocity: number): number {
  return Math.atan2(velocity, angle);
}

export function computePhaseDiff(phases: number[]): number[] {
  if (phases.length < 2) return [0];

  const diffs: number[] = [];
  for (let i = 1; i < phases.length; i++) {
    let diff = phases[i] - phases[i - 1];
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    diffs.push(diff);
  }
  return diffs;
}

export function computeTotalEnergy(pendulums: Pendulum[], gravity: number): number {
  return pendulums.reduce((total, p) => {
    const kineticEnergy = 0.5 * p.mass * (p.length * p.angularVelocity) ** 2;
    const potentialEnergy = p.mass * gravity * p.length * (1 - Math.cos(p.angle));
    return total + kineticEnergy + potentialEnergy;
  }, 0);
}

export function validateParams(params: CouplingParams): string | null {
  if (params.timeStep <= 0 || params.timeStep > 0.1) {
    return '时间步长应在 (0, 0.1] 秒范围内';
  }
  if (params.couplingCoeff < 0 || params.couplingCoeff > 100) {
    return '耦合系数应在 [0, 100] 范围内';
  }
  if (params.damping < 0 || params.damping > 10) {
    return '阻尼系数应在 [0, 10] 范围内';
  }
  if (params.gravity < 0 || params.gravity > 20) {
    return '重力加速度应在 [0, 20] m/s² 范围内';
  }
  return null;
}

export function validatePendulum(p: Omit<Pendulum, 'phase' | 'angularVelocity'>): string | null {
  if (p.length <= 0 || p.length > 5) {
    return `摆${p.id + 1}长度应在 (0, 5] 米范围内`;
  }
  if (p.mass <= 0 || p.mass > 10) {
    return `摆${p.id + 1}质量应在 (0, 10] 千克范围内`;
  }
  if (Math.abs(p.initialAngle) > Math.PI / 2) {
    return `摆${p.id + 1}初始角度应在 [-π/2, π/2] 范围内`;
  }
  return null;
}
