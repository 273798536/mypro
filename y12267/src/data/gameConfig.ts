import { DefectCard } from '../types/game';

export const GAME_CONFIG = {
  gridSize: { width: 8, height: 8 },
  maxEnergy: 100,
  initialEnergy: 100,
  penaltyPerViolation: 5,
  bonusPerConsecutive: 5,
  comboBonusThreshold: 5,
  comboBonusAmount: 20,
};

export const DEFECT_CARDS: DefectCard[] = [
  {
    id: 'vacancy-1',
    type: 'vacancy',
    name: 'Vacancy',
    nameCn: '空位',
    energyCost: 10,
    description: '移除一个晶格原子，形成空位缺陷',
    material: '硅晶体',
    color: '#F53F3F',
  },
  {
    id: 'vacancy-2',
    type: 'vacancy',
    name: 'Vacancy',
    nameCn: '空位',
    energyCost: 10,
    description: '移除一个晶格原子，形成空位缺陷',
    material: '锗晶体',
    color: '#F53F3F',
  },
  {
    id: 'interstitial-1',
    type: 'interstitial',
    name: 'Interstitial',
    nameCn: '间隙原子',
    energyCost: 15,
    description: '在晶格间隙添加额外原子',
    material: '金刚石',
    color: '#FF7D00',
  },
  {
    id: 'interstitial-2',
    type: 'interstitial',
    name: 'Interstitial',
    nameCn: '间隙原子',
    energyCost: 15,
    description: '在晶格间隙添加额外原子',
    material: '碳化硅',
    color: '#FF7D00',
  },
  {
    id: 'dislocation-1',
    type: 'dislocation',
    name: 'Dislocation',
    nameCn: '位错',
    energyCost: 25,
    description: '线性缺陷，必须与已有缺陷相邻放置',
    material: '铜晶体',
    color: '#7B61FF',
  },
  {
    id: 'dislocation-2',
    type: 'dislocation',
    name: 'Dislocation',
    nameCn: '位错',
    energyCost: 25,
    description: '线性缺陷，必须与已有缺陷相邻放置',
    material: '铝晶体',
    color: '#7B61FF',
  },
  {
    id: 'grain_boundary-1',
    type: 'grain_boundary',
    name: 'Grain Boundary',
    nameCn: '晶界',
    energyCost: 40,
    description: '区域缺陷，影响周围晶格',
    material: '多晶硅',
    color: '#165DFF',
  },
];

export const VIOLATION_RULES = {
  overlap: {
    name: '缺陷重叠规则',
    description: '同一位置不能放置多个缺陷',
  },
  energy: {
    name: '能量超限规则',
    description: '能量消耗不能超过当前可用能量',
  },
  boundary: {
    name: '晶格越界规则',
    description: '缺陷必须放置在晶格网格范围内',
  },
  adjacency: {
    name: '位错邻接规则',
    description: '位错缺陷必须与已有缺陷相邻放置',
  },
};
