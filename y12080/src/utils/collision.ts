import { Light, Obstacle, DetectionResult, Vec3 } from '../types';
import { distance, coneContainsPoint, normalize, subtract, aabbOverlap } from './math';

export function detectLightConflicts(
  lights: Light[],
  obstacles: Obstacle[]
): DetectionResult[] {
  const results: DetectionResult[] = [];
  const now = Date.now();
  
  for (let i = 0; i < lights.length; i++) {
    for (let j = i + 1; j < lights.length; j++) {
      const conflict = checkBeamOverlap(lights[i], lights[j]);
      if (conflict) {
        results.push({
          id: `conflict-${lights[i].id}-${lights[j].id}`,
          type: 'light_conflict',
          severity: 'error',
          status: 'pending',
          description: `${lights[i].name} 与 ${lights[j].name} 光束重叠区域过大`,
          assignee: '灯光师',
          relatedLightIds: [lights[i].id, lights[j].id],
          position: conflict,
          createdAt: now,
        });
      }
    }
  }
  
  for (const light of lights) {
    for (const obstacle of obstacles) {
      if (checkLightObstacleProximity(light, obstacle)) {
        results.push({
          id: `proximity-${light.id}-${obstacle.id}`,
          type: 'light_conflict',
          severity: 'warning',
          status: 'pending',
          description: `${light.name} 与 ${obstacle.name} 距离过近`,
          assignee: '舞台监督',
          relatedLightIds: [light.id],
          relatedObstacleIds: [obstacle.id],
          position: light.position,
          createdAt: now,
        });
      }
    }
  }
  
  return results;
}

function checkBeamOverlap(light1: Light, light2: Light): Vec3 | null {
  const dir1 = normalize(subtract(light1.target, light1.position));
  const dir2 = normalize(subtract(light2.target, light2.position));
  const angleRad1 = (light1.angle * Math.PI) / 180;
  const angleRad2 = (light2.angle * Math.PI) / 180;
  
  const dist = distance(light1.position, light2.position);
  if (dist > 10) return null;
  
  const midPoint: Vec3 = [
    (light1.position[0] + light2.position[0]) / 2,
    (light1.position[1] + light2.position[1]) / 2,
    (light1.position[2] + light2.position[2]) / 2,
  ];
  
  const targetMid: Vec3 = [
    (light1.target[0] + light2.target[0]) / 2,
    (light1.target[1] + light2.target[1]) / 2,
    (light1.target[2] + light2.target[2]) / 2,
  ];
  
  const inCone1 = coneContainsPoint(
    light1.position, dir1, angleRad1, 15, targetMid
  );
  const inCone2 = coneContainsPoint(
    light2.position, dir2, angleRad2, 15, midPoint
  );
  
  if (inCone1 && inCone2) {
    return targetMid;
  }
  
  return null;
}

function checkLightObstacleProximity(
  light: Light,
  obstacle: Obstacle
): boolean {
  const lightSize: Vec3 = [0.5, 0.5, 0.5];
  return aabbOverlap(
    light.position, lightSize,
    obstacle.position, obstacle.size
  ) || distance(light.position, obstacle.position) < 1.5;
}

export function detectBlindSpots(
  lights: Light[],
  samplePoints: Vec3[],
  threshold: number = 0.3
): Vec3[] {
  const blindSpots: Vec3[] = [];
  
  for (const point of samplePoints) {
    let illuminated = false;
    
    for (const light of lights) {
      const dir = normalize(subtract(light.target, light.position));
      const angleRad = (light.angle * Math.PI) / 180;
      
      if (coneContainsPoint(light.position, dir, angleRad, 15, point)) {
        illuminated = true;
        break;
      }
    }
    
    if (!illuminated) {
      blindSpots.push(point);
    }
  }
  
  return blindSpots;
}
