import type { MotorConfig, CoilConfig } from '../types';

const createDefaultCoils = (): CoilConfig[] => [
  {
    id: 'coil-a',
    name: '线圈 A (U相)',
    current: 5,
    direction: 'clockwise',
    position: { x: 2, y: 0, z: 0 },
    radius: 0.8,
    turns: 100,
    enabled: true,
    color: '#ef4444',
  },
  {
    id: 'coil-b',
    name: '线圈 B (V相)',
    current: 5,
    direction: 'counterclockwise',
    position: { x: -1, y: 0, z: 1.732 },
    radius: 0.8,
    turns: 100,
    enabled: true,
    color: '#22c55e',
  },
  {
    id: 'coil-c',
    name: '线圈 C (W相)',
    current: 5,
    direction: 'clockwise',
    position: { x: -1, y: 0, z: -1.732 },
    radius: 0.8,
    turns: 100,
    enabled: true,
    color: '#3b82f6',
  },
];

export const defaultMotorConfig: MotorConfig = {
  coils: createDefaultCoils(),
  rotorAngle: 0,
  sectionPlane: {
    normal: { x: 0, y: 1, z: 0 },
    position: 0,
    visible: true,
  },
  colorScale: {
    min: 0,
    max: 100,
    colormap: 'viridis',
  },
  showFieldArrows: true,
  showStator: true,
  showRotor: true,
  arrowDensity: 5,
  arrowScale: 1,
};

export const STORAGE_KEYS = {
  MOTOR_CONFIG: 'motor_field_visualizer_config',
  OPERATION_HISTORY: 'motor_field_visualizer_history',
  ERROR_LOGS: 'motor_field_visualizer_errors',
};
