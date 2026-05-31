import type { Level } from '../types';

export const LEVELS: Level[] = [
  {
    id: 'level_1',
    name: '大调入门',
    description: '识别基本大调音阶，熟悉升降号规则。重点练习升降号识别。',
    difficulty: 'easy',
    totalWaves: 5,
    initialLives: 10,
    initialGold: 100,
    availableTowers: ['major_tower'],
    scaleTypes: ['major'],
    errorTypes: ['accidental_miss', 'tower_late'],
    path: [
      {x: 0, y: 2}, {x: 1, y: 2}, {x: 2, y: 2}, {x: 2, y: 3},
      {x: 3, y: 3}, {x: 4, y: 3}, {x: 4, y: 2}, {x: 5, y: 2},
      {x: 6, y: 2}, {x: 7, y: 2}
    ],
    towerSlots: [
      {x: 1, y: 1}, {x: 1, y: 3}, {x: 3, y: 2}, {x: 3, y: 4},
      {x: 5, y: 1}, {x: 5, y: 3}, {x: 6, y: 1}, {x: 6, y: 3}
    ],
    waves: [
      { monsters: 3, interval: 3000, keys: ['C', 'G', 'F'] },
      { monsters: 4, interval: 2800, keys: ['D', 'Bb', 'A', 'Eb'] },
      { monsters: 5, interval: 2500, keys: ['C', 'G', 'D', 'F', 'Bb'] },
      { monsters: 5, interval: 2200, keys: ['A', 'E', 'Ab', 'Db'] },
      { monsters: 6, interval: 2000, keys: ['C', 'G', 'D', 'A', 'F', 'Bb'] }
    ]
  },
  {
    id: 'level_2',
    name: '小调挑战',
    description: '区分自然小调和和声小调，识别同名调。练习区分C#大调和Db大调等容易混淆的调。',
    difficulty: 'medium',
    totalWaves: 6,
    initialLives: 8,
    initialGold: 150,
    availableTowers: ['major_tower', 'minor_tower'],
    scaleTypes: ['major', 'natural_minor', 'harmonic_minor'],
    errorTypes: ['accidental_miss', 'enharmonic_confusion', 'tower_late'],
    path: [
      {x: 0, y: 3}, {x: 1, y: 3}, {x: 1, y: 2}, {x: 2, y: 2},
      {x: 3, y: 2}, {x: 3, y: 3}, {x: 4, y: 3}, {x: 4, y: 2},
      {x: 5, y: 2}, {x: 6, y: 2}, {x: 6, y: 3}, {x: 7, y: 3}
    ],
    towerSlots: [
      {x: 0, y: 2}, {x: 2, y: 1}, {x: 2, y: 3}, {x: 4, y: 1},
      {x: 4, y: 4}, {x: 5, y: 3}, {x: 7, y: 2}, {x: 7, y: 4}
    ],
    waves: [
      { monsters: 4, interval: 2800, keys: ['Am', 'Em', 'Dm', 'C'] },
      { monsters: 5, interval: 2500, keys: ['G', 'Bm', 'F#m', 'A', 'F'] },
      { monsters: 5, interval: 2200, keys: ['D', 'Bbm', 'Gm', 'E', 'Cm'] },
      { monsters: 6, interval: 2000, keys: ['C#', 'Db', 'Gb', 'F#', 'F', 'Bb'] },
      { monsters: 6, interval: 1800, keys: ['Am', 'Em', 'Bm', 'F#m', 'C#m', 'G#m'] },
      { monsters: 7, interval: 1600, keys: ['C', 'G', 'Am', 'Em', 'F', 'Dm', 'Bbm'] }
    ]
  },
  {
    id: 'level_3',
    name: '和弦归属',
    description: '综合判定音阶、调式和和弦归属，处理时序冲突。和弦怪会故意携带错误归属的和弦，调式塔可能晚到，需要你正确判断先后顺序。',
    difficulty: 'hard',
    totalWaves: 8,
    initialLives: 5,
    initialGold: 200,
    availableTowers: ['major_tower', 'minor_tower', 'modal_tower'],
    scaleTypes: ['major', 'natural_minor', 'harmonic_minor', 'melodic_minor'],
    errorTypes: ['accidental_miss', 'enharmonic_confusion', 'chord_misattribution', 'tower_late'],
    path: [
      {x: 0, y: 1}, {x: 1, y: 1}, {x: 2, y: 1}, {x: 2, y: 2},
      {x: 2, y: 3}, {x: 3, y: 3}, {x: 4, y: 3}, {x: 4, y: 4},
      {x: 5, y: 4}, {x: 6, y: 4}, {x: 6, y: 3}, {x: 6, y: 2},
      {x: 7, y: 2}
    ],
    towerSlots: [
      {x: 1, y: 0}, {x: 1, y: 2}, {x: 3, y: 2}, {x: 3, y: 4},
      {x: 5, y: 3}, {x: 5, y: 5}, {x: 7, y: 1}, {x: 7, y: 3}, {x: 7, y: 5}
    ],
    waves: [
      { monsters: 5, interval: 2500, keys: ['C', 'G', 'Am', 'Em', 'F'] },
      { monsters: 5, interval: 2200, keys: ['D', 'A', 'Bm', 'F#m', 'Bbm'] },
      { monsters: 6, interval: 2000, keys: ['E', 'Ab', 'Cm', 'Gm', 'Eb', 'Db'] },
      { monsters: 6, interval: 1800, keys: ['B', 'Gb', 'C#', 'Db', 'F', 'F#'] },
      { monsters: 7, interval: 1600, keys: ['C', 'G', 'D', 'Am', 'Em', 'Bm', 'F#m'] },
      { monsters: 7, interval: 1400, keys: ['F', 'Bb', 'Eb', 'Dm', 'Gm', 'Cm', 'Fm'] },
      { monsters: 8, interval: 1200, keys: ['C', 'Am', 'G', 'Em', 'F', 'Dm', 'Bb', 'Gm'] },
      { monsters: 10, interval: 1000, keys: ['C', 'G', 'D', 'A', 'E', 'F', 'Bb', 'Eb', 'Ab', 'Db'] }
    ]
  }
];

export const TOWER_TEMPLATES = {
  major_tower: {
    type: 'major' as const,
    modeName: '大调塔',
    damage: 25,
    range: 2,
    attackSpeed: 1000,
    maxLevel: 3,
    cost: 50,
    upgradeCost: 40,
    characteristicNotes: ['E', 'B']
  },
  minor_tower: {
    type: 'minor' as const,
    modeName: '小调塔',
    damage: 30,
    range: 1.5,
    attackSpeed: 1200,
    maxLevel: 3,
    cost: 60,
    upgradeCost: 50,
    characteristicNotes: ['Eb', 'Bb']
  },
  modal_tower: {
    type: 'modal' as const,
    modeName: '调式塔',
    damage: 40,
    range: 2.5,
    attackSpeed: 1500,
    maxLevel: 3,
    cost: 80,
    upgradeCost: 60,
    characteristicNotes: ['F#', 'C#', 'G#']
  }
};
