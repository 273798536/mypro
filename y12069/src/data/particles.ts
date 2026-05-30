import { ParticleType } from '@/utils/types';

export const PARTICLE_TYPES: ParticleType[] = [
  {
    id: 'electron',
    name: '电子',
    mass: 0.5,
    charge: -1,
    color: '#00d4ff',
    description: '轻量级粒子，速度快，适合精确打击',
  },
  {
    id: 'proton',
    name: '质子',
    mass: 2.0,
    charge: 1,
    color: '#ff6b6b',
    description: '中等质量，穿透力强，适合硬矿石',
  },
  {
    id: 'alpha',
    name: 'α粒子',
    mass: 4.0,
    charge: 2,
    color: '#ffd700',
    description: '大质量粒子，动量高，适合深层采矿',
  },
  {
    id: 'neutron',
    name: '中子',
    mass: 2.0,
    charge: 0,
    color: '#a855f7',
    description: '电中性粒子，不受电荷影响，稳定可靠',
  },
];

export const DEFAULT_PARTICLE: ParticleType = PARTICLE_TYPES[0];
