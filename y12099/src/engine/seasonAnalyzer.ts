import type { PanelProcessed, Season, SeasonMiss } from '../data/types';

const SEASON_NAMES: Record<Season, string> = {
  spring: '春季',
  summer: '夏季',
  autumn: '秋季',
  winter: '冬季',
};

function getSeasonalIrradiance(season: Season): number {
  const factors: Record<Season, number> = {
    spring: 0.85,
    summer: 1.0,
    autumn: 0.8,
    winter: 0.55,
  };
  return factors[season];
}

function estimateSeasonalGeneration(
  panel: PanelProcessed,
  season: Season,
  hasShadowIssue: boolean
): { gross: number; actual: number; loss: number } {
  const irradiance = getSeasonalIrradiance(season);
  const area = panel.width * panel.height;
  const peakPower = area * 1000 * panel.efficiency;
  const dailyHours = season === 'summer' ? 6 : season === 'winter' ? 3.5 : 5;
  const days = 90;

  const gross = peakPower * dailyHours * days / 1000;
  const shadowFactor = hasShadowIssue ? 0.7 : 1.0;
  const seasonFactor = panel.hasSeasonMiss && season === 'winter' ? 0.8 : 1.0;
  const actual = gross * shadowFactor * seasonFactor;

  return {
    gross,
    actual,
    loss: gross - actual,
  };
}

export function analyzeSeasonMisses(panels: PanelProcessed[]): SeasonMiss[] {
  const misses: SeasonMiss[] = [];
  const seasons: Season[] = ['spring', 'summer', 'autumn', 'winter'];

  for (const panel of panels) {
    if (!panel.hasSeasonMiss) continue;

    for (const season of seasons) {
      const isWinterIssue = panel.y > 0 && season === 'winter';
      const isIssue = isWinterIssue || (panel.hasSeasonMiss && season === 'winter');

      if (isIssue) {
        const generation = estimateSeasonalGeneration(panel, season, true);
        const potentialGain = generation.gross * 0.15;

        misses.push({
          id: `sm-${panel.id}-${season}`,
          panelId: panel.id,
          missedSeason: season,
          suggestion: buildSeasonSuggestion(panel, season, potentialGain),
          energyLossKwh: potentialGain,
        });
      }
    }
  }

  return misses;
}

function buildSeasonSuggestion(panel: PanelProcessed, season: Season, gain: number): string {
  const seasonName = SEASON_NAMES[season];

  if (season === 'winter') {
    if (panel.y > 0) {
      return `${seasonName}太阳高度角低，该组件位于后排，被前排组件/烟囱遮挡。建议：1) 冬季阴影期到来前复核组件间距；2) 若间距<2.5m，考虑将该组件上移0.5m；3) 可考虑优化组件倾角+5°。预计提升${gain.toFixed(1)}kWh。`;
    }
    return `${seasonName}发电估算未考虑低温对组件效率的提升效应，实际发电量可能高于估算。建议：1) 添加温度系数修正（-0.38%/°C）；2) 冬季积雪期要考虑清扫周期。预计修正后精度提升${gain.toFixed(0)}kWh。`;
  }

  if (season === 'summer') {
    return `${seasonName}未考虑高温降额和雷雨天气影响。建议：1) 逆变器效率按96%而非98%估算；2) 增加5%系统损失裕量；3) 检查组件通风间隙是否≥10cm。预计修正后误差减少${gain.toFixed(0)}kWh。`;
  }

  return `${seasonName}是过渡季节，发电估算未考虑天气波动。建议：1) 用TMY气象数据逐时模拟替代典型日；2) 检查组件串联失配损失。预计提升${gain.toFixed(1)}kWh。`;
}

export function calculateEnergyEstimates(
  panels: PanelProcessed[],
  season: Season
): { hour: number; grossKwh: number; shadowLossKwh: number; azimuthLossKwh: number; seasonLossKwh: number; netKwh: number }[] {
  const estimates = [];
  const irradiance = getSeasonalIrradiance(season);
  const azimuthLossFactor = 0.08;
  const seasonLossFactor = 0.05;

  for (let hour = 5; hour <= 19; hour++) {
    const timeFactor = Math.max(0, Math.sin(((hour - 6) / 12) * Math.PI));
    const totalArea = panels.reduce((sum, p) => sum + p.width * p.height, 0);
    const grossKwh = totalArea * 1000 * 0.21 * irradiance * timeFactor / 1000;

    const azimuthPanels = panels.filter((p) => p.hasAzimuthError).length;
    const azimuthLossKwh = azimuthPanels / panels.length * grossKwh * azimuthLossFactor;

    const seasonPanels = panels.filter((p) => p.hasSeasonMiss).length;
    const seasonLossKwh = seasonPanels / panels.length * grossKwh * seasonLossFactor;

    const shadowPanels = panels.filter((p) => p.hasSeasonMiss || p.y > 0).length;
    const shadowFactor = hour < 9 || hour > 16 ? 0.25 : 0.08;
    const shadowLossKwh = shadowPanels / panels.length * grossKwh * shadowFactor;

    const netKwh = grossKwh - shadowLossKwh - azimuthLossKwh - seasonLossKwh;

    estimates.push({
      hour,
      grossKwh: Math.round(grossKwh * 100) / 100,
      shadowLossKwh: Math.round(shadowLossKwh * 100) / 100,
      azimuthLossKwh: Math.round(azimuthLossKwh * 100) / 100,
      seasonLossKwh: Math.round(seasonLossKwh * 100) / 100,
      netKwh: Math.max(0, Math.round(netKwh * 100) / 100),
    });
  }

  return estimates;
}

export function calculateAllSeasonEnergyEstimates(panels: PanelProcessed[]) {
  const seasons: Season[] = ['spring', 'summer', 'autumn', 'winter'];
  return seasons.flatMap((s) => calculateEnergyEstimates(panels, s).map((e) => ({ ...e, season: s })));
}
