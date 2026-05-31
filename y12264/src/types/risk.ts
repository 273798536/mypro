import type { CityStatus } from './city';

export type RiskType = 'pump_overload' | 'low_flooding' | 'green_depleted';

export interface RiskRecord {
  id: string;
  type: RiskType;
  round: number;
  timestamp: number;
  triggerCardId: string | null;
  triggerCardName: string | null;
  bottleneck: string;
  nextStep: string;
  penalty: number;
  citySnapshot: CityStatus;
}

export const riskTypeLabels: Record<RiskType, string> = {
  pump_overload: '泵站过载',
  low_flooding: '低洼积水',
  green_depleted: '绿地容量耗尽',
};

export const riskTypeColors: Record<RiskType, string> = {
  pump_overload: 'text-orange-400 border-orange-400',
  low_flooding: 'text-yellow-400 border-yellow-400',
  green_depleted: 'text-emerald-400 border-emerald-400',
};

export const riskTypeBgColors: Record<RiskType, string> = {
  pump_overload: 'bg-orange-500/10',
  low_flooding: 'bg-yellow-500/10',
  green_depleted: 'bg-emerald-500/10',
};

export const riskTypeIcons: Record<RiskType, string> = {
  pump_overload: 'AlertTriangle',
  low_flooding: 'Waves',
  green_depleted: 'Leaf',
};
