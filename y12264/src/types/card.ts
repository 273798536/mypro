export type CardType = 'rainfall' | 'pipeline' | 'disposal' | 'garden';

export type CardRarity = 'common' | 'rare' | 'epic';

export interface Card {
  id: string;
  type: CardType;
  name: string;
  description: string;
  value: number;
  rarity: CardRarity;
}

export const cardTypeLabels: Record<CardType, string> = {
  rainfall: '雨量卡',
  pipeline: '管网卡',
  disposal: '处置卡',
  garden: '雨水花园卡',
};

export const cardRarityColors: Record<CardRarity, string> = {
  common: 'from-gray-500 to-gray-600',
  rare: 'from-blue-500 to-blue-600',
  epic: 'from-purple-500 to-purple-600',
};

export const cardTypeColors: Record<CardType, string> = {
  rainfall: 'border-cyan-400 bg-cyan-950/50',
  pipeline: 'border-orange-400 bg-orange-950/50',
  disposal: 'border-yellow-400 bg-yellow-950/50',
  garden: 'border-emerald-400 bg-emerald-950/50',
};

export const cardTypeBgColors: Record<CardType, string> = {
  rainfall: 'bg-gradient-to-br from-cyan-900 to-blue-950',
  pipeline: 'bg-gradient-to-br from-orange-900 to-amber-950',
  disposal: 'bg-gradient-to-br from-yellow-900 to-orange-950',
  garden: 'bg-gradient-to-br from-emerald-900 to-teal-950',
};
