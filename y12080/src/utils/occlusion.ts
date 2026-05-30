import { Light, ActorRoute, Obstacle, DetectionResult, Vec3, RoutePoint, OcclusionSegment } from '../types';
import { lerp, distance, normalize, subtract, pointInAABB } from './math';

export function detectRouteOcclusions(
  route: ActorRoute,
  lights: Light[],
  obstacles: Obstacle[]
): { segments: OcclusionSegment[]; results: DetectionResult[] } {
  const segments: OcclusionSegment[] = [];
  const results: DetectionResult[] = [];
  const now = Date.now();
  
  const sampleCount = 20;
  const occlusionMap: boolean[] = [];
  const blockedByMap: string[][] = [];
  
  for (let i = 0; i < route.points.length - 1; i++) {
    const start = route.points[i];
    const end = route.points[i + 1];
    
    for (let s = 0; s < sampleCount; s++) {
      const t = s / sampleCount;
      const samplePoint = lerp(start.position, end.position, t);
      
      let isOccluded = false;
      const blockers: string[] = [];
      
      for (const light of lights) {
        if (isLineOccluded(light.position, samplePoint, obstacles)) {
          isOccluded = true;
          blockers.push(light.id);
        }
      }
      
      for (const obstacle of obstacles) {
        if (pointInAABB(samplePoint, obstacle.position, obstacle.size)) {
          isOccluded = true;
          if (!blockers.includes(obstacle.id)) {
            blockers.push(obstacle.id);
          }
        }
      }
      
      occlusionMap.push(isOccluded);
      blockedByMap.push(blockers);
    }
  }
  
  let segmentStart = 0;
  let currentOccluded = occlusionMap[0];
  let currentBlockers = new Set(blockedByMap[0]);
  
  for (let i = 1; i < occlusionMap.length; i++) {
    if (occlusionMap[i] !== currentOccluded) {
      if (currentOccluded) {
        const occlusionRate = (i - segmentStart) / sampleCount;
        if (occlusionRate > 0.1) {
          segments.push({
            startIndex: Math.floor(segmentStart / sampleCount),
            endIndex: Math.floor(i / sampleCount),
            occlusionRate,
            blockedBy: Array.from(currentBlockers),
          });
        }
      }
      segmentStart = i;
      currentOccluded = occlusionMap[i];
      currentBlockers = new Set(blockedByMap[i]);
    } else {
      blockedByMap[i].forEach(b => currentBlockers.add(b));
    }
  }
  
  if (currentOccluded) {
    const occlusionRate = (occlusionMap.length - segmentStart) / sampleCount;
    if (occlusionRate > 0.1) {
      segments.push({
        startIndex: Math.floor(segmentStart / sampleCount),
        endIndex: route.points.length - 1,
        occlusionRate,
        blockedBy: Array.from(currentBlockers),
      });
    }
  }
  
  segments.forEach((seg, idx) => {
    const startPoint = route.points[seg.startIndex];
    results.push({
      id: `occlusion-${route.id}-${idx}`,
      type: 'route_occlusion',
      severity: seg.occlusionRate > 0.5 ? 'error' : 'warning',
      status: 'pending',
      description: `${route.actorName} 路线第 ${seg.startIndex + 1}-${seg.endIndex + 1} 段遮挡率 ${Math.round(seg.occlusionRate * 100)}%`,
      assignee: '舞台监督',
      relatedRouteIds: [route.id],
      relatedObstacleIds: seg.blockedBy,
      position: startPoint.position,
      createdAt: now,
      notes: `遮挡源: ${seg.blockedBy.join(', ')}`,
    });
  });
  
  return { segments, results };
}

function isLineOccluded(
  start: Vec3,
  end: Vec3,
  obstacles: Obstacle[]
): boolean {
  const steps = 10;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const point = lerp(start, end, t);
    
    for (const obstacle of obstacles) {
      if (pointInAABB(point, obstacle.position, obstacle.size)) {
        return true;
      }
    }
  }
  return false;
}

export function detectParagraphMismatch(
  routes: ActorRoute[]
): DetectionResult[] {
  const results: DetectionResult[] = [];
  const now = Date.now();
  
  const paragraphs: Map<string, { routeId: string; startTime: number; endTime: number }[]> = new Map();
  
  for (const route of routes) {
    for (let i = 0; i < route.points.length - 1; i++) {
      const p = route.points[i];
      if (p.paragraph) {
        if (!paragraphs.has(p.paragraph)) {
          paragraphs.set(p.paragraph, []);
        }
        paragraphs.get(p.paragraph)!.push({
          routeId: route.id,
          startTime: p.time,
          endTime: route.points[i + 1].time,
        });
      }
    }
  }
  
  paragraphs.forEach((timings, paraName) => {
    if (timings.length < 2) return;
    
    const maxStart = Math.max(...timings.map(t => t.startTime));
    const minEnd = Math.min(...timings.map(t => t.endTime));
    
    if (maxStart > minEnd) {
      const routeNames = timings.map(t => 
        routes.find(r => r.id === t.routeId)?.actorName || t.routeId
      ).join('、');
      
      results.push({
        id: `mismatch-${paraName}`,
        type: 'paragraph_mismatch',
        severity: 'warning',
        status: 'pending',
        description: `段落"${paraName}"中 ${routeNames} 的时间不同步，相差 ${Math.round(maxStart - minEnd)} 秒`,
        assignee: '导演',
        relatedRouteIds: timings.map(t => t.routeId),
        createdAt: now,
        notes: '建议调整演员出场时间或灯光切换时机',
      });
    }
  });
  
  return results;
}

export function getPositionOnRoute(
  route: ActorRoute,
  time: number
): Vec3 | null {
  if (route.points.length < 2) return null;
  
  let prevPoint: RoutePoint | null = null;
  
  for (const point of route.points) {
    if (prevPoint && time >= prevPoint.time && time <= point.time) {
      const duration = point.time - prevPoint.time;
      const t = duration > 0 ? (time - prevPoint.time) / duration : 0;
      return lerp(prevPoint.position, point.position, t);
    }
    prevPoint = point;
  }
  
  if (time <= route.points[0].time) {
    return route.points[0].position;
  }
  
  return route.points[route.points.length - 1].position;
}
