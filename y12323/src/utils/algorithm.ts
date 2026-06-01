import { Employee, Station, Assignment, OverflowRecord, AlgorithmResult } from '@/types';

export function calculateDistance(
  lat1: number, lon1: number, lat2: number, lon2: number
): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

interface ScheduleParameters {
  maxWalkingDistance: number;
  minStationEmployees: number;
  costPerStation: number;
}

export function runIntegerPlanning(
  employees: Employee[],
  stations: Station[],
  params: ScheduleParameters,
  planId: string
): AlgorithmResult {
  const activeEmployees = employees.filter(e => e.status === 'active');
  const candidateStations = stations.filter(s => s.status !== 'closed');
  
  const assignments: Assignment[] = [];
  const stationUsage: Map<string, number> = new Map();
  const overflowRecords: OverflowRecord[] = [];
  let totalDistance = 0;
  
  candidateStations.forEach(s => stationUsage.set(s.id, 0));
  
  const employeeDistances = activeEmployees.map(employee => {
    const distances = candidateStations.map(station => ({
      stationId: station.id,
      distance: calculateDistance(
        employee.latitude, employee.longitude,
        station.latitude, station.longitude
      ),
      capacity: station.capacity,
    })).filter(d => d.distance <= params.maxWalkingDistance)
      .sort((a, b) => a.distance - b.distance);
    
    return { employeeId: employee.id, distances };
  });
  
  employeeDistances.forEach(({ employeeId, distances }) => {
    let assigned = false;
    
    for (const { stationId, distance, capacity } of distances) {
      const currentUsage = stationUsage.get(stationId) || 0;
      
      if (currentUsage < capacity) {
        stationUsage.set(stationId, currentUsage + 1);
        assignments.push({
          id: `assign-${employeeId}-${stationId}`,
          employeeId,
          stationId,
          planId,
          distance,
          routeOrder: currentUsage + 1,
        });
        totalDistance += distance;
        assigned = true;
        break;
      }
    }
    
    if (!assigned && distances.length > 0) {
      const nearestStation = distances[0];
      const station = candidateStations.find(s => s.id === nearestStation.stationId)!;
      const currentUsage = stationUsage.get(nearestStation.stationId) || 0;
      const overflowCount = currentUsage - station.capacity + 1;
      
      stationUsage.set(nearestStation.stationId, currentUsage + 1);
      assignments.push({
        id: `assign-${employeeId}-${nearestStation.stationId}`,
        employeeId,
        stationId: nearestStation.stationId,
        planId,
        distance: nearestStation.distance,
        routeOrder: currentUsage + 1,
      });
      totalDistance += nearestStation.distance;
      
      if (overflowCount > 0) {
        overflowRecords.push({
          id: `overflow-${planId}-${nearestStation.stationId}-${Date.now()}`,
          planId,
          stationId: nearestStation.stationId,
          overflowCount,
          createdAt: new Date().toISOString(),
          remark: `站点容量超限 ${overflowCount} 人`,
          isResolved: false,
        });
      }
    }
  });
  
  const selectedStations: string[] = [];
  stationUsage.forEach((count, stationId) => {
    if (count >= params.minStationEmployees) {
      selectedStations.push(stationId);
    }
  });
  
  const stationCost = selectedStations.length * params.costPerStation;
  const distanceCost = totalDistance * 10;
  const totalCost = stationCost + distanceCost;
  
  return {
    planId,
    selectedStations,
    assignments,
    totalCost,
    totalDistance,
    overflowRecords,
  };
}
