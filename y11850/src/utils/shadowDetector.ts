import * as THREE from 'three';
import { Building, Apartment, ShadowAnalysis, ShadowPeriod, Season, SunPosition } from '@/types';
import { interpolateSunPosition } from './sunCalculator';

export interface BuildingBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export function getBuildingBounds(building: Building): BuildingBounds {
  const [px, py, pz] = building.position;
  const [dx, dy, dz] = building.dimensions;
  
  return {
    minX: px - dx / 2,
    maxX: px + dx / 2,
    minY: py,
    maxY: py + dy,
    minZ: pz - dz / 2,
    maxZ: pz + dz / 2,
  };
}

export function checkRayBoxIntersection(
  rayOrigin: [number, number, number],
  rayDirection: [number, number, number],
  bounds: BuildingBounds
): boolean {
  const [ox, oy, oz] = rayOrigin;
  const [dx, dy, dz] = rayDirection;
  
  let tmin = -Infinity;
  let tmax = Infinity;
  
  if (dx !== 0) {
    const t1 = (bounds.minX - ox) / dx;
    const t2 = (bounds.maxX - ox) / dx;
    tmin = Math.max(tmin, Math.min(t1, t2));
    tmax = Math.min(tmax, Math.max(t1, t2));
  } else if (ox < bounds.minX || ox > bounds.maxX) {
    return false;
  }
  
  if (dy !== 0) {
    const t1 = (bounds.minY - oy) / dy;
    const t2 = (bounds.maxY - oy) / dy;
    tmin = Math.max(tmin, Math.min(t1, t2));
    tmax = Math.min(tmax, Math.max(t1, t2));
  } else if (oy < bounds.minY || oy > bounds.maxY) {
    return false;
  }
  
  if (dz !== 0) {
    const t1 = (bounds.minZ - oz) / dz;
    const t2 = (bounds.maxZ - oz) / dz;
    tmin = Math.max(tmin, Math.min(t1, t2));
    tmax = Math.min(tmax, Math.max(t1, t2));
  } else if (oz < bounds.minZ || oz > bounds.maxZ) {
    return false;
  }
  
  return tmax >= Math.max(0, tmin);
}

export function getSunDirection(altitude: number, azimuth: number): [number, number, number] {
  const altRad = (altitude * Math.PI) / 180;
  const azRad = (azimuth * Math.PI) / 180;
  
  const dx = Math.cos(altRad) * Math.sin(azRad);
  const dy = Math.sin(altRad);
  const dz = Math.cos(altRad) * Math.cos(azRad);
  
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
  return [dx / len, dy / len, dz / len];
}

export function isWindowShadowed(
  windowPos: [number, number, number],
  sunPos: SunPosition,
  buildings: Building[],
  ownBuildingId: string
): { shadowed: boolean; blockingBuildingId?: string } {
  if (sunPos.altitude <= 0) {
    return { shadowed: true, blockingBuildingId: undefined };
  }
  
  const direction = getSunDirection(sunPos.altitude, sunPos.azimuth);
  const offsetPos: [number, number, number] = [
    windowPos[0] + direction[0] * 0.1,
    windowPos[1] + direction[1] * 0.1,
    windowPos[2] + direction[2] * 0.1,
  ];
  
  for (const building of buildings) {
    if (building.id === ownBuildingId) continue;
    
    const bounds = getBuildingBounds(building);
    if (checkRayBoxIntersection(offsetPos, direction, bounds)) {
      return { shadowed: true, blockingBuildingId: building.id };
    }
  }
  
  return { shadowed: false };
}

export function analyzeApartmentShadows(
  apartment: Apartment,
  building: Building,
  buildings: Building[],
  sunPositions: SunPosition[],
  season: Season
): ShadowAnalysis {
  const shadowPeriods: ShadowPeriod[] = [];
  let currentShadowStart: number | null = null;
  let currentBlockingId: string | undefined;
  let totalSunlightMinutes = 0;
  
  const timeStep = 0.5;
  
  for (let hour = 6; hour <= 18; hour += timeStep) {
    const sunPos = interpolateSunPosition(sunPositions, hour);
    if (!sunPos || sunPos.altitude <= 0) {
      if (currentShadowStart === null) {
        currentShadowStart = hour;
        currentBlockingId = undefined;
      }
      continue;
    }
    
    let allWindowsShadowed = true;
    let blockingId: string | undefined;
    
    for (const windowPos of apartment.windowPositions) {
      const result = isWindowShadowed(windowPos, sunPos, buildings, building.id);
      if (!result.shadowed) {
        allWindowsShadowed = false;
        break;
      }
      blockingId = result.blockingBuildingId;
    }
    
    if (allWindowsShadowed) {
      if (currentShadowStart === null) {
        currentShadowStart = hour;
        currentBlockingId = blockingId;
      }
    } else {
      totalSunlightMinutes += timeStep * 60;
      if (currentShadowStart !== null) {
        const blockingBuilding = buildings.find(b => b.id === currentBlockingId);
        shadowPeriods.push({
          start: currentShadowStart,
          end: hour,
          reason: blockingBuilding 
            ? `被${blockingBuilding.name}遮挡` 
            : '太阳高度角不足',
          blockingBuildingId: currentBlockingId,
        });
        currentShadowStart = null;
        currentBlockingId = undefined;
      }
    }
  }
  
  if (currentShadowStart !== null) {
    const blockingBuilding = buildings.find(b => b.id === currentBlockingId);
    shadowPeriods.push({
      start: currentShadowStart,
      end: 18,
      reason: blockingBuilding 
        ? `被${blockingBuilding.name}遮挡` 
        : '太阳高度角不足',
      blockingBuildingId: currentBlockingId,
    });
  }
  
  const issues: string[] = [];
  let needsReview = false;
  
  if (totalSunlightMinutes < 120) {
    issues.push('日照时长不足2小时，需重点关注');
    needsReview = true;
  }
  
  for (const period of shadowPeriods) {
    const duration = period.end - period.start;
    if (duration > 4) {
      issues.push(`存在超过4小时的连续遮挡：${formatTime(period.start)}-${formatTime(period.end)}`);
      needsReview = true;
    }
    
    if (period.blockingBuildingId && period.reason.includes('遮挡')) {
      const duration = period.end - period.start;
      if (Math.abs(duration - Math.round(duration)) < 0.1) {
        issues.push(`边界情况需复核：${formatTime(period.start)}前后的遮挡状态`);
        needsReview = true;
      }
    }
  }
  
  return {
    apartmentId: apartment.id,
    buildingId: building.id,
    season,
    totalSunlightHours: Math.round((totalSunlightMinutes / 60) * 10) / 10,
    shadowPeriods,
    issues,
    needsReview,
  };
}

export function analyzeAllApartments(
  buildings: Building[],
  sunPathData: Record<Season, SunPosition[]>,
  season: Season
): ShadowAnalysis[] {
  const results: ShadowAnalysis[] = [];
  const sunPositions = sunPathData[season];
  
  for (const building of buildings) {
    for (const apartment of building.apartments) {
      results.push(analyzeApartmentShadows(apartment, building, buildings, sunPositions, season));
    }
  }
  
  return results;
}

export function formatTime(hour: number): string {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function getShadowColor(intensity: number): string {
  const alpha = Math.max(0.2, Math.min(0.7, 0.2 + intensity * 0.5));
  return `rgba(0, 0, 0, ${alpha})`;
}

export function calculateShadowProjection(
  building: Building,
  sunPos: SunPosition,
  groundY: number = 0
): [number, number, number][] {
  const bounds = getBuildingBounds(building);
  const direction = getSunDirection(sunPos.altitude, sunPos.azimuth);
  
  const corners: [number, number, number][] = [
    [bounds.minX, bounds.maxY, bounds.minZ],
    [bounds.maxX, bounds.maxY, bounds.minZ],
    [bounds.maxX, bounds.maxY, bounds.maxZ],
    [bounds.minX, bounds.maxY, bounds.maxZ],
  ];
  
  const projected: [number, number, number][] = [];
  
  for (const corner of corners) {
    if (direction[1] !== 0) {
      const t = (groundY - corner[1]) / direction[1];
      if (t > 0) {
        projected.push([
          corner[0] + direction[0] * t,
          groundY,
          corner[2] + direction[2] * t,
        ]);
      }
    }
  }
  
  return projected;
}
