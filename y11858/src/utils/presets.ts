import type { OrbitalParams } from '../types';

export const PRESET_ORBITALS: OrbitalParams[] = [
  {
    id: '1s',
    name: '1s 轨道',
    n: 1, l: 0, m: 0,
    isNormalized: true,
    description: '基态氢原子轨道，球对称分布',
  },
  {
    id: '2s',
    name: '2s 轨道',
    n: 2, l: 0, m: 0,
    isNormalized: true,
    description: '第一激发态s轨道，含一个径向节面',
  },
  {
    id: '2pz',
    name: '2pz 轨道',
    n: 2, l: 1, m: 0,
    isNormalized: true,
    description: '沿z轴的哑铃形p轨道',
  },
  {
    id: '2px',
    name: '2px 轨道',
    n: 2, l: 1, m: 1,
    isNormalized: true,
    description: '沿x轴的哑铃形p轨道（实组合）',
  },
  {
    id: '2py',
    name: '2py 轨道',
    n: 2, l: 1, m: -1,
    isNormalized: true,
    description: '沿y轴的哑铃形p轨道（实组合）',
  },
  {
    id: '3s',
    name: '3s 轨道',
    n: 3, l: 0, m: 0,
    isNormalized: true,
    description: '第二激发态s轨道，含两个径向节面',
  },
  {
    id: '3pz',
    name: '3pz 轨道',
    n: 3, l: 1, m: 0,
    isNormalized: true,
    description: '3p轨道沿z轴方向',
  },
  {
    id: '3dxy',
    name: '3dxy 轨道',
    n: 3, l: 2, m: 2,
    isNormalized: true,
    description: '四叶形d轨道，在xy平面',
  },
  {
    id: '3dz2',
    name: '3dz\u00B2 轨道',
    n: 3, l: 2, m: 0,
    isNormalized: true,
    description: '哑铃+环形d轨道，沿z轴',
  },
  {
    id: '3dxz',
    name: '3dxz 轨道',
    n: 3, l: 2, m: 1,
    isNormalized: true,
    description: '四叶形d轨道，在xz平面',
  },
  {
    id: '4s',
    name: '4s 轨道',
    n: 4, l: 0, m: 0,
    isNormalized: true,
    description: '第三激发态s轨道',
  },
  {
    id: '4f0',
    name: '4fz\u00B3 轨道',
    n: 4, l: 3, m: 0,
    isNormalized: true,
    description: 'f轨道，沿z轴方向',
  },
  {
    id: '1s-unnorm',
    name: '1s (未归一化测试)',
    n: 1, l: 0, m: 0,
    isNormalized: false,
    normalizationFactor: 2.5,
    description: '故意未归一化的1s轨道，用于测试归一化检查功能',
  },
  {
    id: '2pz-unnorm',
    name: '2pz (未归一化测试)',
    n: 2, l: 1, m: 0,
    isNormalized: false,
    normalizationFactor: 0.3,
    description: '故意放大概率密度的2pz轨道，用于测试归一化检查',
  },
];

export function getPresetById(id: string): OrbitalParams | undefined {
  return PRESET_ORBITALS.find(p => p.id === id);
}

export function getOrbitalLabel(n: number, l: number, m: number): string {
  const lLabels = ['s', 'p', 'd', 'f', 'g', 'h', 'i'];
  const lLabel = lLabels[l] || `l=${l}`;
  return `${n}${lLabel} (m=${m})`;
}
