import * as THREE from 'three';
import { Seat, Obstacle, VisibilityResult, Position3D } from '@/types';

const TARGET_POSITIONS = {
  stage: { x: 0, y: 2, z: -15 },
  leftScreen: { x: -8, y: 3, z: -14 },
  rightScreen: { x: 8, y: 3, z: -14 },
};

function createRaycaster(): THREE.Raycaster {
  return new THREE.Raycaster();
}

function createObstacleMeshes(obstacles: Obstacle[]): THREE.Mesh[] {
  return obstacles.filter(o => o.visible).map(obstacle => {
    const geometry = new THREE.BoxGeometry(
      obstacle.dimensions.width,
      obstacle.dimensions.height,
      obstacle.dimensions.depth
    );
    const material = new THREE.MeshBasicMaterial({ visible: false });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(
      obstacle.position.x,
      obstacle.position.y,
      obstacle.position.z
    );
    mesh.userData = { obstacleId: obstacle.id };
    return mesh;
  });
}

function sampleTargetPoints(center: Position3D, count: number = 5): Position3D[] {
  const points: Position3D[] = [{ ...center }];
  const offsets = [
    { x: 1, y: 0.5, z: 0 },
    { x: -1, y: 0.5, z: 0 },
    { x: 1, y: -0.5, z: 0 },
    { x: -1, y: -0.5, z: 0 },
  ];
  for (let i = 0; i < Math.min(count - 1, offsets.length); i++) {
    points.push({
      x: center.x + offsets[i].x,
      y: center.y + offsets[i].y,
      z: center.z + offsets[i].z,
    });
  }
  return points;
}

export function checkSeatVisibility(
  seat: Seat,
  obstacles: Obstacle[],
  target: 'stage' | 'leftScreen' | 'rightScreen'
): VisibilityResult {
  const raycaster = createRaycaster();
  const obstacleMeshes = createObstacleMeshes(obstacles);
  const targetCenter = TARGET_POSITIONS[target];
  const targetPoints = sampleTargetPoints(targetCenter, 5);
  
  const seatPos = new THREE.Vector3(
    seat.position.x,
    seat.position.y + 0.6,
    seat.position.z
  );

  let hits = 0;
  let blockedById: string | undefined;

  for (const targetPoint of targetPoints) {
    const targetVec = new THREE.Vector3(targetPoint.x, targetPoint.y, targetPoint.z);
    const direction = new THREE.Vector3().subVectors(targetVec, seatPos).normalize();
    
    raycaster.set(seatPos, direction);
    raycaster.far = seatPos.distanceTo(targetVec) - 0.1;
    
    const intersections = raycaster.intersectObjects(obstacleMeshes, false);
    
    if (intersections.length === 0) {
      hits++;
    } else if (!blockedById) {
      blockedById = intersections[0].object.userData.obstacleId;
    }
  }

  obstacleMeshes.forEach(m => {
    m.geometry.dispose();
    (m.material as THREE.Material).dispose();
  });

  const hitRatio = hits / targetPoints.length;
  const visible = hitRatio >= 0.6;
  
  let confidence: 'high' | 'medium' | 'low' = 'high';
  if (hitRatio > 0.4 && hitRatio < 0.8) {
    confidence = 'medium';
  } else if (hitRatio <= 0.4) {
    confidence = visible ? 'low' : 'high';
  }

  return {
    visible,
    blockedBy: visible ? undefined : blockedById,
    confidence,
    rayHits: hits,
    totalRays: targetPoints.length,
  };
}

export function checkAllSeatsVisibility(
  seats: Seat[],
  obstacles: Obstacle[],
  onProgress?: (current: number, total: number) => void
): Seat[] {
  return seats.map((seat, index) => {
    if (onProgress) {
      onProgress(index + 1, seats.length);
    }
    
    return {
      ...seat,
      visibility: {
        stage: checkSeatVisibility(seat, obstacles, 'stage'),
        leftScreen: checkSeatVisibility(seat, obstacles, 'leftScreen'),
        rightScreen: checkSeatVisibility(seat, obstacles, 'rightScreen'),
      },
    };
  });
}

export function compareVersions(
  currentSeats: Seat[],
  previousSeats: Seat[]
): Seat[] {
  const prevMap = new Map(previousSeats.map(s => [s.id, s]));
  
  return currentSeats.map(seat => {
    const prevSeat = prevMap.get(seat.id);
    if (!prevSeat) {
      return { ...seat, comparisonStatus: 'new' as const };
    }
    
    if (!seat.visibility || !prevSeat.visibility) {
      return { ...seat, comparisonStatus: 'unchanged' as const };
    }
    
    const currentBlocked = 
      !seat.visibility.stage.visible ||
      !seat.visibility.leftScreen.visible ||
      !seat.visibility.rightScreen.visible;
    
    const prevBlocked = 
      !prevSeat.visibility.stage.visible ||
      !prevSeat.visibility.leftScreen.visible ||
      !prevSeat.visibility.rightScreen.visible;
    
    if (currentBlocked && !prevBlocked) {
      return { ...seat, comparisonStatus: 'worsened' as const };
    } else if (!currentBlocked && prevBlocked) {
      return { ...seat, comparisonStatus: 'improved' as const };
    }
    
    return { ...seat, comparisonStatus: 'unchanged' as const };
  });
}
