import { BOARD_SIZE, WEATHER_TYPES, CROP_TYPES } from './constants';
import type { Cell, Valve, Plot, Weather, Position } from '../types';

export function createEmptyBoard(): Cell[][] {
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
  return board;
}

export function createDefaultBoard(): Cell[][] {
  const board = createEmptyBoard();
  
  board[0][0] = { type: 'source', position: { row: 0, col: 0 }, hasWater: true };
  
  const canalPositions: Position[] = [
    { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 0, col: 3 },
    { row: 1, col: 1 }, { row: 2, col: 1 }, { row: 3, col: 1 },
    { row: 2, col: 3 }, { row: 2, col: 4 },
    { row: 3, col: 3 }, { row: 4, col: 3 },
    { row: 4, col: 4 }, { row: 4, col: 5 },
    { row: 1, col: 4 }, { row: 1, col: 5 }
  ];
  
  canalPositions.forEach(pos => {
    board[pos.row][pos.col] = { type: 'canal', position: pos, hasWater: false };
  });
  
  board[0][2] = { type: 'valve', position: { row: 0, col: 2 }, hasWater: false };
  board[2][1] = { type: 'valve', position: { row: 2, col: 1 }, hasWater: false };
  board[2][3] = { type: 'valve', position: { row: 2, col: 3 }, hasWater: false };
  board[4][3] = { type: 'valve', position: { row: 4, col: 3 }, hasWater: false };
  board[1][4] = { type: 'valve', position: { row: 1, col: 4 }, hasWater: false };
  
  board[1][2] = { type: 'plot', position: { row: 1, col: 2 }, hasWater: false };
  board[3][2] = { type: 'plot', position: { row: 3, col: 2 }, hasWater: false };
  board[3][4] = { type: 'plot', position: { row: 3, col: 4 }, hasWater: false };
  board[5][4] = { type: 'plot', position: { row: 5, col: 4 }, hasWater: false };
  board[0][5] = { type: 'plot', position: { row: 0, col: 5 }, hasWater: false };
  
  return board;
}

export function createDefaultValves(): Valve[] {
  return [
    { id: 'v1', state: 'closed', position: { row: 0, col: 2 } },
    { id: 'v2', state: 'closed', position: { row: 2, col: 1 } },
    { id: 'v3', state: 'closed', position: { row: 2, col: 3 } },
    { id: 'v4', state: 'closed', position: { row: 4, col: 3 } },
    { id: 'v5', state: 'closed', position: { row: 1, col: 4 } }
  ];
}

export function createDefaultPlots(): Plot[] {
  return [
    {
      id: 'p1',
      name: '一号地块',
      cropType: '小麦',
      waterRequired: CROP_TYPES[0].waterRequired,
      waterCurrent: 0,
      isWatered: false,
      overwateredCount: 0,
      position: { row: 1, col: 2 }
    },
    {
      id: 'p2',
      name: '二号地块',
      cropType: '玉米',
      waterRequired: CROP_TYPES[1].waterRequired,
      waterCurrent: 0,
      isWatered: false,
      overwateredCount: 0,
      position: { row: 3, col: 2 }
    },
    {
      id: 'p3',
      name: '三号地块',
      cropType: '水稻',
      waterRequired: CROP_TYPES[2].waterRequired,
      waterCurrent: 0,
      isWatered: false,
      overwateredCount: 0,
      position: { row: 3, col: 4 }
    },
    {
      id: 'p4',
      name: '四号地块',
      cropType: '蔬菜',
      waterRequired: CROP_TYPES[3].waterRequired,
      waterCurrent: 0,
      isWatered: false,
      overwateredCount: 0,
      position: { row: 5, col: 4 }
    },
    {
      id: 'p5',
      name: '五号地块',
      cropType: '小麦',
      waterRequired: CROP_TYPES[0].waterRequired,
      waterCurrent: 0,
      isWatered: false,
      overwateredCount: 0,
      position: { row: 0, col: 5 }
    }
  ];
}

export function getRandomWeather(): Weather {
  const weatherKeys = Object.keys(WEATHER_TYPES);
  const randomKey = weatherKeys[Math.floor(Math.random() * weatherKeys.length)];
  return { ...WEATHER_TYPES[randomKey] };
}
