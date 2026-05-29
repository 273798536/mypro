export interface SurfaceConfig {
  expression: string;
  xRange: [number, number];
  yRange: [number, number];
  zRange: [number, number];
  samplingDensity: number;
}

export type ExtremumType = 'maximum' | 'minimum' | 'saddle';

export type ResultStatus = 'confirmed' | 'needs_review' | 'error';

export interface ExtremumTrace {
  expression: string;
  xRange: [number, number];
  yRange: [number, number];
  samplingDensity: number;
  gradientMagnitude: number;
  hessianEigenvalues: [number, number];
}

export interface ExtremumPoint {
  x: number;
  y: number;
  z: number;
  type: ExtremumType;
  status: ResultStatus;
  trace: ExtremumTrace;
  message?: string;
}

export interface ViewpointSnapshot {
  id: string;
  name: string;
  position: [number, number, number];
  target: [number, number, number];
  up: [number, number, number];
  zoom: number;
  timestamp: number;
  config: SurfaceConfig;
}

export type CrossSectionDirection = 'xy' | 'xz' | 'yz';

export interface CrossSection {
  direction: CrossSectionDirection;
  position: number;
  points: [number, number][];
}

export interface SurfaceData {
  vertices: Float32Array;
  indices: Uint32Array;
  normals: Float32Array;
  colors: Float32Array;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  zMin: number;
  zMax: number;
}

export interface ParseError {
  message: string;
  suggestion: string;
}

export interface PresetFunction {
  name: string;
  nameCN: string;
  expression: string;
  xRange: [number, number];
  yRange: [number, number];
  description: string;
}

export const PRESET_FUNCTIONS: PresetFunction[] = [
  {
    name: 'Saddle Point',
    nameCN: '鞍点',
    expression: 'x^2 - y^2',
    xRange: [-3, 3],
    yRange: [-3, 3],
    description: '经典鞍点曲面 z = x² - y²，原点处为鞍点',
  },
  {
    name: 'Paraboloid',
    nameCN: '抛物面',
    expression: 'x^2 + y^2',
    xRange: [-3, 3],
    yRange: [-3, 3],
    description: '旋转抛物面 z = x² + y²，原点处为极小值',
  },
  {
    name: 'Wave Surface',
    nameCN: '波浪面',
    expression: 'sin(x) * cos(y)',
    xRange: [-5, 5],
    yRange: [-5, 5],
    description: '波浪曲面 z = sin(x)·cos(y)，多处极值与鞍点',
  },
  {
    name: 'Monkey Saddle',
    nameCN: '猴鞍点',
    expression: 'x^3 - 3*x*y^2',
    xRange: [-2, 2],
    yRange: [-2, 2],
    description: '猴鞍点 z = x³ - 3xy²，退化临界点',
  },
  {
    name: 'Gaussian',
    nameCN: '高斯曲面',
    expression: 'exp(-(x^2 + y^2))',
    xRange: [-3, 3],
    yRange: [-3, 3],
    description: '高斯曲面 z = e^(-(x²+y²))，原点处为极大值',
  },
  {
    name: 'Rosenbrock',
    nameCN: 'Rosenbrock函数',
    expression: '(1-x)^2 + 100*(y-x^2)^2',
    xRange: [-2, 2],
    yRange: [-1, 3],
    description: 'Rosenbrock函数，全局极小在(1,1)处，狭长山谷形',
  },
];
