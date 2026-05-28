export interface HeatPumpParams {
  id: string;
  model: string;
  brand: string;
  ratedCOP: number;
  ratedOutdoorTemp: number;
  ratedSupplyWaterTemp: number;
  minOutdoorTemp: number;
  maxOutdoorTemp: number;
  ratedCapacity: number;
  powerInput: number;
  source: string;
}

export interface ElectricityPrice {
  peak: number;
  valley: number;
  flat: number;
}

export interface OperatingHours {
  peak: number;
  valley: number;
  flat: number;
}

export interface CalculationInput {
  outdoorTemp: number;
  supplyWaterTemp: number;
  heatPumpId: string;
  electricityPrice: ElectricityPrice;
  heatLoad: number;
  operatingHours: OperatingHours;
  sourceInfo: string;
}

export interface CalculationResult {
  cop: number;
  temperatureCorrectionFactor: number;
  capacity: number;
  powerConsumption: number;
  hourlyCost: {
    peak: number;
    valley: number;
    flat: number;
  };
  dailyCost: number;
  monthlyCost: number;
  annualCost: number;
  isValid: boolean;
}

export interface Revision {
  id: string;
  timestamp: number;
  field: string;
  oldValue: unknown;
  newValue: unknown;
  reason?: string;
}

export interface Scenario {
  id: string;
  name: string;
  timestamp: number;
  input: CalculationInput;
  result: CalculationResult;
  sourceInfo: string;
  revisionHistory: Revision[];
}

export interface RiskAlert {
  type: 'error' | 'warning' | 'info';
  field: string;
  message: string;
  suggestion: string;
}

export interface COPCurvePoint {
  temp: number;
  cop: number;
}

export interface CostCurvePoint {
  month: string;
  cost: number;
  temp: number;
}
