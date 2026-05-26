import { useMemo } from 'react';
import { RiskLevel } from '../types';
import { riskToColor, riskToGlowColor, colorToRgb, getGradientColor } from '../utils/colorMapper';

export function useColorMapping() {
  const getColor = useMemo(() => (riskLevel: RiskLevel) => riskToColor(riskLevel), []);
  const getGlowColor = useMemo(() => (riskLevel: RiskLevel) => riskToGlowColor(riskLevel), []);
  const getRgb = useMemo(() => (hex: string) => colorToRgb(hex), []);
  const getGradient = useMemo(() => (ratio: number) => getGradientColor(ratio), []);

  return { getColor, getGlowColor, getRgb, getGradient };
}