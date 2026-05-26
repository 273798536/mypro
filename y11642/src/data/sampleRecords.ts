import { BOARD_SIZE, MAX_ROUNDS, WEATHER_TYPES, CROP_TYPES } from './constants';
import type { SampleRecord, GameState, Valve, Plot, Cell } from '../types';

function createSampleBoard(): Cell[][] {
  const board: Cell[][] = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    board[row] = [];
    for (let col = 0; col < BOARD_SIZE; col++) {
      board[row][col] = {
        type: 'empty',
        position: { row, col },
        hasWater: false
      };
    }
  }
  
  board[0][0] = { type: 'source', position: { row: 0, col: 0 }, hasWater: true };
  board[0][1] = { type: 'canal', position: { row: 0, col: 1 }, hasWater: false };
  board[0][2] = { type: 'valve', position: { row: 0, col: 2 }, hasWater: false };
  board[0][3] = { type: 'canal', position: { row: 0, col: 3 }, hasWater: false };
  board[1][1] = { type: 'canal', position: { row: 1, col: 1 }, hasWater: false };
  board[1][2] = { type: 'plot', position: { row: 1, col: 2 }, hasWater: false };
  board[2][1] = { type: 'valve', position: { row: 2, col: 1 }, hasWater: false };
  board[2][3] = { type: 'canal', position: { row: 2, col: 3 }, hasWater: false };
  board[3][1] = { type: 'canal', position: { row: 3, col: 1 }, hasWater: false };
  board[3][2] = { type: 'plot', position: { row: 3, col: 2 }, hasWater: false };
  board[3][4] = { type: 'plot', position: { row: 3, col: 4 }, hasWater: false };
  
  return board;
}

function createSampleValves(states: ('open' | 'closed')[]): Valve[] {
  return [
    { id: 'v1', state: states[0], position: { row: 0, col: 2 } },
    { id: 'v2', state: states[1], position: { row: 2, col: 1 } }
  ];
}

function createSamplePlots(waterLevels: number[]): Plot[] {
  return [
    {
      id: 'p1',
      name: '一号地块',
      cropType: '小麦',
      waterRequired: CROP_TYPES[0].waterRequired,
      waterCurrent: waterLevels[0],
      isWatered: waterLevels[0] >= CROP_TYPES[0].waterRequired * 0.5,
      overwateredCount: waterLevels[0] > CROP_TYPES[0].waterRequired ? 1 : 0,
      position: { row: 1, col: 2 }
    },
    {
      id: 'p2',
      name: '二号地块',
      cropType: '玉米',
      waterRequired: CROP_TYPES[1].waterRequired,
      waterCurrent: waterLevels[1],
      isWatered: waterLevels[1] >= CROP_TYPES[1].waterRequired * 0.5,
      overwateredCount: waterLevels[1] > CROP_TYPES[1].waterRequired ? 1 : 0,
      position: { row: 3, col: 2 }
    },
    {
      id: 'p3',
      name: '三号地块',
      cropType: '水稻',
      waterRequired: CROP_TYPES[2].waterRequired,
      waterCurrent: waterLevels[2],
      isWatered: waterLevels[2] >= CROP_TYPES[2].waterRequired * 0.5,
      overwateredCount: waterLevels[2] > CROP_TYPES[2].waterRequired ? 2 : 0,
      position: { row: 3, col: 4 }
    }
  ];
}

const normalGameState: GameState = {
  phase: 'ended',
  currentRound: 8,
  maxRounds: MAX_ROUNDS,
  score: 1850,
  board: createSampleBoard(),
  valves: createSampleValves(['open', 'open']),
  plots: createSamplePlots([22, 28, 38]),
  currentWeather: { ...WEATHER_TYPES.cloudy },
  anomalies: [
    {
      type: 'evaporation',
      message: '蒸发损失：本回合蒸发损失水量8单位',
      round: 3,
      timestamp: Date.now() - 500000
    }
  ],
  actionHistory: [
    { round: 1, valveId: 'v1', action: 'open', timestamp: Date.now() - 600000 },
    { round: 2, valveId: 'v2', action: 'open', timestamp: Date.now() - 550000 },
    { round: 5, valveId: 'v1', action: 'closed', timestamp: Date.now() - 300000 },
    { round: 6, valveId: 'v1', action: 'open', timestamp: Date.now() - 250000 }
  ],
  waterFlowState: {
    wateredPlots: ['p1', 'p2', 'p3'],
    flowPath: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 0, col: 3 }, { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 2, col: 1 }, { row: 2, col: 3 }, { row: 3, col: 1 }, { row: 3, col: 2 }, { row: 3, col: 4 }]
  },
  totalWaterUsed: 240,
  totalEvaporation: 24
};

const boundaryGameState: GameState = {
  phase: 'ended',
  currentRound: 8,
  maxRounds: MAX_ROUNDS,
  score: 1050,
  board: createSampleBoard(),
  valves: createSampleValves(['open', 'closed']),
  plots: createSamplePlots([18, 8, 32]),
  currentWeather: { ...WEATHER_TYPES.sunny },
  anomalies: [
    {
      type: 'drought',
      message: '警告：二号地块（玉米）严重缺水！当前水量仅为8，需水量25',
      round: 4,
      plotId: 'p2',
      timestamp: Date.now() - 400000
    },
    {
      type: 'evaporation',
      message: '蒸发损失：本回合蒸发损失水量15单位',
      round: 2,
      timestamp: Date.now() - 500000
    },
    {
      type: 'evaporation',
      message: '蒸发损失：本回合蒸发损失水量12单位',
      round: 5,
      timestamp: Date.now() - 350000
    }
  ],
  actionHistory: [
    { round: 1, valveId: 'v1', action: 'open', timestamp: Date.now() - 600000 },
    { round: 4, valveId: 'v2', action: 'open', timestamp: Date.now() - 400000 },
    { round: 5, valveId: 'v2', action: 'closed', timestamp: Date.now() - 350000 }
  ],
  waterFlowState: {
    wateredPlots: ['p1', 'p3'],
    flowPath: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 0, col: 3 }, { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 2, col: 3 }, { row: 3, col: 4 }]
  },
  totalWaterUsed: 160,
  totalEvaporation: 45
};

const badGameState: GameState = {
  phase: 'ended',
  currentRound: 5,
  maxRounds: MAX_ROUNDS,
  score: 320,
  board: createSampleBoard(),
  valves: createSampleValves(['closed', 'open']),
  plots: createSamplePlots([5, 45, 10]),
  currentWeather: { ...WEATHER_TYPES.windy },
  anomalies: [
    {
      type: 'drought',
      message: '警告：一号地块（小麦）严重缺水！当前水量仅为5，需水量20',
      round: 2,
      plotId: 'p1',
      timestamp: Date.now() - 500000
    },
    {
      type: 'drought',
      message: '警告：三号地块（水稻）严重缺水！当前水量仅为10，需水量35',
      round: 3,
      plotId: 'p3',
      timestamp: Date.now() - 400000
    },
    {
      type: 'overwater',
      message: '警告：二号地块（玉米）被重复灌溉！当前水量45，超过需水量25',
      round: 2,
      plotId: 'p2',
      timestamp: Date.now() - 480000
    },
    {
      type: 'overwater',
      message: '警告：二号地块（玉米）被重复灌溉！当前水量45，超过需水量25',
      round: 3,
      plotId: 'p2',
      timestamp: Date.now() - 420000
    },
    {
      type: 'evaporation',
      message: '蒸发损失：本回合蒸发损失水量10单位',
      round: 1,
      timestamp: Date.now() - 550000
    }
  ],
  actionHistory: [
    { round: 1, valveId: 'v2', action: 'open', timestamp: Date.now() - 550000 },
    { round: 2, valveId: 'v2', action: 'open', timestamp: Date.now() - 500000 },
    { round: 3, valveId: 'v2', action: 'open', timestamp: Date.now() - 400000 }
  ],
  waterFlowState: {
    wateredPlots: ['p2'],
    flowPath: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 1 }, { row: 2, col: 1 }, { row: 3, col: 1 }, { row: 3, col: 2 }]
  },
  totalWaterUsed: 120,
  totalEvaporation: 24
};

export const sampleRecords: SampleRecord[] = [
  {
    id: 'normal-001',
    name: '正常灌溉流程',
    type: 'normal',
    description: '合理开关阀门，根据天气调整灌溉策略，所有地块按需供水，蒸发损失控制良好。',
    gameState: normalGameState,
    expectedOutcome: '所有作物正常生长，得分优秀（A），操作可作为教学范例。'
  },
  {
    id: 'boundary-001',
    name: '临界供水记录',
    type: 'boundary',
    description: '晴天蒸发量大，阀门开关时机不当，导致二号地块一度缺水，后及时补救但仍有损失。',
    gameState: boundaryGameState,
    expectedOutcome: '勉强达标（C），提示风险，适合用于教学讨论如何应对极端天气。'
  },
  {
    id: 'bad-001',
    name: '错误操作示例',
    type: 'bad',
    description: '上游阀门v1关闭导致下游地块p1、p3断水，同时重复打开v2造成p2过度灌溉，典型错误操作。',
    gameState: badGameState,
    expectedOutcome: '作物干旱+过湿双重问题，低分（F），用于警示常见错误。'
  }
];
