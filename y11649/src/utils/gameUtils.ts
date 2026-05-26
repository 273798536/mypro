import type {
  GameDifficulty,
  WeatherCondition,
  Victim,
  Patroller,
  InjuryType,
  SlopeNode,
} from '@/types';
import { injuryData, victimNames } from '@/data/victims';
import { slopeMapData } from '@/data/slopes';
import { weatherData } from '@/data/weather';

const generateId = (): string => {
  return Math.random().toString(36).substring(2, 11);
};

const shuffleArray = <T>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

export const generateWeather = (difficulty: GameDifficulty): WeatherCondition => {
  const weights: Record<GameDifficulty, Record<WeatherCondition, number>> = {
    easy: { sunny: 50, cloudy: 30, 'light-snow': 15, 'heavy-snow': 5, blizzard: 0 },
    normal: { sunny: 30, cloudy: 30, 'light-snow': 25, 'heavy-snow': 13, blizzard: 2 },
    hard: { sunny: 10, cloudy: 20, 'light-snow': 30, 'heavy-snow': 30, blizzard: 10 },
  };

  const weight = weights[difficulty];
  const total = Object.values(weight).reduce((a, b) => a + b, 0);
  let random = Math.random() * total;

  for (const [condition, w] of Object.entries(weight)) {
    random -= w;
    if (random <= 0) return condition as WeatherCondition;
  }

  return 'sunny';
};

export const generateVictims = (difficulty: GameDifficulty): Victim[] => {
  const victimCount = { easy: 3, normal: 5, hard: 7 }[difficulty];
  const availableLocations = slopeMapData
    .filter(n => n.id !== 'base')
    .map(n => n.id);

  const shuffledLocations = shuffleArray(availableLocations);
  const shuffledNames = shuffleArray(victimNames);
  const injuries: InjuryType[] = ['abrasion', 'sprain', 'fracture', 'unconscious', 'cardiac-arrest'];

  const victims: Victim[] = [];

  for (let i = 0; i < victimCount; i++) {
    const injuryIndex = difficulty === 'easy'
      ? Math.floor(Math.random() * 3)
      : difficulty === 'normal'
      ? Math.floor(Math.random() * 4)
      : Math.floor(Math.random() * 5);

    const injury = injuryData[injuryIndex];
    const location = shuffledLocations[i % shuffledLocations.length];
    const timeMultiplier = { easy: 1.5, normal: 1, hard: 0.7 }[difficulty];

    victims.push({
      id: generateId(),
      name: shuffledNames[i % shuffledNames.length],
      location,
      injury: injury.type,
      severity: injury.severity,
      requiredEquipment: [...injury.requiredEquipment],
      timeRemaining: Math.ceil(injury.baseTime * timeMultiplier),
      initialTime: Math.ceil(injury.baseTime * timeMultiplier),
      isRescued: false,
      isFailed: false,
    });
  }

  return victims;
};

export const generatePatrollers = (difficulty: GameDifficulty): Patroller[] => {
  const patrollerCount = { easy: 3, normal: 2, hard: 2 }[difficulty];
  const names = ['张伟', '李娜', '王磊'];

  return Array.from({ length: patrollerCount }, (_, i) => ({
    id: generateId(),
    name: names[i % names.length],
    status: 'idle' as const,
    currentLocation: 'base',
    targetLocation: null,
    equipment: [],
    assignedVictim: null,
    progress: 0,
  }));
};

export const generateSlopeMap = (difficulty: GameDifficulty): SlopeNode[] => {
  const map = slopeMapData.map(node => ({ ...node, isOpen: true }));

  if (difficulty === 'normal') {
    const blackSlopes = map.filter(n => n.difficulty === 'black');
    if (blackSlopes.length > 0 && Math.random() > 0.5) {
      const randomSlope = blackSlopes[Math.floor(Math.random() * blackSlopes.length)];
      randomSlope.isOpen = false;
    }
  } else if (difficulty === 'hard') {
    const highDifficulty = map.filter(n => n.difficulty === 'black' || n.difficulty === 'double-black');
    const closedCount = Math.min(2, highDifficulty.length);
    const shuffled = shuffleArray(highDifficulty);
    for (let i = 0; i < closedCount; i++) {
      const node = map.find(n => n.id === shuffled[i].id);
      if (node) node.isOpen = false;
    }
  }

  return map;
};

export const getGameTimeLimit = (difficulty: GameDifficulty): number => {
  return { easy: 600, normal: 480, hard: 360 }[difficulty];
};

export const getWeatherModifier = (condition: WeatherCondition): number => {
  return weatherData.find(w => w.condition === condition)?.speedModifier || 1;
};
