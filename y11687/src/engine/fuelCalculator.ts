import { Waypoint, FuelResult, AircraftSpec } from '../types';
import { haversineDistance } from '../utils/geo';

const RESERVE_FUEL_PERCENTAGE = 0.1;

export const calculateFuel = (
  waypoints: Waypoint[],
  cruiseAlt: number,
  aircraftSpec: AircraftSpec
): FuelResult => {
  const distancePerSegment: number[] = [];
  const fuelPerSegment: number[] = [];
  let totalDistance = 0;

  for (let i = 0; i < waypoints.length - 1; i++) {
    const distance = haversineDistance(
      waypoints[i].lat,
      waypoints[i].lng,
      waypoints[i + 1].lat,
      waypoints[i + 1].lng
    );
    distancePerSegment.push(distance);
    totalDistance += distance;
  }

  const cruiseSpeed = aircraftSpec.cruiseSpeed;
  const flightTime = totalDistance / cruiseSpeed;

  const altFactor = 1 + (cruiseAlt - 8000) / 40000;

  const baseFuel = flightTime * aircraftSpec.fuelBurnRate * altFactor;
  const reserveFuel = baseFuel * RESERVE_FUEL_PERCENTAGE;
  const totalFuel = baseFuel + reserveFuel;

  const isOverLimit = totalFuel > aircraftSpec.fuelCapacity;

  distancePerSegment.forEach((dist, i) => {
    const segmentTime = dist / cruiseSpeed;
    const segmentFuel = segmentTime * aircraftSpec.fuelBurnRate * altFactor;
    fuelPerSegment.push(segmentFuel);
  });

  return {
    totalDistance: Math.round(totalDistance * 10) / 10,
    totalFuel: Math.round(totalFuel * 100) / 100,
    flightTime: Math.round(flightTime * 100) / 100,
    fuelCapacity: aircraftSpec.fuelCapacity,
    isOverLimit,
    reserveFuel: Math.round(reserveFuel * 100) / 100,
    fuelPerSegment: fuelPerSegment.map(f => Math.round(f * 100) / 100),
    distancePerSegment: distancePerSegment.map(d => Math.round(d * 10) / 10),
  };
};

export const getFuelStatusColor = (isOverLimit: boolean, totalFuel: number, fuelCapacity: number): string => {
  if (isOverLimit) return '#dc2626';
  const usagePercent = (totalFuel / fuelCapacity) * 100;
  if (usagePercent > 80) return '#f59e0b';
  return '#10b981';
};

export const formatFlightTime = (hours: number): string => {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}小时${m}分钟`;
};

export const getFuelRecommendations = (fuelResult: FuelResult): string[] => {
  const recommendations: string[] = [];
  const usagePercent = (fuelResult.totalFuel / fuelResult.fuelCapacity) * 100;

  if (fuelResult.isOverLimit) {
    recommendations.push('⚠️ 燃油需求量超过飞机油箱容量，请调整航线或选择更大航程的飞机');
    recommendations.push('建议：减少航段距离或增加备降机场以分阶段飞行');
  } else if (usagePercent > 90) {
    recommendations.push('⚠️ 燃油使用量接近容量上限，建议重新规划航线或增加备降场');
  } else if (usagePercent > 80) {
    recommendations.push('💡 燃油使用量较高，建议考虑更优的飞行高度以降低油耗');
  }

  if (fuelResult.reserveFuel < fuelResult.fuelCapacity * 0.05) {
    recommendations.push('⚠️ 储备燃油不足10%，建议增加额外的备降机场');
  }

  return recommendations;
};
