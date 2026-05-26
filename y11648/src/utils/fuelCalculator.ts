import type { Tug, Position } from '../types';

export const calculateDistance = (p1: Position, p2: Position): number => {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

export const calculateFuelConsumption = (
  tug: Tug,
  distance: number,
  taskType: 'moving' | 'working' = 'moving'
): number => {
  const baseConsumption = tug.fuelConsumption;
  const distanceFactor = distance / 1000;
  const typeFactor = taskType === 'working' ? 1.5 : 1.0;
  return baseConsumption * distanceFactor * typeFactor;
};

export const canCompleteTask = (
  tug: Tug,
  startPosition: Position,
  endPosition: Position,
  workingTime: number = 0
): boolean => {
  const distance = calculateDistance(startPosition, endPosition);
  const movingFuel = calculateFuelConsumption(tug, distance, 'moving');
  const workingFuel = (tug.fuelConsumption * workingTime) / 3600000;
  const totalFuel = movingFuel + workingFuel;
  return tug.currentFuel >= totalFuel;
};

export const getFuelStatus = (
  tug: Tug
): 'critical' | 'low' | 'medium' | 'full' => {
  const ratio = tug.currentFuel / tug.fuelCapacity;
  if (ratio < 0.1) return 'critical';
  if (ratio < 0.3) return 'low';
  if (ratio < 0.7) return 'medium';
  return 'full';
};

export const getFuelStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    critical: '#EF4444',
    low: '#F59E0B',
    medium: '#3B82F6',
    full: '#10B981',
  };
  return colors[status] || '#6B7280';
};

export const refuelTug = (tug: Tug, amount: number): Tug => {
  const newFuel = Math.min(tug.currentFuel + amount, tug.fuelCapacity);
  return {
    ...tug,
    currentFuel: newFuel,
  };
};

export const getEstimatedRange = (tug: Tug): number => {
  const hours = tug.currentFuel / tug.fuelConsumption;
  return hours * 20;
};
