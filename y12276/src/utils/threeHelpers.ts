import * as THREE from 'three';
import type { Route } from '@/types';

export function createCableGeometry(pathPoints: [number, number, number][], segments: number = 50): THREE.BufferGeometry {
  const points = pathPoints.map((p) => new THREE.Vector3(...p));
  const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
  const tubeGeometry = new THREE.TubeGeometry(curve, segments, 0.03, 8, false);
  return tubeGeometry;
}

export function createRoutePathGeometry(waypoints: [number, number, number][]): THREE.BufferGeometry {
  const points = waypoints.map((p) => new THREE.Vector3(...p));
  const curve = new THREE.CatmullRomCurve3(points, true, 'catmullrom', 0.5);
  const tubeGeometry = new THREE.TubeGeometry(curve, 100, 0.02, 6, true);
  return tubeGeometry;
}

export function getPositionOnRoute(route: Route, time: number): THREE.Vector3 | null {
  if (time < route.timestamps[0] || time > route.timestamps[route.timestamps.length - 1]) {
    return null;
  }

  for (let i = 0; i < route.timestamps.length - 1; i++) {
    if (time >= route.timestamps[i] && time <= route.timestamps[i + 1]) {
      const t =
        (time - route.timestamps[i]) /
        (route.timestamps[i + 1] - route.timestamps[i]);
      const p1 = new THREE.Vector3(...route.waypoints[i]);
      const p2 = new THREE.Vector3(...route.waypoints[i + 1]);
      return new THREE.Vector3().lerpVectors(p1, p2, t);
    }
  }

  return null;
}

export function getPulseScale(time: number, speed: number = 2, intensity: number = 0.1): number {
  return 1 + Math.sin(time * speed) * intensity;
}

export function getFlashOpacity(time: number, speed: number = 4): number {
  return 0.5 + Math.abs(Math.sin(time * speed)) * 0.5;
}

export function createGlowMaterial(color: string, intensity: number = 2): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity: 0.8,
  });
}

export function createGridHelper(size: number = 50, divisions: number = 50): THREE.GridHelper {
  const grid = new THREE.GridHelper(size, divisions, 0x444466, 0x222244);
  grid.position.y = 0.01;
  return grid;
}

export function getDistance3D(a: [number, number, number], b: [number, number, number]): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
