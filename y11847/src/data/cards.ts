import { Card, CityState } from '../types/game';

export const rainCards: Card[] = [
  {
    id: 'rain-light',
    type: 'rain',
    name: '小雨',
    description: '降雨量 +20',
    effect: { waterChange: 20 }
  },
  {
    id: 'rain-medium',
    type: 'rain',
    name: '中雨',
    description: '降雨量 +40',
    effect: { waterChange: 40 }
  },
  {
    id: 'rain-heavy',
    type: 'rain',
    name: '大雨',
    description: '降雨量 +60，低洼积水 +15',
    effect: { waterChange: 60 }
  },
  {
    id: 'rain-storm',
    type: 'rain',
    name: '暴雨',
    description: '降雨量 +80，低洼积水 +30',
    effect: { waterChange: 80 }
  }
];

export const pumpCards: Card[] = [
  {
    id: 'pump-low',
    type: 'pump',
    name: '泵站低负荷',
    description: '排水量 -25，泵站负荷 +15',
    effect: { waterChange: -25, pumpLoad: 15 }
  },
  {
    id: 'pump-medium',
    type: 'pump',
    name: '泵站中负荷',
    description: '排水量 -45，泵站负荷 +30',
    effect: { waterChange: -45, pumpLoad: 30 }
  },
  {
    id: 'pump-high',
    type: 'pump',
    name: '泵站高负荷',
    description: '排水量 -65，泵站负荷 +50',
    effect: { waterChange: -65, pumpLoad: 50 }
  }
];

export const gardenCards: Card[] = [
  {
    id: 'garden-small',
    type: 'garden',
    name: '小型雨水花园',
    description: '蓄水量 -20，绿地容量 -20',
    effect: { waterChange: -20, gardenCapacity: -20 }
  },
  {
    id: 'garden-medium',
    type: 'garden',
    name: '中型雨水花园',
    description: '蓄水量 -35，绿地容量 -35',
    effect: { waterChange: -35, gardenCapacity: -35 }
  },
  {
    id: 'garden-large',
    type: 'garden',
    name: '大型雨水花园',
    description: '蓄水量 -50，绿地容量 -50',
    effect: { waterChange: -50, gardenCapacity: -50 }
  }
];

export const pipeCards: Card[] = [
  {
    id: 'pipe-drain',
    type: 'pipe',
    name: '管网排水',
    description: '排水量 -30，低洼积水 -10',
    effect: { waterChange: -30 }
  },
  {
    id: 'pipe-divert',
    type: 'pipe',
    name: '管网分流',
    description: '排水量 -20，低洼积水 -25',
    effect: { waterChange: -20 }
  }
];

export const initialHandCards: Card[] = [
  { ...pumpCards[0], id: 'pump-low-1' },
  { ...pumpCards[1], id: 'pump-medium-1' },
  { ...gardenCards[0], id: 'garden-small-1' },
  { ...gardenCards[1], id: 'garden-medium-1' },
  { ...pipeCards[0], id: 'pipe-drain-1' },
  { ...pipeCards[1], id: 'pipe-divert-1' }
];

export const initialCityState: CityState = {
  waterLevel: 30,
  pumpLoad: 20,
  pumpCapacity: 100,
  gardenCapacity: 100,
  gardenMaxCapacity: 100,
  lowAreaWater: 10
};
