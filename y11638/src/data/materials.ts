import { Material } from '../types';

export const defaultMaterials: Material[] = [
  {
    id: 'wood',
    name: '木材',
    costPerMeter: 10,
    maxCompression: 80,
    maxTension: 60,
    density: 1.5,
    color: '#8B4513',
    source: '默认材料库 v1.0',
    revision: 1
  },
  {
    id: 'steel',
    name: '钢材',
    costPerMeter: 35,
    maxCompression: 300,
    maxTension: 250,
    density: 7.8,
    color: '#708090',
    source: '默认材料库 v1.0',
    revision: 1
  },
  {
    id: 'concrete',
    name: '混凝土',
    costPerMeter: 25,
    maxCompression: 200,
    maxTension: 30,
    density: 2.4,
    color: '#A9A9A9',
    source: '默认材料库 v1.0',
    revision: 1
  },
  {
    id: 'carbon',
    name: '碳纤维',
    costPerMeter: 80,
    maxCompression: 400,
    maxTension: 500,
    density: 1.8,
    color: '#2F4F4F',
    source: '高级材料包 v2.1',
    revision: 1
  },
  {
    id: 'bamboo',
    name: '竹材',
    costPerMeter: 8,
    maxCompression: 50,
    maxTension: 70,
    density: 0.7,
    color: '#6B8E23',
    source: '环保材料集 v1.5',
    revision: 1
  }
];
