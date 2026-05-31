function erf(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return sign * y;
}

function normalCDF(x: number): number {
  return 0.5 * (1 + erf(x / Math.sqrt(2)));
}

function normalPDF(x: number): number {
  return (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * x * x);
}

export function calculateD1(
  S: number,
  K: number,
  T: number,
  r: number,
  sigma: number
): number {
  if (T <= 0 || sigma <= 0) return 0;
  return (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
}

export function calculateD2(d1: number, sigma: number, T: number): number {
  return d1 - sigma * Math.sqrt(T);
}

export function calculateDelta(
  S: number,
  K: number,
  T: number,
  r: number,
  sigma: number,
  type: 'call' | 'put'
): number {
  const d1 = calculateD1(S, K, T, r, sigma);
  return type === 'call' ? normalCDF(d1) : normalCDF(d1) - 1;
}

export function calculateGamma(
  S: number,
  K: number,
  T: number,
  r: number,
  sigma: number
): number {
  const d1 = calculateD1(S, K, T, r, sigma);
  return normalPDF(d1) / (S * sigma * Math.sqrt(T));
}

export function calculateVega(
  S: number,
  K: number,
  T: number,
  r: number,
  sigma: number
): number {
  const d1 = calculateD1(S, K, T, r, sigma);
  return (S * normalPDF(d1) * Math.sqrt(T)) / 100;
}

export function calculateTheta(
  S: number,
  K: number,
  T: number,
  r: number,
  sigma: number,
  type: 'call' | 'put'
): number {
  const d1 = calculateD1(S, K, T, r, sigma);
  const d2 = calculateD2(d1, sigma, T);
  const term1 = -(S * normalPDF(d1) * sigma) / (2 * Math.sqrt(T));
  
  if (type === 'call') {
    return (term1 - r * K * Math.exp(-r * T) * normalCDF(d2)) / 365;
  } else {
    return (term1 + r * K * Math.exp(-r * T) * normalCDF(-d2)) / 365;
  }
}

export function calculateRho(
  S: number,
  K: number,
  T: number,
  r: number,
  sigma: number,
  type: 'call' | 'put'
): number {
  const d1 = calculateD1(S, K, T, r, sigma);
  const d2 = calculateD2(d1, sigma, T);
  
  if (type === 'call') {
    return (K * T * Math.exp(-r * T) * normalCDF(d2)) / 100;
  } else {
    return (-K * T * Math.exp(-r * T) * normalCDF(-d2)) / 100;
  }
}

export function calculateOptionPrice(
  S: number,
  K: number,
  T: number,
  r: number,
  sigma: number,
  type: 'call' | 'put'
): number {
  const d1 = calculateD1(S, K, T, r, sigma);
  const d2 = calculateD2(d1, sigma, T);
  
  if (type === 'call') {
    return S * normalCDF(d1) - K * Math.exp(-r * T) * normalCDF(d2);
  } else {
    return K * Math.exp(-r * T) * normalCDF(-d2) - S * normalCDF(-d1);
  }
}

export function calculateAllGreeks(
  S: number,
  K: number,
  T: number,
  r: number,
  sigma: number,
  type: 'call' | 'put'
) {
  return {
    delta: calculateDelta(S, K, T, r, sigma, type),
    gamma: calculateGamma(S, K, T, r, sigma),
    vega: calculateVega(S, K, T, r, sigma),
    theta: calculateTheta(S, K, T, r, sigma, type),
    rho: calculateRho(S, K, T, r, sigma, type),
  };
}

export class GammaGate {
  private pendingUpdates: Array<{ timestamp: number; gamma: number }> = [];
  private delaySeconds: number;

  constructor(delaySeconds: number = 10) {
    this.delaySeconds = delaySeconds;
  }

  setDelay(delaySeconds: number): void {
    this.delaySeconds = delaySeconds;
  }

  pushUpdate(timestamp: number, gamma: number): void {
    this.pendingUpdates.push({ timestamp, gamma });
  }

  getAvailableGamma(currentTime: number): {
    gamma: number;
    isDelayed: boolean;
    actualTime: number;
    pendingCount: number;
  } {
    const availableUpdates = this.pendingUpdates.filter(
      (u) => currentTime - u.timestamp >= this.delaySeconds
    );

    if (availableUpdates.length === 0) {
      return {
        gamma: 0,
        isDelayed: true,
        actualTime: 0,
        pendingCount: this.pendingUpdates.length,
      };
    }

    const latest = availableUpdates[availableUpdates.length - 1];
    const pending = this.pendingUpdates.filter(
      (u) => currentTime - u.timestamp < this.delaySeconds
    );

    return {
      gamma: latest.gamma,
      isDelayed: pending.length > 0,
      actualTime: latest.timestamp,
      pendingCount: pending.length,
    };
  }

  clear(): void {
    this.pendingUpdates = [];
  }
}

export function calculateTimeWeight(responseTime: number): {
  weight: number;
  label: string;
} {
  if (responseTime <= 5) return { weight: 1.0, label: '5秒内' };
  if (responseTime <= 10) return { weight: 0.7, label: '5-10秒' };
  if (responseTime <= 30) return { weight: 0.3, label: '10秒以上' };
  return { weight: 0, label: '未处理' };
}

export function calculateMargin(
  positionValue: number,
  currentMargin: number,
  maintenanceRate: number = 0.15
): {
  required: number;
  ratio: number;
  level: 'safe' | 'warning' | 'call' | 'liquidation';
} {
  const required = positionValue * maintenanceRate;
  const ratio = currentMargin / required;
  
  let level: 'safe' | 'warning' | 'call' | 'liquidation' = 'safe';
  if (ratio < 1.0) level = 'liquidation';
  else if (ratio < 1.2) level = 'call';
  else if (ratio < 1.5) level = 'warning';
  
  return { required, ratio, level };
}
