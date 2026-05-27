import { RLCParameters, CalculationResult, WaveformType } from '../types';
import { resistanceToBase, inductanceToBase, capacitanceToBase } from './unitConverter';
import { analyzeDamping, calculateOvershoot, calculateRiseTime, calculateSettlingTime } from './dampingAnalyzer';

const getInputVoltage = (t: number, waveform: WaveformType, amplitude: number, frequency?: number, pulseWidth?: number): number => {
  switch (waveform) {
    case 'step':
      return t >= 0 ? amplitude : 0;
    case 'pulse':
      const pw = pulseWidth || 0.001;
      return t >= 0 && t < pw ? amplitude : 0;
    case 'sinusoidal':
      const freq = frequency || 50;
      return t >= 0 ? amplitude * Math.sin(2 * Math.PI * freq * t) : 0;
    default:
      return 0;
  }
};

const rk4Step = (
  f: (t: number, x: number[]) => number[],
  t: number,
  x: number[],
  dt: number
): number[] => {
  const k1 = f(t, x);
  const k2 = f(t + dt / 2, x.map((v, i) => v + dt / 2 * k1[i]));
  const k3 = f(t + dt / 2, x.map((v, i) => v + dt / 2 * k2[i]));
  const k4 = f(t + dt, x.map((v, i) => v + dt * k3[i]));
  
  return x.map((v, i) => v + dt / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
};

export const solveRLC = (params: RLCParameters): CalculationResult => {
  const R = resistanceToBase(params.resistance.value, params.resistance.unit);
  const L = inductanceToBase(params.inductance.value, params.inductance.unit);
  const C = capacitanceToBase(params.capacitance.value, params.capacitance.unit);
  const Vm = params.inputWaveform.amplitude;
  
  const dampingAnalysis = analyzeDamping(R, L, C);
  const { dampingRatio, naturalFrequency, dampingType, characteristicRoots } = dampingAnalysis;
  
  let i0 = 0;
  let vC0 = 0;
  
  if (params.initialConditions.enabled) {
    i0 = params.initialConditions.inductorCurrent;
    vC0 = params.initialConditions.capacitorVoltage;
  }
  
  const tau = L / R;
  const totalTime = Math.max(10 * tau, 5 / (dampingRatio * naturalFrequency)) || 0.01;
  const samplingRate = Math.min(10000, Math.ceil(totalTime / (totalTime * naturalFrequency / 100)));
  const dt = totalTime / samplingRate;
  
  const timePoints: number[] = [];
  const voltagePoints: number[] = [];
  const currentPoints: number[] = [];
  
  const stateDerivative = (t: number, state: number[]): number[] => {
    const [i, vC] = state;
    const vs = getInputVoltage(
      t,
      params.inputWaveform.type,
      Vm,
      params.inputWaveform.frequency,
      params.inputWaveform.pulseWidth
    );
    
    const di_dt = (vs - R * i - vC) / L;
    const dvC_dt = i / C;
    
    return [di_dt, dvC_dt];
  };
  
  let state = [i0, vC0];
  
  for (let n = 0; n <= samplingRate; n++) {
    const t = n * dt;
    timePoints.push(t);
    currentPoints.push(state[0]);
    voltagePoints.push(state[1]);
    state = rk4Step(stateDerivative, t, state, dt);
  }
  
  const overshoot = calculateOvershoot(dampingRatio, naturalFrequency, Vm);
  const riseTime = calculateRiseTime(dampingRatio, naturalFrequency);
  const settlingTime = calculateSettlingTime(dampingRatio, naturalFrequency);
  
  const steadyStateValue = params.inputWaveform.type === 'step' ? Vm : 0;
  
  return {
    dampingRatio,
    naturalFrequency,
    dampingType,
    characteristicRoots,
    response: {
      timePoints,
      voltagePoints,
      currentPoints,
      samplingRate,
      totalTime,
    },
    overshoot,
    steadyStateValue,
    riseTime,
    settlingTime,
  };
};

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const createDefaultParameters = (): RLCParameters => ({
  id: generateId(),
  timestamp: Date.now(),
  source: 'manual',
  resistance: {
    value: 100,
    unit: 'ohm',
    rawInput: '100',
  },
  inductance: {
    value: 100,
    unit: 'mh',
    rawInput: '100',
  },
  capacitance: {
    value: 1,
    unit: 'uf',
    rawInput: '1',
  },
  inputWaveform: {
    type: 'step',
    amplitude: 5,
  },
  initialConditions: {
    inductorCurrent: 0,
    capacitorVoltage: 0,
    enabled: false,
  },
  corrections: [],
});
