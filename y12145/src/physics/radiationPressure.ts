import { SOLAR_CONSTANT, SPEED_OF_LIGHT, REFLECTIVITY } from './constants';
import type { CalculationResult, SolarSailParams, Vector3 } from '@/types';

export function calculateRadiationPressure(
  sailArea: number,
  attitudeAngle: number
): number {
  const angleRad = (attitudeAngle * Math.PI) / 180;
  const cosAngle = Math.cos(angleRad);
  const incidentPressure = SOLAR_CONSTANT / SPEED_OF_LIGHT;
  const effectivePressure = incidentPressure * sailArea * cosAngle * cosAngle * (1 + REFLECTIVITY);
  return effectivePressure;
}

export function calculateForce(
  radiationPressure: number,
  attitudeAngle: number
): Vector3 {
  const angleRad = (attitudeAngle * Math.PI) / 180;
  return {
    x: radiationPressure * Math.cos(angleRad),
    y: radiationPressure * Math.sin(angleRad),
    z: 0
  };
}

export function calculateAcceleration(
  force: Vector3,
  mass: number
): Vector3 {
  if (mass <= 0) {
    return { x: 0, y: 0, z: 0 };
  }
  return {
    x: force.x / mass,
    y: force.y / mass,
    z: force.z / mass
  };
}

export function performFullCalculation(
  params: SolarSailParams,
  currentPosition: Vector3,
  currentVelocity: Vector3
): CalculationResult {
  const radiationPressure = calculateRadiationPressure(params.sailArea, params.attitudeAngle);
  const forceVector = calculateForce(radiationPressure, params.attitudeAngle);
  const accelerationVector = calculateAcceleration(forceVector, params.spacecraftMass);
  
  const newVelocity = {
    x: currentVelocity.x + accelerationVector.x * params.timeStep,
    y: currentVelocity.y + accelerationVector.y * params.timeStep,
    z: currentVelocity.z + accelerationVector.z * params.timeStep
  };
  
  const newPosition = {
    x: currentPosition.x + newVelocity.x * params.timeStep,
    y: currentPosition.y + newVelocity.y * params.timeStep,
    z: currentPosition.z + newVelocity.z * params.timeStep
  };
  
  const accelerationMagnitude = Math.sqrt(
    accelerationVector.x ** 2 + accelerationVector.y ** 2 + accelerationVector.z ** 2
  );
  
  return {
    radiationPressure,
    force: Math.sqrt(forceVector.x ** 2 + forceVector.y ** 2 + forceVector.z ** 2),
    acceleration: accelerationMagnitude,
    velocity: newVelocity,
    position: newPosition
  };
}
