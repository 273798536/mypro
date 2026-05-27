import { DampingType } from '../types';

export interface DampingAnalysis {
  dampingRatio: number;
  naturalFrequency: number;
  dampingType: DampingType;
  characteristicRoots: [number, number];
  isNearCritical: boolean;
  criticalityWarning?: string;
}

export const analyzeDamping = (R: number, L: number, C: number): DampingAnalysis => {
  const alpha = R / (2 * L);
  const omega0 = 1 / Math.sqrt(L * C);
  const zeta = alpha / omega0;
  
  let roots: [number, number];
  let dampingType: DampingType;
  let isNearCritical = false;
  let criticalityWarning: string | undefined;
  
  if (Math.abs(zeta - 1) < 0.05) {
    isNearCritical = true;
    criticalityWarning = `阻尼比 ζ=${zeta.toFixed(4)} 接近临界值 1，处于欠阻尼/过阻尼临界区间，建议微调参数验证结果`;
  }
  
  if (zeta < 0.0001) {
    dampingType = 'undamped';
    const omegaD = Math.sqrt(omega0 * omega0 - alpha * alpha);
    roots = [0, omegaD];
  } else if (zeta < 1) {
    dampingType = 'underdamped';
    const omegaD = omega0 * Math.sqrt(1 - zeta * zeta);
    roots = [-alpha, omegaD];
  } else if (Math.abs(zeta - 1) < 0.0001) {
    dampingType = 'critically_damped';
    roots = [-alpha, -alpha];
  } else {
    dampingType = 'overdamped';
    const s1 = -alpha - Math.sqrt(alpha * alpha - omega0 * omega0);
    const s2 = -alpha + Math.sqrt(alpha * alpha - omega0 * omega0);
    roots = [s1, s2];
  }
  
  return {
    dampingRatio: zeta,
    naturalFrequency: omega0,
    dampingType,
    characteristicRoots: roots,
    isNearCritical,
    criticalityWarning,
  };
};

export const getDampingTypeLabel = (type: DampingType): string => {
  const labels: Record<DampingType, string> = {
    undamped: '无阻尼',
    underdamped: '欠阻尼',
    critically_damped: '临界阻尼',
    overdamped: '过阻尼',
  };
  return labels[type];
};

export const getDampingTypeColor = (type: DampingType): string => {
  const colors: Record<DampingType, string> = {
    undamped: '#8B5CF6',
    underdamped: '#10B981',
    critically_damped: '#F59E0B',
    overdamped: '#EF4444',
  };
  return colors[type];
};

export const calculateOvershoot = (zeta: number, omega0: number, Vm: number) => {
  if (zeta >= 1 || zeta <= 0) {
    return {
      exists: false,
      value: 0,
      percentage: 0,
      time: 0,
    };
  }
  
  const overshootPercent = Math.exp(-zeta * Math.PI / Math.sqrt(1 - zeta * zeta)) * 100;
  const peakTime = Math.PI / (omega0 * Math.sqrt(1 - zeta * zeta));
  const peakValue = Vm * (1 + Math.exp(-zeta * Math.PI / Math.sqrt(1 - zeta * zeta)));
  
  return {
    exists: true,
    value: peakValue,
    percentage: overshootPercent,
    time: peakTime,
  };
};

export const calculateRiseTime = (zeta: number, omega0: number): number => {
  if (zeta >= 1) {
    const alpha = zeta * omega0;
    const beta = omega0 * Math.sqrt(zeta * zeta - 1);
    const s1 = -alpha - beta;
    const s2 = -alpha + beta;
    
    return 3 / Math.min(Math.abs(s1), Math.abs(s2));
  }
  
  const omegaD = omega0 * Math.sqrt(1 - zeta * zeta);
  const phi = Math.atan(Math.sqrt(1 - zeta * zeta) / zeta);
  
  return (Math.PI - phi) / omegaD;
};

export const calculateSettlingTime = (zeta: number, omega0: number, tolerance: number = 0.02): number => {
  if (zeta <= 0) return Infinity;
  
  const alpha = zeta * omega0;
  return -Math.log(tolerance * Math.sqrt(1 - zeta * zeta)) / alpha;
};
