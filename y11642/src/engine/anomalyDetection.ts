import { DROUGHT_PENALTY, OVERWATER_PENALTY, EVAPORATION_PENALTY } from '../data/constants';
import type { Plot, Anomaly } from '../types';

export function detectAnomalies(
  plots: Plot[],
  previousPlots: Plot[],
  round: number,
  evaporationLoss: number
): { anomalies: Anomaly[]; totalPenalty: number } {
  const anomalies: Anomaly[] = [];
  let totalPenalty = 0;

  plots.forEach((plot, index) => {
    const prevPlot = previousPlots[index];

    if (plot.waterCurrent < plot.waterRequired * 0.5 && !plot.isWatered) {
      const droughtAnomaly: Anomaly = {
        type: 'drought',
        message: `警告：${plot.name}（${plot.cropType}）严重缺水！当前水量仅为${plot.waterCurrent}，需水量${plot.waterRequired}`,
        round,
        plotId: plot.id,
        timestamp: Date.now()
      };
      anomalies.push(droughtAnomaly);
      totalPenalty += DROUGHT_PENALTY;
    }

    if (plot.overwateredCount > prevPlot.overwateredCount) {
      const overwaterAnomaly: Anomaly = {
        type: 'overwater',
        message: `警告：${plot.name}（${plot.cropType}）被重复灌溉！当前水量${plot.waterCurrent}，超过需水量${plot.waterRequired}`,
        round,
        plotId: plot.id,
        timestamp: Date.now()
      };
      anomalies.push(overwaterAnomaly);
      totalPenalty += OVERWATER_PENALTY;
    }
  });

  if (evaporationLoss > 0) {
    const evaporationAnomaly: Anomaly = {
      type: 'evaporation',
      message: `蒸发损失：本回合蒸发损失水量${evaporationLoss}单位`,
      round,
      timestamp: Date.now()
    };
    anomalies.push(evaporationAnomaly);
    totalPenalty += Math.round(evaporationLoss * EVAPORATION_PENALTY / 10);
  }

  return { anomalies, totalPenalty };
}
