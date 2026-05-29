import type { Tug, Berth, Ship } from '@/types'

export const INITIAL_TUGS: Tug[] = [
  { id: 'TUG-01', name: '海牛号', horsepower: 8000, maxFuel: 100, currentFuel: 80, status: 'idle', busyUntil: 0 },
  { id: 'TUG-02', name: '港龙号', horsepower: 6000, maxFuel: 100, currentFuel: 45, status: 'idle', busyUntil: 0 },
  { id: 'TUG-03', name: '潮信号', horsepower: 10000, maxFuel: 100, currentFuel: 100, status: 'idle', busyUntil: 0 },
]

export const INITIAL_BERTHS: Berth[] = [
  { id: 'B01', name: '1号泊位', maxTonnage: 50000, status: 'empty', occupiedBy: null, occupiedUntil: 0 },
  { id: 'B02', name: '2号泊位', maxTonnage: 100000, status: 'empty', occupiedBy: null, occupiedUntil: 0 },
  { id: 'B03', name: '3号泊位', maxTonnage: 20000, status: 'empty', occupiedBy: null, occupiedUntil: 0 },
  { id: 'B04', name: '4号泊位', maxTonnage: 80000, status: 'empty', occupiedBy: null, occupiedUntil: 0 },
]

export const INITIAL_SHIPS: Ship[] = [
  {
    id: 'S01', name: '远洋明珠', tonnage: 80000, requiredTugs: 2,
    tideWindowStart: 420, tideWindowEnd: 600, arrivalTime: 390, operationDuration: 180,
    isTideMissTest: false, status: 'waiting',
  },
  {
    id: 'S02', name: '渤海通途', tonnage: 30000, requiredTugs: 1,
    tideWindowStart: 480, tideWindowEnd: 720, arrivalTime: 450, operationDuration: 120,
    isTideMissTest: false, status: 'waiting',
  },
  {
    id: 'S03', name: '潮汐错过号', tonnage: 60000, requiredTugs: 2,
    tideWindowStart: 540, tideWindowEnd: 570, arrivalTime: 555, operationDuration: 150,
    isTideMissTest: true, status: 'waiting',
  },
  {
    id: 'S04', name: '北方曙光', tonnage: 15000, requiredTugs: 1,
    tideWindowStart: 600, tideWindowEnd: 840, arrivalTime: 540, operationDuration: 90,
    isTideMissTest: false, status: 'waiting',
  },
  {
    id: 'S05', name: '燃油测试号', tonnage: 90000, requiredTugs: 2,
    tideWindowStart: 660, tideWindowEnd: 900, arrivalTime: 630, operationDuration: 180,
    isTideMissTest: false, status: 'waiting',
  },
  {
    id: 'S06', name: '深夜潮', tonnage: 40000, requiredTugs: 1,
    tideWindowStart: 1080, tideWindowEnd: 1260, arrivalTime: 1020, operationDuration: 150,
    isTideMissTest: false, status: 'waiting',
  },
]

export const FUEL_COST_PER_DISPATCH = 20
export const TUG_RETURN_TIME = 30
export const TIME_STEP = 30
export const GAME_START = 360
export const GAME_END = 1440
