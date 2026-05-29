import type { Simulation, SimulationComparison, CoverageResult } from '../types';

export function compareSimulations(
  sim1: Simulation,
  sim2: Simulation
): SimulationComparison {
  const changedBuildings: string[] = [];
  const responseTimeDiff = new Map<string, number>();
  const newBlindSpots: string[] = [];
  const resolvedBlindSpots: string[] = [];

  const results1 = new Map<string, CoverageResult>();
  sim1.results.forEach((r) => results1.set(r.buildingId, r));

  const results2 = new Map<string, CoverageResult>();
  sim2.results.forEach((r) => results2.set(r.buildingId, r));

  const allBuildingIds = new Set([
    ...results1.keys(),
    ...results2.keys(),
  ]);

  allBuildingIds.forEach((buildingId) => {
    const r1 = results1.get(buildingId);
    const r2 = results2.get(buildingId);

    if (!r1 || !r2) return;

    if (r1.responseTime !== r2.responseTime) {
      changedBuildings.push(buildingId);
      responseTimeDiff.set(buildingId, r2.responseTime - r1.responseTime);
    }

    if (!r1.isBlind && r2.isBlind) {
      newBlindSpots.push(buildingId);
    }

    if (r1.isBlind && !r2.isBlind) {
      resolvedBlindSpots.push(buildingId);
    }
  });

  return {
    changedBuildings,
    responseTimeDiff,
    newBlindSpots,
    resolvedBlindSpots,
  };
}

export function getComparisonStatistics(comparison: SimulationComparison) {
  const improvedBuildings: string[] = [];
  const worsenedBuildings: string[] = [];

  comparison.responseTimeDiff.forEach((diff, buildingId) => {
    if (diff < 0) {
      improvedBuildings.push(buildingId);
    } else if (diff > 0) {
      worsenedBuildings.push(buildingId);
    }
  });

  const avgImprovement =
    improvedBuildings.length > 0
      ? improvedBuildings.reduce(
          (sum, id) => sum + Math.abs(comparison.responseTimeDiff.get(id) || 0),
          0
        ) / improvedBuildings.length
      : 0;

  const avgWorsening =
    worsenedBuildings.length > 0
      ? worsenedBuildings.reduce(
          (sum, id) => sum + (comparison.responseTimeDiff.get(id) || 0),
          0
        ) / worsenedBuildings.length
      : 0;

  return {
    improvedCount: improvedBuildings.length,
    worsenedCount: worsenedBuildings.length,
    avgImprovement,
    avgWorsening,
    newBlindCount: comparison.newBlindSpots.length,
    resolvedBlindCount: comparison.resolvedBlindSpots.length,
  };
}
