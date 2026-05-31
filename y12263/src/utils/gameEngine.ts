
import { Waypoint, WindZone, WindType, EnergyLog, Violation } from '@/types';
import { WIND_EFFECTS } from '@/constants';

export function calculateDistance(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

export function getWindAtPosition(position: { x: number; y: number }, windZones: WindZone[]): { type: WindType; speed: number; zone: WindZone | null } {
  for (const zone of windZones) {
    const dist = calculateDistance(position, { x: zone.x, y: zone.y });
    if (dist <= zone.radius) {
      return { type: zone.type, speed: zone.speed, zone };
    }
  }
  return { type: 'calm', speed: 0, zone: null };
}

export function calculateEnergyConsumption(
  baseConsumption: number,
  windType: WindType,
  speed: number,
  windSpeed: number
): number {
  const effect = WIND_EFFECTS[windType];
  const windFactor = 1 + (windSpeed / 5) * (effect.consumptionMultiplier - 1);
  return baseConsumption * windFactor * (speed / 10);
}

export function calculateActualSpeed(baseSpeed: number, windType: WindType, windSpeed: number): number {
  const effect = WIND_EFFECTS[windType];
  const windFactor = 1 + (windSpeed / 5) * (effect.speedMultiplier - 1);
  return baseSpeed * windFactor;
}

export function calculateReturnEnergyRequired(
  currentPosition: { x: number; y: number },
  startPosition: { x: number; y: number },
  windZones: WindZone[],
  baseConsumption: number,
  cruiseSpeed: number
): { energy: number; safetyMargin: number; hasHeadwindRisk: boolean } {
  const distance = calculateDistance(currentPosition, startPosition);
  const midPoint = {
    x: (currentPosition.x + startPosition.x) / 2,
    y: (currentPosition.y + startPosition.y) / 2
  };
  
  const windAtMid = getWindAtPosition(midPoint, windZones);
  const hasHeadwindRisk = windAtMid.type === 'headwind' && windAtMid.speed >= 3;
  
  const avgWindEffect = WIND_EFFECTS[windAtMid.type].consumptionMultiplier;
  const baseEnergy = (distance / cruiseSpeed) * baseConsumption;
  const adjustedEnergy = baseEnergy * avgWindEffect;
  const safetyMargin = hasHeadwindRisk ? 0.35 : 0.20;
  
  return {
    energy: adjustedEnergy * (1 + safetyMargin),
    safetyMargin: safetyMargin * 100,
    hasHeadwindRisk
  };
}

export function checkPathEfficiency(waypoints: Waypoint[]): { isEfficient: boolean; violations: Violation[] } {
  const violations: Violation[] = [];
  
  if (waypoints.length > 8) {
    violations.push({
      id: `viol-${Date.now()}-wp`,
      type: 'inefficient_path',
      description: `航点数量过多(${waypoints.length}个)，建议控制在8个以内`,
      penalty: 10,
      ruleReference: 'R003',
      timestamp: Date.now(),
      highlighted: false
    });
  }
  
  let totalDistance = 0;
  for (let i = 1; i < waypoints.length; i++) {
    totalDistance += calculateDistance(waypoints[i - 1], waypoints[i]);
  }
  
  const directDistance = calculateDistance(waypoints[0], waypoints[waypoints.length - 1]);
  if (totalDistance > directDistance * 1.5 && waypoints.length > 2) {
    violations.push({
      id: `viol-${Date.now()}-dist`,
      type: 'inefficient_path',
      description: '航线绕路明显，总距离是直线距离的1.5倍以上',
      penalty: 10,
      ruleReference: 'R003',
      timestamp: Date.now(),
      highlighted: false
    });
  }
  
  return { isEfficient: violations.length === 0, violations };
}

export function checkHeadwindExposure(energyLogs: EnergyLog[]): { hasExcessiveHeadwind: boolean; violations: Violation[] } {
  const headwindLogs = energyLogs.filter(log => log.windType === 'headwind' && log.windSpeed >= 3);
  const headwindDuration = headwindLogs.length;
  const totalDuration = energyLogs.length;
  
  if (totalDuration === 0) return { hasExcessiveHeadwind: false, violations: [] };
  
  const headwindRatio = headwindDuration / totalDuration;
  const violations: Violation[] = [];
  
  if (headwindRatio > 0.3) {
    violations.push({
      id: `viol-${Date.now()}-hw`,
      type: 'headwind_ignored',
      description: `逆风暴露时间过长(${Math.round(headwindRatio * 100)}%)，建议调整航线避开强逆风区`,
      penalty: 15,
      ruleReference: 'R001',
      timestamp: Date.now(),
      highlighted: true
    });
  }
  
  return { hasExcessiveHeadwind: violations.length > 0, violations };
}

export function checkReturnMargin(
  currentBattery: number,
  maxBattery: number,
  requiredEnergy: number,
  hasHeadwindRisk: boolean
): { hasSufficientMargin: boolean; violations: Violation[] } {
  const batteryLevel = currentBattery / maxBattery;
  const requiredRatio = requiredEnergy / maxBattery;
  const violations: Violation[] = [];
  
  if (batteryLevel < requiredRatio) {
    violations.push({
      id: `viol-${Date.now()}-rm`,
      type: 'insufficient_return',
      description: `返航电量不足！当前电量${Math.round(batteryLevel * 100)}%，需要${Math.round(requiredRatio * 100)}%${hasHeadwindRisk ? '(逆风条件下需35%安全余量)' : ''}`,
      penalty: 20,
      ruleReference: 'R002',
      timestamp: Date.now(),
      highlighted: false
    });
  }
  
  return { hasSufficientMargin: violations.length === 0, violations };
}

export function calculateScore(
  baseScore: number,
  violations: Violation[],
  energyEfficiency: number
): number {
  let score = baseScore;
  
  for (const violation of violations) {
    score -= violation.penalty;
  }
  
  score = Math.round(score * (0.5 + energyEfficiency * 0.5));
  
  return Math.max(0, Math.min(100, score));
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export function formatTime(date: Date): string {
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}
