import type { RCParams } from '../types';

export const rcModelVoltage = (t: number, I: number, params: RCParams): number => {
  const { ocv, R0, R1, C1 } = params;
  const tau1 = R1 * C1;
  return ocv - I * R0 - I * R1 * (1 - Math.exp(-t / tau1));
};

export const rcModelVoltageArray = (times: number[], I: number, params: RCParams): number[] => {
  return times.map(t => rcModelVoltage(t, I, params));
};

export const calculateTau1 = (R1: number, C1: number): number => {
  return R1 * C1;
};

export const jacobianRC = (t: number, I: number, params: RCParams): number[] => {
  const { R1, C1 } = params;
  const tau1 = R1 * C1;
  const expTerm = Math.exp(-t / tau1);
  const dTau1_dR1 = C1;
  const dTau1_dC1 = R1;
  const dExp_dTau = (t / (tau1 * tau1)) * expTerm;
  const dExp_dR1 = dExp_dTau * dTau1_dR1;
  const dExp_dC1 = dExp_dTau * dTau1_dC1;

  return [
    1,
    -I,
    -I * (1 - expTerm) - I * R1 * dExp_dR1,
    -I * R1 * dExp_dC1
  ];
};
