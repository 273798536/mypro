import { CycleRecord, FittingParams } from '../types';

export const exponentialDecay = (x: number, a: number, b: number, c: number): number => {
  return a * Math.exp(-b * x) + c;
};

export const calculateRSquared = (
  x: number[],
  y: number[],
  a: number,
  b: number,
  c: number
): number => {
  const yMean = y.reduce((sum, val) => sum + val, 0) / y.length;
  const ssTotal = y.reduce((sum, val) => sum + Math.pow(val - yMean, 2), 0);
  const ssResidual = y.reduce((sum, val, i) => {
    const predicted = exponentialDecay(x[i], a, b, c);
    return sum + Math.pow(val - predicted, 2);
  }, 0);
  return 1 - (ssResidual / ssTotal);
};

export const fitExponentialDecay = (cycles: CycleRecord[]): FittingParams => {
  const x = cycles.map(c => c.cycleNumber);
  const y = cycles.map(c => c.capacityRetention);
  
  let a = 30;
  let b = 0.001;
  let c = 70;
  
  const learningRate = 0.000001;
  const iterations = 10000;
  
  for (let iter = 0; iter < iterations; iter++) {
    let gradA = 0;
    let gradB = 0;
    let gradC = 0;
    
    for (let i = 0; i < x.length; i++) {
      const predicted = exponentialDecay(x[i], a, b, c);
      const error = predicted - y[i];
      
      gradA += error * Math.exp(-b * x[i]);
      gradB += error * a * (-x[i]) * Math.exp(-b * x[i]);
      gradC += error;
    }
    
    gradA /= x.length;
    gradB /= x.length;
    gradC /= x.length;
    
    a -= learningRate * gradA;
    b -= learningRate * 0.001 * gradB;
    c -= learningRate * gradC;
  }
  
  const rSquared = calculateRSquared(x, y, a, b, c);
  
  return { a, b, c, rSquared };
};

export const predictCapacityAtCycle = (
  cycleNumber: number,
  params: FittingParams
): number => {
  return exponentialDecay(cycleNumber, params.a, params.b, params.c);
};

export const estimateEndOfLife = (
  params: FittingParams,
  threshold: number = 80
): number => {
  let low = 0;
  let high = 10000;
  
  for (let i = 0; i < 100; i++) {
    const mid = (low + high) / 2;
    const capacity = exponentialDecay(mid, params.a, params.b, params.c);
    
    if (capacity > threshold) {
      low = mid;
    } else {
      high = mid;
    }
  }
  
  return Math.round((low + high) / 2);
};
