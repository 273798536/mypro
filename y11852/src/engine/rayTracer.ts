import * as THREE from 'three';
import type { SoundSource, SoundRay, Seat, Vec3, FrequencyBand, HallModel, Material } from '../types/acoustics';
import { vec3ToThree, threeToVec3, generateRayDirections, reflect, distance, normalize, lerp } from './geometry';
import { SPEED_OF_SOUND, getAbsorptionCoefficient, calculateReflectionIntensity } from './acoustics';

interface RayTraceOptions {
  maxBounces: number;
  maxDistance: number;
  raysPerSource: number;
}

const DEFAULT_OPTIONS: RayTraceOptions = {
  maxBounces: 5,
  maxDistance: 100,
  raysPerSource: 120,
};

export class RayTracer {
  private sceneMeshes: THREE.Mesh[] = [];
  private raycaster: THREE.Raycaster;
  private options: RayTraceOptions;
  private getMaterialFn: (meshName: string) => Material | undefined;

  constructor(
    meshes: THREE.Mesh[],
    getMaterialFn: (meshName: string) => Material | undefined,
    options?: Partial<RayTraceOptions>
  ) {
    this.sceneMeshes = meshes;
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = options?.maxDistance || DEFAULT_OPTIONS.maxDistance;
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.getMaterialFn = getMaterialFn;
  }

  public traceRays(
    source: SoundSource,
    seats: Seat[],
    onProgress?: (progress: number) => void
  ): SoundRay[] {
    const rays: SoundRay[] = [];
    const directions = generateRayDirections(this.options.raysPerSource, source.directivity);
    const seatMeshes = this.createSeatProxies(seats);
    const allMeshes = [...this.sceneMeshes, ...seatMeshes];

    directions.forEach((dir, idx) => {
      const ray = this.traceSingleRay(
        source.position,
        dir,
        source.frequency,
        source.id,
        source.power,
        allMeshes,
        seats
      );
      if (ray) {
        rays.push(ray);
      }
      if (onProgress && idx % 10 === 0) {
        onProgress(idx / directions.length);
      }
    });

    return rays;
  }

  private createSeatProxies(seats: Seat[]): THREE.Mesh[] {
    return seats.map((seat) => {
      const geometry = new THREE.SphereGeometry(0.4, 8, 8);
      const material = new THREE.MeshBasicMaterial({ visible: false });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(seat.position.x, seat.position.y, seat.position.z);
      mesh.name = `seat_${seat.id}`;
      mesh.userData.seatId = seat.id;
      mesh.updateMatrixWorld();
      return mesh;
    });
  }

  private traceSingleRay(
    origin: Vec3,
    direction: Vec3,
    frequency: FrequencyBand,
    sourceId: string,
    initialPower: number,
    meshes: THREE.Mesh[],
    seats: Seat[]
  ): SoundRay | null {
    const path: Vec3[] = [{ ...origin }];
    const times: number[] = [0];
    const intensity: number[] = [1];
    const hitSeatIds: string[] = [];
    const bouncedSurfaces: string[] = [];

    let currentOrigin = { ...origin };
    let currentDir = normalize(direction);
    let totalDistance = 0;
    let bounces = 0;
    let currentIntensity = 1;

    while (bounces <= this.options.maxBounces && totalDistance < this.options.maxDistance) {
      const originThree = vec3ToThree(currentOrigin);
      const dirThree = vec3ToThree(currentDir);

      this.raycaster.set(originThree, dirThree);
      const intersects = this.raycaster.intersectObjects(meshes, false);

      if (intersects.length === 0) break;

      const hit = intersects[0];
      const hitPoint = threeToVec3(hit.point);
      const dist = distance(currentOrigin, hitPoint);
      totalDistance += dist;

      const travelTime = totalDistance / SPEED_OF_SOUND;

      if (hit.object.name.startsWith('seat_')) {
        const seatId = hit.object.userData.seatId;
        if (seatId && !hitSeatIds.includes(seatId)) {
          hitSeatIds.push(seatId);
        }
      }

      path.push(hitPoint);
      times.push(travelTime);
      intensity.push(currentIntensity);

      const normal = hit.face ? threeToVec3(hit.face.normal) : { x: 0, y: 1, z: 0 };
      if (hit.object.name && !hit.object.name.startsWith('seat_')) {
        bouncedSurfaces.push(hit.object.name);
      }

      if (hit.object.name.startsWith('seat_') || !hit.face) {
        break;
      }

      const material = this.getMaterialFn(hit.object.name);
      const absorption = getAbsorptionCoefficient(material, frequency);
      bounces++;
      currentIntensity = calculateReflectionIntensity(initialPower / 100, absorption, bounces);

      if (currentIntensity < 0.01) break;

      currentDir = reflect(currentDir, normal);
      currentOrigin = lerp(hitPoint, {
        x: hitPoint.x + currentDir.x * 0.01,
        y: hitPoint.y + currentDir.y * 0.01,
        z: hitPoint.z + currentDir.z * 0.01,
      }, 1);
    }

    if (path.length < 2) return null;

    return {
      id: `ray_${sourceId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sourceId,
      frequency,
      path,
      times,
      intensity,
      hitSeatIds,
      bouncedSurfaces,
    };
  }

  public checkOcclusion(sourcePos: Vec3, seatPos: Vec3): boolean {
    const origin = vec3ToThree(sourcePos);
    const direction = vec3ToThree(normalize({
      x: seatPos.x - sourcePos.x,
      y: seatPos.y - sourcePos.y,
      z: seatPos.z - sourcePos.z,
    }));

    this.raycaster.set(origin, direction);
    const dist = distance(sourcePos, seatPos);
    this.raycaster.far = dist * 0.99;

    const intersects = this.raycaster.intersectObjects(this.sceneMeshes, false);
    return intersects.length > 0;
  }
}

export const traceAllSources = (
  sources: SoundSource[],
  seats: Seat[],
  hallGeometries: Record<string, THREE.BufferGeometry>,
  getMaterialFn: (meshName: string) => Material | undefined,
  onProgress?: (sourceIdx: number, progress: number) => void
): SoundRay[] => {
  const meshes: THREE.Mesh[] = Object.entries(hallGeometries).map(([name, geom]) => {
    const material = new THREE.MeshBasicMaterial({ visible: false });
    const mesh = new THREE.Mesh(geom, material);
    mesh.name = name;
    mesh.updateMatrixWorld();
    return mesh;
  });

  const tracer = new RayTracer(meshes, getMaterialFn, {
    maxBounces: 4,
    maxDistance: 80,
    raysPerSource: 80,
  });

  const allRays: SoundRay[] = [];

  sources.forEach((source, idx) => {
    const rays = tracer.traceRays(source, seats, (progress) => {
      onProgress?.(idx, progress);
    });
    allRays.push(...rays);
  });

  return allRays;
};

export const checkAllSeatOcclusions = (
  sources: SoundSource[],
  seats: Seat[],
  hallGeometries: Record<string, THREE.BufferGeometry>,
  getMaterialFn: (meshName: string) => Material | undefined
): boolean[] => {
  const meshes: THREE.Mesh[] = Object.entries(hallGeometries).map(([name, geom]) => {
    const material = new THREE.MeshBasicMaterial({ visible: false });
    const mesh = new THREE.Mesh(geom, material);
    mesh.name = name;
    mesh.updateMatrixWorld();
    return mesh;
  });

  const tracer = new RayTracer(meshes, getMaterialFn);

  return seats.map((seat) => {
    return sources.some((source) => tracer.checkOcclusion(source.position, seat.position));
  });
};
