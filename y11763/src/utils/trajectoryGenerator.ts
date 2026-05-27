import * as THREE from 'three';
import { Vector3Data, Particle, MagneticField } from '../types/particle';

export function vector3ToData(v: THREE.Vector3): Vector3Data {
  return { x: v.x, y: v.y, z: v.z };
}

export function dataToVector3(d: Vector3Data): THREE.Vector3 {
  return new THREE.Vector3(d.x, d.y, d.z);
}

export function generateTrajectoryWithBField(
  initialPosition: THREE.Vector3,
  initialVelocity: THREE.Vector3,
  charge: number,
  mass: number,
  magneticField: MagneticField,
  steps: number = 200,
  dt: number = 0.02
): Vector3Data[] {
  const points: Vector3Data[] = [];
  const pos = initialPosition.clone();
  const vel = initialVelocity.clone();
  const bField = dataToVector3(magneticField.direction).multiplyScalar(magneticField.strength);

  for (let i = 0; i < steps; i++) {
    points.push(vector3ToData(pos));

    const lorentzForce = new THREE.Vector3()
      .crossVectors(vel, bField)
      .multiplyScalar(charge);

    const acceleration = lorentzForce.divideScalar(mass);

    vel.add(acceleration.multiplyScalar(dt));
    pos.add(vel.clone().multiplyScalar(dt));

    if (pos.length() > 15) break;
  }

  return points;
}

export function createTubeGeometry(points: Vector3Data[], radius: number = 0.05): THREE.BufferGeometry {
  const curvePoints = points.map((p) => dataToVector3(p));
  const curve = new THREE.CatmullRomCurve3(curvePoints);
  return new THREE.TubeGeometry(curve, Math.max(points.length * 2, 20), radius, 8, false);
}

export function getParticleRadius(type: string): number {
  const radiusMap: Record<string, number> = {
    electron: 0.03,
    muon: 0.04,
    proton: 0.06,
    neutron: 0.06,
    pion: 0.05,
    kaon: 0.055,
  };
  return radiusMap[type] || 0.05;
}

export function smoothTrajectory(points: Vector3Data[], factor: number = 2): Vector3Data[] {
  if (points.length < 3) return points;

  const result: Vector3Data[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    result.push(points[i]);
    for (let j = 1; j < factor; j++) {
      const t = j / factor;
      result.push({
        x: points[i].x + (points[i + 1].x - points[i].x) * t,
        y: points[i].y + (points[i + 1].y - points[i].y) * t,
        z: points[i].z + (points[i + 1].z - points[i].z) * t,
      });
    }
  }
  result.push(points[points.length - 1]);
  return result;
}

export function generateMagneticFieldLines(
  field: MagneticField,
  bounds: number = 10,
  spacing: number = 3
): THREE.Vector3[][] {
  const lines: THREE.Vector3[][] = [];
  const dir = dataToVector3(field.direction);

  for (let x = -bounds; x <= bounds; x += spacing) {
    for (let z = -bounds; z <= bounds; z += spacing) {
      const start = new THREE.Vector3(x, -bounds, z);
      const end = start.clone().add(dir.clone().multiplyScalar(bounds * 2));
      lines.push([start, end]);
    }
  }

  return lines;
}
