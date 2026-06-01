export const convertToMeters = (value: number, unit: 'mm' | 'cm' | 'm'): number => {
  switch (unit) {
    case 'mm':
      return value / 1000;
    case 'cm':
      return value / 100;
    case 'm':
      return value;
    default:
      return value;
  }
};

export const convertFromMeters = (value: number, unit: 'mm' | 'cm' | 'm'): number => {
  switch (unit) {
    case 'mm':
      return value * 1000;
    case 'cm':
      return value * 100;
    case 'm':
      return value;
    default:
      return value;
  }
};

export const detectUnitMismatch = (
  inputValue: string,
  inputUnit: string,
  expectedValue: number,
  expectedUnit: string
): boolean => {
  const inputNum = parseFloat(inputValue);
  if (isNaN(inputNum)) return false;
  
  const inputInMeters = convertToMeters(inputNum, inputUnit as 'mm' | 'cm' | 'm');
  const expectedInMeters = convertToMeters(expectedValue, expectedUnit as 'mm' | 'cm' | 'm');
  
  const tolerance = 0.001;
  return Math.abs(inputInMeters - expectedInMeters) > tolerance;
};

export const formatInertia = (value: number): string => {
  return value.toFixed(4);
};

export const formatTorque = (value: number): string => {
  return value.toFixed(2);
};

export const formatOmega = (value: number): string => {
  return value.toFixed(2);
};

export const formatAlpha = (value: number): string => {
  return value.toFixed(4);
};

export const formatDeviation = (value: number): string => {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
};
