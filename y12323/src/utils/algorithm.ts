import { Employee, Station, Assignment, OverflowRecord, AlgorithmResult } from '@/types';
import { solveFacilityLocation, FacilityLocationResult, MultiPlanResult } from './ipSolver';

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

export interface ExtendedAlgorithmResult extends AlgorithmResult {
  isFeasible: boolean;
  gap: number;
  optimal: boolean;
  stationCost: number;
  distanceCost: number;
  unassignedEmployees: string[];
  solveTimeMs: number;
  nodesExplored: number;
  alternativePlans: AlgorithmResult[];
}

function facilityResultToAlgorithmResult(
  fr: FacilityLocationResult,
  planId: string,
  employees: Employee[],
  stations: Station[]
): AlgorithmResult {
  const assignments: Assignment[] = [];
  const stationUsage: Map<string, number> = new Map();

  for (const a of fr.assignments) {
    const currentUsage = stationUsage.get(a.stationId) || 0;
    stationUsage.set(a.stationId, currentUsage + 1);

    const emp = employees.find(e => e.id === a.employeeId);
    const sta = stations.find(s => s.id === a.stationId);
    const distance = emp && sta
      ? calculateDistance(emp.latitude, emp.longitude, sta.latitude, sta.longitude)
      : 0;

    assignments.push({
      id: `assign-${a.employeeId}-${a.stationId}`,
      employeeId: a.employeeId,
      stationId: a.stationId,
      planId,
      distance,
      routeOrder: currentUsage + 1,
    });
  }

  const overflowRecords: OverflowRecord[] = fr.overflowStations.map((os: { stationId: string; overflow: number }) => ({
    id: `overflow-${planId}-${os.stationId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    planId,
    stationId: os.stationId,
    overflowCount: os.overflow,
    createdAt: new Date().toISOString(),
    remark: `站点容量超限 ${os.overflow} 人`,
    isResolved: false,
  }));

  return {
    planId,
    selectedStations: fr.openStations,
    assignments,
    totalCost: fr.totalCost,
    totalDistance: fr.totalDistance,
    overflowRecords,
  };
}

export function runIntegerPlanning(
  employees: Employee[],
  stations: Station[],
  params: ScheduleParameters,
  planId: string
): ExtendedAlgorithmResult {
  const activeEmployees = employees.filter(e => e.status === 'active' && e.latitude !== 0 && e.longitude !== 0);
  const candidateStations = stations.filter(s => s.status !== 'closed');

  if (activeEmployees.length === 0 || candidateStations.length === 0) {
    return {
      planId,
      selectedStations: [],
      assignments: [],
      totalCost: 0,
      totalDistance: 0,
      overflowRecords: [],
      isFeasible: false,
      gap: Infinity,
      optimal: false,
      stationCost: 0,
      distanceCost: 0,
      unassignedEmployees: employees.map(e => e.id),
      solveTimeMs: 0,
      nodesExplored: 0,
      alternativePlans: [],
    };
  }

  const employeeIds = activeEmployees.map(e => e.id);
  const stationIds = candidateStations.map(s => s.id);

  const empCoords = new Map<string, [number, number]>();
  for (const e of activeEmployees) {
    empCoords.set(e.id, [e.latitude, e.longitude]);
  }

  const staCoords = new Map<string, [number, number]>();
  const staCapacities = new Map<string, number>();
  const openCosts = new Map<string, number>();

  for (const s of candidateStations) {
    staCoords.set(s.id, [s.latitude, s.longitude]);
    staCapacities.set(s.id, s.capacity);
    openCosts.set(s.id, params.costPerStation);
  }

  const multiResult: MultiPlanResult = solveFacilityLocation(
    employeeIds,
    stationIds,
    empCoords,
    staCoords,
    staCapacities,
    openCosts,
    params.maxWalkingDistance,
    params.minStationEmployees,
    5,
    5000
  );

  const best = multiResult.best;
  if (!best) {
    return {
      planId,
      selectedStations: [],
      assignments: [],
      totalCost: 0,
      totalDistance: 0,
      overflowRecords: [],
      isFeasible: false,
      gap: Infinity,
      optimal: false,
      stationCost: 0,
      distanceCost: 0,
      unassignedEmployees: employeeIds,
      solveTimeMs: multiResult.solveTimeMs,
      nodesExplored: multiResult.nodesExplored,
      alternativePlans: [],
    };
  }

  const mainResult = facilityResultToAlgorithmResult(best, planId, activeEmployees, candidateStations);

  const alternativePlans: AlgorithmResult[] = multiResult.plans
    .slice(1)
    .map((fr: FacilityLocationResult, idx: number) => facilityResultToAlgorithmResult(fr, `${planId}-alt-${idx + 1}`, activeEmployees, candidateStations));

  return {
    ...mainResult,
    isFeasible: best.isFeasible,
    gap: best.gap,
    optimal: best.optimal,
    stationCost: best.stationCost,
    distanceCost: best.distanceCost,
    unassignedEmployees: best.unassignedEmployees,
    solveTimeMs: multiResult.solveTimeMs,
    nodesExplored: multiResult.nodesExplored,
    alternativePlans,
  };
}
