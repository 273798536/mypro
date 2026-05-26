export type Quaternion = [number, number, number, number];

export type EulerAngles = [number, number, number];

export const normalizeQuaternion = (q: Quaternion): Quaternion => {
  const norm = Math.sqrt(q[0] ** 2 + q[1] ** 2 + q[2] ** 2 + q[3] ** 2);
  if (norm === 0) return [1, 0, 0, 0];
  return [q[0] / norm, q[1] / norm, q[2] / norm, q[3] / norm];
};

export const isNormalized = (q: Quaternion, tolerance: number = 0.01): boolean => {
  const norm = Math.sqrt(q[0] ** 2 + q[1] ** 2 + q[2] ** 2 + q[3] ** 2);
  return Math.abs(norm - 1) <= tolerance;
};

export const quaternionToEuler = (q: Quaternion): EulerAngles => {
  const [w, x, y, z] = q;

  const sinr_cosp = 2 * (w * x + y * z);
  const cosr_cosp = 1 - 2 * (x * x + y * y);
  const roll = Math.atan2(sinr_cosp, cosr_cosp);

  const sinp = 2 * (w * y - z * x);
  let pitch: number;
  if (Math.abs(sinp) >= 1) {
    pitch = Math.sign(sinp) * (Math.PI / 2);
  } else {
    pitch = Math.asin(sinp);
  }

  const siny_cosp = 2 * (w * z + x * y);
  const cosy_cosp = 1 - 2 * (y * y + z * z);
  const yaw = Math.atan2(siny_cosp, cosy_cosp);

  return [roll, pitch, yaw];
};

export const radToDeg = (rad: number): number => (rad * 180) / Math.PI;

export const degToRad = (deg: number): number => (deg * Math.PI) / 180;

export const eulerToDegrees = (euler: EulerAngles): [number, number, number] => {
  return [radToDeg(euler[0]), radToDeg(euler[1]), radToDeg(euler[2])];
};

export const multiplyQuaternions = (q1: Quaternion, q2: Quaternion): Quaternion => {
  const [w1, x1, y1, z1] = q1;
  const [w2, x2, y2, z2] = q2;

  return [
    w1 * w2 - x1 * x2 - y1 * y2 - z1 * z2,
    w1 * x2 + x1 * w2 + y1 * z2 - z1 * y2,
    w1 * y2 - x1 * z2 + y1 * w2 + z1 * x2,
    w1 * z2 + x1 * y2 - y1 * x2 + z1 * w2,
  ];
};

export const conjugateQuaternion = (q: Quaternion): Quaternion => {
  return [q[0], -q[1], -q[2], -q[3]];
};

export const inverseQuaternion = (q: Quaternion): Quaternion => {
  const normSq = q[0] ** 2 + q[1] ** 2 + q[2] ** 2 + q[3] ** 2;
  const conj = conjugateQuaternion(q);
  return [conj[0] / normSq, conj[1] / normSq, conj[2] / normSq, conj[3] / normSq];
};

export const slerp = (q1: Quaternion, q2: Quaternion, t: number): Quaternion => {
  let [w1, x1, y1, z1] = q1;
  let [w2, x2, y2, z2] = q2;

  let dot = w1 * w2 + x1 * x2 + y1 * y2 + z1 * z2;

  if (dot < 0) {
    w2 = -w2;
    x2 = -x2;
    y2 = -y2;
    z2 = -z2;
    dot = -dot;
  }

  if (dot > 0.9995) {
    const result: Quaternion = [
      w1 + t * (w2 - w1),
      x1 + t * (x2 - x1),
      y1 + t * (y2 - y1),
      z1 + t * (z2 - z1),
    ];
    return normalizeQuaternion(result);
  }

  const theta0 = Math.acos(dot);
  const theta = theta0 * t;
  const sinTheta = Math.sin(theta);
  const sinTheta0 = Math.sin(theta0);

  const s1 = Math.cos(theta) - dot * sinTheta / sinTheta0;
  const s2 = sinTheta / sinTheta0;

  return [
    s1 * w1 + s2 * w2,
    s1 * x1 + s2 * x2,
    s1 * y1 + s2 * y2,
    s1 * z1 + s2 * z2,
  ];
};

export const createIdentityQuaternion = (): Quaternion => [1, 0, 0, 0];

export const angularVelocityToQuaternionDerivative = (
  q: Quaternion,
  omega: [number, number, number]
): Quaternion => {
  const [w, x, y, z] = q;
  const [wx, wy, wz] = omega;

  return [
    0.5 * (-x * wx - y * wy - z * wz),
    0.5 * (w * wx + y * wz - z * wy),
    0.5 * (w * wy - x * wz + z * wx),
    0.5 * (w * wz + x * wy - y * wx),
  ];
};

export const integrateAngularVelocity = (
  q: Quaternion,
  omega: [number, number, number],
  dt: number
): Quaternion => {
  const derivative = angularVelocityToQuaternionDerivative(q, omega);
  const result: Quaternion = [
    q[0] + derivative[0] * dt,
    q[1] + derivative[1] * dt,
    q[2] + derivative[2] * dt,
    q[3] + derivative[3] * dt,
  ];
  return normalizeQuaternion(result);
};
