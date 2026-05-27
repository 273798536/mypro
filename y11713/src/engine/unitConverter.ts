import { ResistanceUnit, InductanceUnit, CapacitanceUnit } from '../types';

export const resistanceToBase = (value: number, unit: ResistanceUnit): number => {
  const multipliers: Record<ResistanceUnit, number> = {
    ohm: 1,
    kohm: 1000,
    mohm: 1000000,
  };
  return value * multipliers[unit];
};

export const inductanceToBase = (value: number, unit: InductanceUnit): number => {
  const multipliers: Record<InductanceUnit, number> = {
    h: 1,
    mh: 0.001,
    uh: 0.000001,
  };
  return value * multipliers[unit];
};

export const capacitanceToBase = (value: number, unit: CapacitanceUnit): number => {
  const multipliers: Record<CapacitanceUnit, number> = {
    f: 1,
    uf: 0.000001,
    nf: 0.000000001,
    pf: 0.000000000001,
  };
  return value * multipliers[unit];
};

export const formatResistance = (ohms: number): { value: number; unit: ResistanceUnit } => {
  if (ohms >= 1000000) {
    return { value: ohms / 1000000, unit: 'mohm' };
  } else if (ohms >= 1000) {
    return { value: ohms / 1000, unit: 'kohm' };
  }
  return { value: ohms, unit: 'ohm' };
};

export const formatInductance = (henries: number): { value: number; unit: InductanceUnit } => {
  if (henries >= 1) {
    return { value: henries, unit: 'h' };
  } else if (henries >= 0.001) {
    return { value: henries / 0.001, unit: 'mh' };
  }
  return { value: henries / 0.000001, unit: 'uh' };
};

export const formatCapacitance = (farads: number): { value: number; unit: CapacitanceUnit } => {
  if (farads >= 1) {
    return { value: farads, unit: 'f' };
  } else if (farads >= 0.000001) {
    return { value: farads / 0.000001, unit: 'uf' };
  } else if (farads >= 0.000000001) {
    return { value: farads / 0.000000001, unit: 'nf' };
  }
  return { value: farads / 0.000000000001, unit: 'pf' };
};

export const getUnitLabel = (unit: ResistanceUnit | InductanceUnit | CapacitanceUnit): string => {
  const labels: Record<string, string> = {
    ohm: 'Ω',
    kohm: 'kΩ',
    mohm: 'MΩ',
    h: 'H',
    mh: 'mH',
    uh: 'μH',
    f: 'F',
    uf: 'μF',
    nf: 'nF',
    pf: 'pF',
  };
  return labels[unit] || unit;
};

export const detectUnitMismatch = (
  rUnit: ResistanceUnit,
  lUnit: InductanceUnit,
  cUnit: CapacitanceUnit
): { hasMismatch: boolean; suggestion: string } => {
  const rBase = resistanceToBase(1, rUnit);
  const lBase = inductanceToBase(1, lUnit);
  const cBase = capacitanceToBase(1, cUnit);
  
  const timeConstant = Math.sqrt(lBase * cBase);
  const impedanceRatio = rBase * Math.sqrt(cBase / lBase);
  
  if (impedanceRatio > 10000 || impedanceRatio < 0.0001) {
    return {
      hasMismatch: true,
      suggestion: '检测到单位量级不匹配，建议调整电阻、电感、电容的单位使其在相近量级范围内计算',
    };
  }
  
  return { hasMismatch: false, suggestion: '' };
};

export const validateParameterRange = (
  type: 'resistance' | 'inductance' | 'capacitance',
  value: number,
  unit: ResistanceUnit | InductanceUnit | CapacitanceUnit
): { valid: boolean; message: string } => {
  const baseValue = type === 'resistance' 
    ? resistanceToBase(value, unit as ResistanceUnit)
    : type === 'inductance'
    ? inductanceToBase(value, unit as InductanceUnit)
    : capacitanceToBase(value, unit as CapacitanceUnit);
  
  const ranges: Record<string, { min: number; max: number; unit: string }> = {
    resistance: { min: 0.001, max: 100000000, unit: 'Ω' },
    inductance: { min: 0.000000001, max: 100, unit: 'H' },
    capacitance: { min: 0.000000000000001, max: 1, unit: 'F' },
  };
  
  const range = ranges[type];
  
  if (baseValue <= 0) {
    return { valid: false, message: `${type === 'resistance' ? '电阻' : type === 'inductance' ? '电感' : '电容'}值必须大于0` };
  }
  
  if (baseValue < range.min || baseValue > range.max) {
    return {
      valid: false,
      message: `${type === 'resistance' ? '电阻' : type === 'inductance' ? '电感' : '电容'}值超出合理范围(${range.min}-${range.max} ${range.unit})`,
    };
  }
  
  return { valid: true, message: '' };
};
