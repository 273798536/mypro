import type { Roof, PanelProcessed, Obstacle, DiagnosticResult, Season } from '../data/types';
import { calculateAllSeasons } from './shadowCalculator';
import { checkAzimuthErrors } from './azimuthChecker';
import { analyzeSeasonMisses, calculateAllSeasonEnergyEstimates } from './seasonAnalyzer';

export async function runFullDiagnostic(
  roof: Roof,
  panels: PanelProcessed[],
  obstacles: Obstacle[]
): Promise<DiagnosticResult> {
  await new Promise((resolve) => setTimeout(resolve, 800));

  const shadowRecords = calculateAllSeasons(panels, obstacles);
  const azimuthErrors = checkAzimuthErrors(panels, roof);
  const seasonMisses = analyzeSeasonMisses(panels);
  const energyEstimates = calculateAllSeasonEnergyEstimates(panels);

  return {
    shadowRecords,
    azimuthErrors,
    seasonMisses,
    energyEstimates,
    generatedAt: Date.now(),
  };
}

export function runQuickDiagnostic(
  roof: Roof,
  panels: PanelProcessed[],
  obstacles: Obstacle[],
  season: Season
): DiagnosticResult {
  const shadowRecords = calculateAllSeasons(panels, obstacles).filter((r) => r.season === season);
  const azimuthErrors = checkAzimuthErrors(panels, roof);
  const seasonMisses = analyzeSeasonMisses(panels).filter((m) => m.missedSeason === season);
  const energyEstimates = calculateAllSeasonEnergyEstimates(panels).filter((e) => e.season === season);

  return {
    shadowRecords,
    azimuthErrors,
    seasonMisses,
    energyEstimates,
    generatedAt: Date.now(),
  };
}

export function summarizeIssues(result: DiagnosticResult): {
  totalPanels: number;
  shadowIssues: number;
  azimuthIssues: number;
  seasonIssues: number;
  totalLossKwh: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
} {
  const panelsWithShadow = new Set(result.shadowRecords.filter((r) => r.severity !== 'none').map((r) => r.panelId));
  const panelsWithAzimuth = new Set(result.azimuthErrors.map((e) => e.panelId));
  const panelsWithSeason = new Set(result.seasonMisses.map((m) => m.panelId));

  const criticalCount = result.shadowRecords.filter((r) => r.severity === 'critical').length;
  const highCount = result.shadowRecords.filter((r) => r.severity === 'high').length;
  const mediumCount = result.shadowRecords.filter((r) => r.severity === 'medium').length;

  const totalLoss =
    result.azimuthErrors.reduce((sum, e) => sum + e.energyLossKwh, 0) +
    result.seasonMisses.reduce((sum, m) => sum + m.energyLossKwh, 0) +
    result.shadowRecords.filter((r) => r.severity !== 'none').reduce((sum, r) => sum + r.shadowRatio * 5, 0);

  return {
    totalPanels: new Set([
      ...result.shadowRecords.map((r) => r.panelId),
      ...result.azimuthErrors.map((e) => e.panelId),
      ...result.seasonMisses.map((m) => m.panelId),
    ]).size,
    shadowIssues: panelsWithShadow.size,
    azimuthIssues: panelsWithAzimuth.size,
    seasonIssues: panelsWithSeason.size,
    totalLossKwh: Math.round(totalLoss),
    criticalCount,
    highCount,
    mediumCount,
  };
}
