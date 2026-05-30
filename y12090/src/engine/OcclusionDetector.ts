import * as THREE from 'three';
import type {
  Seat,
  SubtitleScreenConfig,
  AuditoriumBounds,
  Point3D,
} from '../types/seat';
import type {
  OcclusionResult,
  OcclusionType,
  OcclusionSeverity,
  OcclusionSource,
} from '../types/occlusion';

interface DetectionContext {
  seats: Seat[];
  subtitleScreen?: SubtitleScreenConfig;
  auditoriumBounds?: AuditoriumBounds;
}

interface Ray {
  origin: Point3D;
  direction: Point3D;
}

export class OcclusionDetector {
  private raycaster: THREE.Raycaster;

  constructor() {
    this.raycaster = new THREE.Raycaster();
  }

  detectAll(context: DetectionContext): OcclusionResult[] {
    const results: OcclusionResult[] = [];

    for (const seat of context.seats) {
      const seatResults = this.detectSeat(seat, context);
      results.push(...seatResults);
    }

    return results;
  }

  detectSeat(seat: Seat, context: DetectionContext): OcclusionResult[] {
    const results: OcclusionResult[] = [];
    const eyePoint: Point3D = {
      x: seat.position.x,
      y: seat.position.y + seat.eyeHeight,
      z: seat.position.z,
    };

    const ray: Ray = {
      origin: eyePoint,
      direction: this.normalize({
        x: seat.targetPoint.x - eyePoint.x,
        y: seat.targetPoint.y - eyePoint.y,
        z: seat.targetPoint.z - eyePoint.z,
      }),
    };

    if (context.subtitleScreen) {
      const screenResult = this.checkSubtitleScreenOcclusion(
        seat,
        ray,
        context.subtitleScreen
      );
      if (screenResult) {
        results.push(screenResult);
      }

      const heightErrorResult = this.checkScreenHeightError(seat, context.subtitleScreen);
      if (heightErrorResult) {
        results.push(heightErrorResult);
      }
    }

    if (context.auditoriumBounds) {
      const wallResult = this.checkWallPenetration(seat, context.auditoriumBounds);
      if (wallResult) {
        results.push(wallResult);
      }
    }

    const obstacleResult = this.checkObstacleOcclusion(seat, ray, context.seats);
    if (obstacleResult) {
      results.push(obstacleResult);
    }

    if (results.length === 0) {
      results.push({
        id: `occlusion-${seat.id}-normal`,
        seatId: seat.id,
        type: 'normal',
        severity: 'info',
        description: '视线正常，无遮挡',
        source: 'none',
      });
    }

    return results;
  }

  private checkSubtitleScreenOcclusion(
    seat: Seat,
    ray: Ray,
    screen: SubtitleScreenConfig
  ): OcclusionResult | null {
    const screenPlane = new THREE.Plane();
    const normal = new THREE.Vector3(0, 0, 1);
    normal.applyEuler(
      new THREE.Euler(
        (screen.rotation.x * Math.PI) / 180,
        (screen.rotation.y * Math.PI) / 180,
        (screen.rotation.z * Math.PI) / 180
      )
    );

    screenPlane.setFromNormalAndCoplanarPoint(
      normal,
      new THREE.Vector3(screen.position.x, screen.position.y, screen.position.z)
    );

    const origin = new THREE.Vector3(ray.origin.x, ray.origin.y, ray.origin.z);
    const direction = new THREE.Vector3(ray.direction.x, ray.direction.y, ray.direction.z);
    const rayThree = new THREE.Ray(origin, direction);

    const intersection = new THREE.Vector3();
    rayThree.intersectPlane(screenPlane, intersection);

    if (!intersection) return null;

    const halfWidth = screen.width / 2;
    const halfHeight = screen.height / 2;

    const localX = intersection.x - screen.position.x;
    const localY = intersection.y - screen.position.y;

    if (
      Math.abs(localX) <= halfWidth &&
      Math.abs(localY) <= halfHeight
    ) {
      const distance = origin.distanceTo(intersection);
      const targetDistance = origin.distanceTo(
        new THREE.Vector3(
          seat.targetPoint.x,
          seat.targetPoint.y,
          seat.targetPoint.z
        )
      );

      if (distance < targetDistance) {
        return {
          id: `occlusion-${seat.id}-screen`,
          seatId: seat.id,
          type: 'subtitle_screen',
          severity: 'error',
          description: `视线被字幕屏遮挡，交点在屏幕范围内，距离视点${distance.toFixed(2)}米`,
          source: 'subtitle_screen',
          intersectionPoint: {
            x: intersection.x,
            y: intersection.y,
            z: intersection.z,
          },
          distance,
        };
      }
    }

    return null;
  }

  private checkScreenHeightError(
    seat: Seat,
    screen: SubtitleScreenConfig
  ): OcclusionResult | null {
    const height = screen.position.y;
    const { min, max } = screen.validHeightRange;

    if (height < min || height > max) {
      return {
        id: `occlusion-${seat.id}-height`,
        seatId: seat.id,
        type: 'screen_height_error',
        severity: 'warning',
        description: `字幕屏高度${height.toFixed(2)}米超出有效范围(${min}-${max}米)`,
        source: 'parameter_error',
      };
    }
    return null;
  }

  private checkWallPenetration(
    seat: Seat,
    bounds: AuditoriumBounds
  ): OcclusionResult | null {
    const target = seat.targetPoint;

    if (
      target.x < bounds.min.x ||
      target.x > bounds.max.x ||
      target.y < bounds.min.y ||
      target.y > bounds.max.y ||
      target.z < bounds.min.z ||
      target.z > bounds.max.z
    ) {
      return {
        id: `occlusion-${seat.id}-wall`,
        seatId: seat.id,
        type: 'wall_penetration',
        severity: 'warning',
        description: '视线目标点穿出厅堂边界',
        source: 'wall',
      };
    }
    return null;
  }

  private checkObstacleOcclusion(
    seat: Seat,
    ray: Ray,
    allSeats: Seat[]
  ): OcclusionResult | null {
    const eyePoint = new THREE.Vector3(
      ray.origin.x,
      ray.origin.y,
      ray.origin.z
    );
    const targetPoint = new THREE.Vector3(
      seat.targetPoint.x,
      seat.targetPoint.y,
      seat.targetPoint.z
    );
    const rayDir = new THREE.Vector3()
      .subVectors(targetPoint, eyePoint)
      .normalize();
    const rayThree = new THREE.Ray(eyePoint, rayDir);

    for (const otherSeat of allSeats) {
      if (otherSeat.id === seat.id) continue;

      const otherPos = new THREE.Vector3(
        otherSeat.position.x,
        otherSeat.position.y + otherSeat.eyeHeight / 2,
        otherSeat.position.z
      );

      const toOther = new THREE.Vector3().subVectors(otherPos, eyePoint);
      const projection = toOther.dot(rayDir);

      if (projection <= 0) continue;

      const closestPoint = eyePoint
        .clone()
        .add(rayDir.clone().multiplyScalar(projection));
      const distance = closestPoint.distanceTo(otherPos);

      const seatRadius = 0.4;
      if (distance < seatRadius) {
        const targetDistance = eyePoint.distanceTo(targetPoint);
        if (projection < targetDistance) {
          return {
            id: `occlusion-${seat.id}-obstacle`,
            seatId: seat.id,
            type: 'obstacle',
            severity: 'warning',
            description: `视线被${otherSeat.row}排${otherSeat.number}座遮挡`,
            source: 'other_seat',
            intersectionPoint: {
              x: closestPoint.x,
              y: closestPoint.y,
              z: closestPoint.z,
            },
            distance: projection,
          };
        }
      }
    }

    return null;
  }

  private normalize(v: Point3D): Point3D {
    const length = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    if (length === 0) return { x: 0, y: 0, z: 1 };
    return {
      x: v.x / length,
      y: v.y / length,
      z: v.z / length,
    };
  }
}

export function getSeverityForType(type: OcclusionType): OcclusionSeverity {
  const severityMap: Record<OcclusionType, OcclusionSeverity> = {
    normal: 'info',
    subtitle_screen: 'error',
    obstacle: 'warning',
    wall_penetration: 'warning',
    screen_height_error: 'warning',
  };
  return severityMap[type];
}

export function getSourceForType(type: OcclusionType): OcclusionSource {
  const sourceMap: Record<OcclusionType, OcclusionSource> = {
    normal: 'none',
    subtitle_screen: 'subtitle_screen',
    obstacle: 'other_seat',
    wall_penetration: 'wall',
    screen_height_error: 'parameter_error',
  };
  return sourceMap[type];
}
