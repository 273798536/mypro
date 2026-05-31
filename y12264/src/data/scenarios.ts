export interface Scenario {
  id: string;
  name: string;
  description: string;
  difficulty: 'easy' | 'normal' | 'hard';
  rainfallPattern: number[];
  initialHandBias?: string[];
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'normal_rain',
    name: '常规降雨',
    description: '标准降雨模式，适合新手熟悉游戏机制',
    difficulty: 'easy',
    rainfallPattern: [10, 15, 25, 20, 35, 30, 25, 40, 35, 30, 25, 20, 15, 10, 5],
  },
  {
    id: 'storm_surge',
    name: '暴雨来袭',
    description: '中期出现暴雨峰值，考验应急处置能力',
    difficulty: 'normal',
    rainfallPattern: [15, 25, 35, 50, 65, 80, 70, 55, 45, 35, 30, 25, 20, 15, 10],
    initialHandBias: ['pipeline', 'disposal'],
  },
  {
    id: 'extreme_rain',
    name: '极端降雨',
    description: '连续强降雨，极易触发泵站过载',
    difficulty: 'hard',
    rainfallPattern: [30, 50, 70, 90, 110, 100, 85, 75, 80, 70, 55, 45, 35, 25, 15],
    initialHandBias: ['pipeline', 'disposal', 'garden'],
  },
  {
    id: 'pump_overload_drill',
    name: '泵站过载演练',
    description: '专门用于复现泵站过载场景的训练模式',
    difficulty: 'normal',
    rainfallPattern: [20, 40, 60, 85, 95, 75, 60, 45, 55, 70, 65, 50, 35, 25, 15],
  },
];

export function getScenarioById(id: string): Scenario | undefined {
  return SCENARIOS.find(s => s.id === id);
}

export function getDefaultScenario(): Scenario {
  return SCENARIOS[0];
}

export const difficultyColors: Record<string, string> = {
  easy: 'text-emerald-400',
  normal: 'text-yellow-400',
  hard: 'text-red-400',
};

export const difficultyLabels: Record<string, string> = {
  easy: '简单',
  normal: '普通',
  hard: '困难',
};
