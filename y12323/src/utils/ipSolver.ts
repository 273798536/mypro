export interface IPVariable {
  name: string;
  value: number;
  lowerBound: number;
  upperBound: number;
  isInteger: boolean;
}

export interface IPConstraint {
  name: string;
  coefficients: { varName: string; coeff: number }[];
  sense: 'le' | 'eq' | 'ge';
  rhs: number;
}

export interface IPModel {
  variables: IPVariable[];
  objective: { varName: string; coeff: number }[];
  objectiveSense: 'min';
  constraints: IPConstraint[];
}

export interface IPSolution {
  feasible: boolean;
  optimal: boolean;
  objectiveValue: number;
  variables: Map<string, number>;
  gap: number;
}

export interface FacilityLocationResult {
  feasible: boolean;
  optimal: boolean;
  openStations: string[];
  assignments: { employeeId: string; stationId: string }[];
  totalCost: number;
  stationCost: number;
  distanceCost: number;
  totalDistance: number;
  gap: number;
  isFeasible: boolean;
  overflowStations: { stationId: string; overflow: number }[];
  unassignedEmployees: string[];
}

export interface MultiPlanResult {
  plans: FacilityLocationResult[];
  best: FacilityLocationResult | null;
  solveTimeMs: number;
  nodesExplored: number;
}

interface CostMatrix {
  employeeIds: string[];
  stationIds: string[];
  costs: number[][];
  capacities: number[];
  openCosts: number[];
}

function buildCostMatrix(
  employeeIds: string[],
  stationIds: string[],
  empCoords: Map<string, [number, number]>,
  staCoords: Map<string, [number, number]>,
  staCapacities: Map<string, number>,
  openCosts: Map<string, number>,
  maxDist: number
): CostMatrix {
  const costs: number[][] = [];
  const capacities: number[] = [];
  const oc: number[] = [];

  for (const eid of employeeIds) {
    const row: number[] = [];
    const [elat, elon] = empCoords.get(eid) || [0, 0];
    for (const sid of stationIds) {
      const [slat, slon] = staCoords.get(sid) || [0, 0];
      const d = haversine(elat, elon, slat, slon);
      row.push(d <= maxDist ? d * 10 : Infinity);
    }
    costs.push(row);
  }

  for (const sid of stationIds) {
    capacities.push(staCapacities.get(sid) || 0);
    oc.push(openCosts.get(sid) || 0);
  }

  return { employeeIds, stationIds, costs, capacities, openCosts: oc };
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function solveAssignmentWithCapacities(
  cm: CostMatrix,
  openMask: boolean[],
  minStationEmployees: number
): { assignments: { employeeId: string; stationId: string }[]; totalDist: number; overflows: { stationId: string; overflow: number }[]; unassigned: string[] } {
  const openIndices = cm.stationIds
    .map((_, i) => i)
    .filter(i => openMask[i]);

  if (openIndices.length === 0) {
    return {
      assignments: [],
      totalDist: 0,
      overflows: [],
      unassigned: [...cm.employeeIds],
    };
  }

  const openCaps = openIndices.map(i => cm.capacities[i]);
  const usage = new Array(openIndices.length).fill(0) as number[];
  const assignments: { employeeId: string; stationId: string }[] = [];
  const overflows: { stationId: string; overflow: number }[] = [];
  const unassigned: string[] = [];
  let totalDist = 0;

  const empOrder = cm.employeeIds.map((eid, ei) => {
    let bestCost = Infinity;
    for (const oi of openIndices) {
      if (cm.costs[ei][oi] < bestCost) bestCost = cm.costs[ei][oi];
    }
    return { eid, ei, bestCost };
  }).sort((a, b) => a.bestCost - b.bestCost);

  for (const { eid, ei } of empOrder) {
    const candidates = openIndices
      .map((si, localIdx) => ({
        si,
        localIdx,
        cost: cm.costs[ei][si],
        remaining: openCaps[localIdx] - usage[localIdx],
      }))
      .filter(c => c.cost < Infinity)
      .sort((a, b) => {
        if (a.remaining > 0 && b.remaining <= 0) return -1;
        if (a.remaining <= 0 && b.remaining > 0) return 1;
        return a.cost - b.cost;
      });

    if (candidates.length === 0) {
      unassigned.push(eid);
      continue;
    }

    const best = candidates[0];
    assignments.push({ employeeId: eid, stationId: cm.stationIds[best.si] });
    totalDist += best.cost;
    usage[best.localIdx]++;
  }

  for (let li = 0; li < openIndices.length; li++) {
    if (usage[li] > openCaps[li]) {
      overflows.push({
        stationId: cm.stationIds[openIndices[li]],
        overflow: usage[li] - openCaps[li],
      });
    }
  }

  return { assignments, totalDist, overflows, unassigned };
}

function evaluateSubset(
  cm: CostMatrix,
  openMask: boolean[],
  minStationEmployees: number
): FacilityLocationResult {
  const { assignments, totalDist, overflows, unassigned } =
    solveAssignmentWithCapacities(cm, openMask, minStationEmployees);

  const openStationIds = cm.stationIds
    .filter((_, i) => openMask[i]);

  const stationCost = openStationIds.reduce(
    (sum, _, i) => {
      const globalIdx = cm.stationIds.indexOf(openStationIds[i]);
      return sum + cm.openCosts[globalIdx];
    },
    0
  );

  const feasible = unassigned.length === 0 && overflows.length === 0;
  const totalCost = stationCost + totalDist;

  return {
    feasible,
    optimal: false,
    openStations: openStationIds,
    assignments,
    totalCost,
    stationCost,
    distanceCost: totalDist,
    totalDistance: totalDist / 10,
    gap: 0,
    isFeasible: feasible,
    overflowStations: overflows,
    unassignedEmployees: unassigned,
  };
}

function lPRelaxationLowerBound(
  cm: CostMatrix,
  remainingMask: boolean[],
  fixedOpen: number[],
  fixedClosed: number[],
  bestKnown: number
): number {
  let bound = 0;
  for (const i of fixedOpen) {
    bound += cm.openCosts[i];
  }

  for (let ei = 0; ei < cm.employeeIds.length; ei++) {
    let minCost = Infinity;
    for (const si of fixedOpen) {
      if (cm.costs[ei][si] < minCost) minCost = cm.costs[ei][si];
    }

    for (let si = 0; si < cm.stationIds.length; si++) {
      if (fixedOpen.includes(si) || fixedClosed.includes(si)) continue;
      if (!remainingMask[si]) continue;
      const fracOpenCost = cm.openCosts[si] / Math.max(1, cm.capacities[si]);
      const effectiveCost = cm.costs[ei][si] + fracOpenCost;
      if (effectiveCost < minCost) minCost = effectiveCost;
    }

    if (minCost < Infinity) {
      bound += minCost;
    }
  }

  return bound;
}

export function solveFacilityLocation(
  employeeIds: string[],
  stationIds: string[],
  empCoords: Map<string, [number, number]>,
  staCoords: Map<string, [number, number]>,
  staCapacities: Map<string, number>,
  openCosts: Map<string, number>,
  maxDist: number,
  minStationEmployees: number,
  maxPlans: number = 5,
  maxNodes: number = 5000
): MultiPlanResult {
  const startTime = performance.now();

  if (stationIds.length === 0 || employeeIds.length === 0) {
    return { plans: [], best: null, solveTimeMs: 0, nodesExplored: 0 };
  }

  const cm = buildCostMatrix(
    employeeIds, stationIds,
    empCoords, staCoords, staCapacities, openCosts, maxDist
  );

  const n = stationIds.length;
  const topPlans: FacilityLocationResult[] = [];
  let nodesExplored = 0;

  function addPlan(plan: FacilityLocationResult) {
    topPlans.push(plan);
    topPlans.sort((a, b) => a.totalCost - b.totalCost);
    if (topPlans.length > maxPlans) topPlans.length = maxPlans;
  }

  if (n <= 20) {
    const totalSubsets = 1 << n;

    for (let mask = 1; mask < totalSubsets; mask++) {
      nodesExplored++;
      if (nodesExplored > maxNodes) break;

      const openMask: boolean[] = [];
      let openCount = 0;
      for (let i = 0; i < n; i++) {
        const isOpen = (mask & (1 << i)) !== 0;
        openMask.push(isOpen);
        if (isOpen) openCount++;
      }

      if (openCount === 0) continue;

      let totalCapacity = 0;
      for (let i = 0; i < n; i++) {
        if (openMask[i]) totalCapacity += cm.capacities[i];
      }
      if (totalCapacity < employeeIds.length) continue;

      if (topPlans.length >= maxPlans) {
        const lb = lPRelaxationLowerBound(
          cm,
          Array(n).fill(true),
          Array.from({ length: n }, (_, i) => i).filter(i => openMask[i]),
          [],
          topPlans[topPlans.length - 1].totalCost
        );
        if (lb >= topPlans[topPlans.length - 1].totalCost) continue;
      }

      const result = evaluateSubset(cm, openMask, minStationEmployees);
      addPlan(result);
    }
  } else {
    const branchAndBound = (
      depth: number,
      openMask: boolean[],
      fixedOpen: number[],
      fixedClosed: number[]
    ) => {
      nodesExplored++;
      if (nodesExplored > maxNodes) return;

      const lb = lPRelaxationLowerBound(
        cm,
        Array(n).fill(true),
        fixedOpen,
        fixedClosed,
        topPlans.length > 0 ? topPlans[0].totalCost : Infinity
      );

      if (topPlans.length > 0 && lb >= topPlans[0].totalCost) return;

      if (depth === n) {
        if (fixedOpen.length === 0) return;
        const result = evaluateSubset(cm, openMask, minStationEmployees);
        addPlan(result);
        return;
      }

      openMask[depth] = true;
      branchAndBound(depth + 1, openMask, [...fixedOpen, depth], fixedClosed);

      openMask[depth] = false;
      branchAndBound(depth + 1, openMask, fixedOpen, [...fixedClosed, depth]);
    };

    const openMask = new Array(n).fill(false) as boolean[];
    branchAndBound(0, openMask, [], []);
  }

  const solveTimeMs = performance.now() - startTime;

  if (topPlans.length === 0) {
    const allOpenMask = new Array(n).fill(true) as boolean[];
    const fallback = evaluateSubset(cm, allOpenMask, minStationEmployees);
    return {
      plans: [fallback],
      best: fallback,
      solveTimeMs,
      nodesExplored,
    };
  }

  const best = topPlans[0];
  best.optimal = true;
  best.gap = 0;

  for (let i = 1; i < topPlans.length; i++) {
    topPlans[i].gap = best.totalCost > 0
      ? ((topPlans[i].totalCost - best.totalCost) / best.totalCost) * 100
      : 0;
  }

  return { plans: topPlans, best, solveTimeMs, nodesExplored };
}
