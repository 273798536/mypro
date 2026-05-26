import { PresetConfig } from '../types';

const COLORS = [
  '#00d4ff',
  '#ff6b35',
  '#4ade80',
  '#f472b6',
  '#a78bfa',
  '#fbbf24',
  '#fb7185',
  '#34d399',
];

export function getPendulumColor(index: number): string {
  return COLORS[index % COLORS.length];
}

export const PRESETS: PresetConfig[] = [
  {
    name: '等摆长弱耦合',
    description: '5个相同摆长、相同质量的摆，弱耦合系数，观察能量缓慢传递',
    pendulumCount: 5,
    lengths: [1.0, 1.0, 1.0, 1.0, 1.0],
    masses: [1.0, 1.0, 1.0, 1.0, 1.0],
    initialAngles: [0.3, 0.0, 0.0, 0.0, 0.0],
    couplingCoeff: 1.0,
    damping: 0.01,
    timeStep: 0.01,
  },
  {
    name: '等摆长强耦合',
    description: '5个相同摆长、相同质量的摆，强耦合系数，观察能量快速传递',
    pendulumCount: 5,
    lengths: [1.0, 1.0, 1.0, 1.0, 1.0],
    masses: [1.0, 1.0, 1.0, 1.0, 1.0],
    initialAngles: [0.4, 0.0, 0.0, 0.0, 0.0],
    couplingCoeff: 20.0,
    damping: 0.05,
    timeStep: 0.005,
  },
  {
    name: '不等摆长',
    description: '5个摆长递增的摆，弱耦合，观察拍频现象',
    pendulumCount: 5,
    lengths: [0.8, 0.9, 1.0, 1.1, 1.2],
    masses: [1.0, 1.0, 1.0, 1.0, 1.0],
    initialAngles: [0.3, 0.2, 0.1, 0.0, 0.0],
    couplingCoeff: 5.0,
    damping: 0.02,
    timeStep: 0.01,
  },
  {
    name: '多激发模式',
    description: '5个摆，多个初始角度，观察复杂耦合振荡',
    pendulumCount: 5,
    lengths: [1.0, 1.0, 1.0, 1.0, 1.0],
    masses: [1.2, 0.8, 1.5, 0.7, 1.0],
    initialAngles: [0.3, -0.2, 0.4, -0.1, 0.0],
    couplingCoeff: 8.0,
    damping: 0.03,
    timeStep: 0.01,
  },
  {
    name: '三摆阵列',
    description: '简化的3摆系统，清晰展示相位差',
    pendulumCount: 3,
    lengths: [1.0, 1.0, 1.0],
    masses: [1.0, 1.0, 1.0],
    initialAngles: [0.5, 0.0, -0.3],
    couplingCoeff: 10.0,
    damping: 0.01,
    timeStep: 0.005,
  },
  {
    name: '八摆大阵列',
    description: '8个摆的大规模耦合阵列，观察波的传播',
    pendulumCount: 8,
    lengths: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
    masses: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
    initialAngles: [0.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
    couplingCoeff: 5.0,
    damping: 0.02,
    timeStep: 0.01,
  },
];

export function createPendulumsFromPreset(preset: PresetConfig) {
  return preset.lengths.map((length, i) => ({
    id: i,
    length,
    mass: preset.masses[i] ?? 1.0,
    initialAngle: preset.initialAngles[i] ?? 0.0,
    angle: preset.initialAngles[i] ?? 0.0,
    angularVelocity: 0,
    phase: computeInitialPhase(preset.initialAngles[i] ?? 0.0),
    color: getPendulumColor(i),
  }));
}

function computeInitialPhase(angle: number): number {
  return Math.atan2(0, angle);
}
