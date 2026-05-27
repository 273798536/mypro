import { StormCloud, NoFlyZone, CollisionResult, Violation, Waypoint } from '../types';
import { haversineDistance, generateRoutePoints, isPointInPolygon } from '../utils/geo';

const SAMPLES_PER_SEGMENT = 30;

export const checkStormCollision = (
  waypoints: Waypoint[],
  cruiseAlt: number,
  storms: StormCloud[]
): Violation[] => {
  const violations: Violation[] = [];
  const routePoints = generateRoutePoints(waypoints, SAMPLES_PER_SEGMENT);

  storms.forEach(storm => {
    let affectedStartIndex = -1;
    let affectedEndIndex = -1;
    let firstCollisionPoint: { lat: number; lng: number } | null = null;

    routePoints.forEach((point, pointIndex) => {
      const distance = haversineDistance(
        point.lat,
        point.lng,
        storm.centerLat,
        storm.centerLng
      );

      const altInRange = cruiseAlt >= storm.bottomAlt && cruiseAlt <= storm.topAlt;
      const inRadius = distance < storm.radius;

      if (inRadius && altInRange) {
        if (affectedStartIndex === -1) {
          affectedStartIndex = Math.floor(pointIndex / SAMPLES_PER_SEGMENT);
          firstCollisionPoint = point;
        }
        affectedEndIndex = Math.floor(pointIndex / SAMPLES_PER_SEGMENT);
      }
    });

    if (affectedStartIndex !== -1 && firstCollisionPoint) {
      const intensityMap = {
        light: '轻度',
        moderate: '中度',
        severe: '强',
      };

      violations.push({
        type: 'storm',
        severity: storm.intensity === 'severe' ? 'danger' : 'warning',
        message: `航线穿过${intensityMap[storm.intensity]}雷暴云团「${storm.name}」，影响范围半径${storm.radius}公里，云顶高度${storm.topAlt}米`,
        location: firstCollisionPoint,
        affectedSegment: [affectedStartIndex, affectedEndIndex],
        stormId: storm.id,
      });
    }
  });

  return violations;
};

export const checkNoFlyZoneCollision = (
  waypoints: Waypoint[],
  cruiseAlt: number,
  noFlyZones: NoFlyZone[]
): Violation[] => {
  const violations: Violation[] = [];
  const routePoints = generateRoutePoints(waypoints, SAMPLES_PER_SEGMENT);

  noFlyZones.forEach(zone => {
    let affectedStartIndex = -1;
    let affectedEndIndex = -1;
    let firstCollisionPoint: { lat: number; lng: number } | null = null;

    routePoints.forEach((point, pointIndex) => {
      const inPolygon = isPointInPolygon(point, zone.polygon);
      const altInRange = cruiseAlt >= zone.minAlt && cruiseAlt <= zone.maxAlt;

      if (inPolygon && altInRange) {
        if (affectedStartIndex === -1) {
          affectedStartIndex = Math.floor(pointIndex / SAMPLES_PER_SEGMENT);
          firstCollisionPoint = point;
        }
        affectedEndIndex = Math.floor(pointIndex / SAMPLES_PER_SEGMENT);
      }
    });

    if (affectedStartIndex !== -1 && firstCollisionPoint) {
      const typeMap = {
        restricted: '限制区',
        prohibited: '禁止区',
        danger: '危险区',
      };

      const severity = zone.type === 'prohibited' ? 'danger' : 'warning';

      violations.push({
        type: 'noflyzone',
        severity,
        message: `航线侵入${typeMap[zone.type]}「${zone.name}」，高度限制${zone.minAlt}-${zone.maxAlt}米，有效期至${zone.effectiveTo}`,
        location: firstCollisionPoint,
        affectedSegment: [affectedStartIndex, affectedEndIndex],
        zoneId: zone.id,
      });
    }
  });

  return violations;
};

export const checkAllCollisions = (
  waypoints: Waypoint[],
  cruiseAlt: number,
  storms: StormCloud[],
  noFlyZones: NoFlyZone[]
): CollisionResult => {
  const stormViolations = checkStormCollision(waypoints, cruiseAlt, storms);
  const zoneViolations = checkNoFlyZoneCollision(waypoints, cruiseAlt, noFlyZones);

  const allViolations = [...stormViolations, ...zoneViolations];

  return {
    hasCollision: allViolations.length > 0,
    violations: allViolations,
  };
};

export const getViolationColor = (severity: 'warning' | 'danger'): string => {
  return severity === 'danger' ? '#dc2626' : '#f59e0b';
};

export const getViolationIcon = (type: 'storm' | 'noflyzone'): string => {
  return type === 'storm' ? '⛈️' : '🚫';
};
