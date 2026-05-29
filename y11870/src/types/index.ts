export interface WaveSource {
  id: string;
  x: number;
  y: number;
  frequency: number;
  phase: number;
  amplitude: number;
  enabled: boolean;
}

export interface Obstacle {
  id: string;
  type: 'rect' | 'circle' | 'line';
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  rotation?: number;
  absorption: number;
}

export interface Warning {
  id: string;
  type: 'phase_out_of_bounds' | 'wave_penetration' | 'sampling_stutter' | 'data_gap';
  severity: 'warning' | 'error';
  message: string;
  location?: { x: number; y: number };
  timestamp: number;
  dismissed: boolean;
}

export interface SimulationState {
  isPlaying: boolean;
  time: number;
  speed: number;
  gridSize: { width: number; height: number };
  waveData: Float32Array | null;
  previousWaveData: Float32Array | null;
  baselineWaveData: Float32Array | null;
  showComparison: boolean;
}

export type ViewMode = '3d' | '2d' | 'split';
