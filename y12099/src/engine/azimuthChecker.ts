import type { PanelProcessed, Roof, AzimuthError } from '../data/types';

const AZIMUTH_TOLERANCE = 5;
const LOSS_PER_DEGREE = 0.008;

export function checkAzimuthErrors(panels: PanelProcessed[], roof: Roof): AzimuthError[] {
  const errors: AzimuthError[] = [];

  for (const panel of panels) {
    const expectedAzimuth = roof.azimuth;
    const actualAzimuth = panel.hasAzimuthError
      ? expectedAzimuth + (Math.random() > 0.5 ? 1 : -1) * (5 + Math.random() * 10)
      : expectedAzimuth;

    const deviation = Math.abs(actualAzimuth - expectedAzimuth);

    if (deviation > AZIMUTH_TOLERANCE || panel.hasAzimuthError) {
      const effectiveDeviation = panel.hasAzimuthError ? Math.max(deviation, 6) : deviation;
      const annualLossKwh = effectiveDeviation * LOSS_PER_DEGREE * 390 * 1.2;
      const correctionAngle = expectedAzimuth - actualAzimuth;
      const direction = correctionAngle > 0 ? '顺时针' : '逆时针';
      const absCorrection = Math.abs(correctionAngle).toFixed(1);

      errors.push({
        id: `az-${panel.id}`,
        panelId: panel.id,
        expectedAzimuth,
        actualAzimuth,
        deviation: effectiveDeviation,
        suggestion: `将组件向${direction}旋转${absCorrection}°，与屋顶基准方位角${expectedAzimuth}°对齐。预计年发电量提升${(effectiveDeviation * LOSS_PER_DEGREE * 100).toFixed(1)}%，约${annualLossKwh.toFixed(1)}kWh。`,
        energyLossKwh: annualLossKwh,
      });
    }
  }

  return errors.sort((a, b) => b.deviation - a.deviation);
}

export function isAzimuthDeviationSignificant(deviation: number): boolean {
  return deviation > AZIMUTH_TOLERANCE;
}

export function calculateAzimuthEnergyLoss(deviation: number, panelPower = 390): number {
  return deviation * LOSS_PER_DEGREE * panelPower * 1.2;
}
