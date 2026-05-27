import { ExperimentParams, ForceAnalysis, GRAVITY, EPSILON, CRITICAL_THRESHOLD } from '../types';

export const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;
export const toDegrees = (radians: number): number => (radians * 180) / Math.PI;

export const getAngleInRadians = (params: ExperimentParams): number => {
  return params.angleUnit === 'degree' ? toRadians(params.angle) : params.angle;
};

export const getAngleInDegrees = (params: ExperimentParams): number => {
  return params.angleUnit === 'degree' ? params.angle : toDegrees(params.angle);
};

export const calculateCriticalAngle = (frictionCoefficient: number): number => {
  return Math.atan(frictionCoefficient);
};

export const calculateForces = (params: ExperimentParams): ForceAnalysis => {
  const { mass, frictionCoefficient, externalForce, externalForceAngle } = params;
  
  const angleRad = getAngleInRadians(params);
  const externalForceAngleRad = toRadians(externalForceAngle);
  
  const gravity = mass * GRAVITY;
  
  const gravityParallel = gravity * Math.sin(angleRad);
  const gravityPerpendicular = gravity * Math.cos(angleRad);
  
  const externalForceParallel = externalForce * Math.cos(externalForceAngleRad);
  const externalForcePerpendicular = externalForce * Math.sin(externalForceAngleRad);
  
  const normalForce = gravityPerpendicular - externalForcePerpendicular;
  
  const maxStaticFriction = Math.abs(frictionCoefficient * normalForce);
  
  const drivingForce = gravityParallel + externalForceParallel;
  
  let frictionForce: number;
  let netForce: number;
  let acceleration: number;
  let status: 'static' | 'sliding' | 'critical';
  
  const absDrivingForce = Math.abs(drivingForce);
  
  if (absDrivingForce > maxStaticFriction + EPSILON) {
    status = 'sliding';
    frictionForce = -Math.sign(drivingForce) * maxStaticFriction;
    netForce = drivingForce + frictionForce;
    acceleration = netForce / mass;
  } else if (Math.abs(absDrivingForce - maxStaticFriction) <= CRITICAL_THRESHOLD * maxStaticFriction) {
    status = 'critical';
    frictionForce = -drivingForce;
    netForce = 0;
    acceleration = 0;
  } else {
    status = 'static';
    frictionForce = -drivingForce;
    netForce = 0;
    acceleration = 0;
  }
  
  const criticalAngle = calculateCriticalAngle(frictionCoefficient);
  
  return {
    gravity,
    normalForce,
    gravityParallel,
    gravityPerpendicular,
    frictionForce,
    maxStaticFriction,
    externalForceParallel,
    externalForcePerpendicular,
    netForce,
    acceleration,
    status,
    criticalAngle,
  };
};

export const isCloseToCriticalAngle = (
  params: ExperimentParams,
  threshold: number = 0.05
): boolean => {
  const angleRad = getAngleInRadians(params);
  const criticalAngle = calculateCriticalAngle(params.frictionCoefficient);
  return Math.abs(angleRad - criticalAngle) < threshold;
};

export const getStatusText = (status: 'static' | 'sliding' | 'critical'): string => {
  switch (status) {
    case 'static':
      return '静止';
    case 'sliding':
      return '滑动';
    case 'critical':
      return '临界';
    default:
      return '未知';
  }
};

export const getStatusColor = (status: 'static' | 'sliding' | 'critical'): string => {
  switch (status) {
    case 'static':
      return '#10b981';
    case 'sliding':
      return '#f97316';
    case 'critical':
      return '#ef4444';
    default:
      return '#6b7280';
  }
};
