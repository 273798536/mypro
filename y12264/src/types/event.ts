export type ClueSource = 'rainfall' | 'pipeline' | 'report' | 'garden';

export interface Clue {
  id: string;
  source: ClueSource;
  content: string;
  cardId: string;
  round: number;
}

export interface EventChain {
  id: string;
  name: string;
  triggerRound: number;
  clues: Clue[];
  relatedRiskId?: string;
}

export const clueSourceLabels: Record<ClueSource, string> = {
  rainfall: '雨量监测',
  pipeline: '管网调度',
  report: '处置报告',
  garden: '花园状态',
};

export const clueSourceColors: Record<ClueSource, string> = {
  rainfall: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50',
  pipeline: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
  report: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
  garden: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50',
};
