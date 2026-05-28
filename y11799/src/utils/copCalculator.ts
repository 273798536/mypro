import { HeatPumpParams, CalculationInput, CalculationResult, COPCurvePoint, CostCurvePoint } from '@/types';

const TEMP_OUTDOOR_COEFFICIENT = 0.015;
const TEMP_WATER_COEFFICIENT = 0.012;
const MIN_CORRECTION_FACTOR = 0.4;
const MAX_CORRECTION_FACTOR = 1.2;

export const calculateTemperatureCorrectionFactor = (
  outdoorTemp: number,
  supplyWaterTemp: number,
  heatPump: HeatPumpParams
): number => {
  const outdoorDeviation = Math.abs(outdoorTemp - heatPump.ratedOutdoorTemp);
  const waterDeviation = Math.abs(supplyWaterTemp - heatPump.ratedSupplyWaterTemp);

  let factor = 1
    - TEMP_OUTDOOR_COEFFICIENT * outdoorDeviation
    - TEMP_WATER_COEFFICIENT * waterDeviation;

  if (outdoorTemp < heatPump.ratedOutdoorTemp) {
    factor -= TEMP_OUTDOOR_COEFFICIENT * 0.5 * (heatPump.ratedOutdoorTemp - outdoorTemp);
  }

  return Math.max(MIN_CORRECTION_FACTOR, Math.min(MAX_CORRECTION_FACTOR, factor));
};

export const calculateCOP = (
  outdoorTemp: number,
  supplyWaterTemp: number,
  heatPump: HeatPumpParams
): number => {
  const correctionFactor = calculateTemperatureCorrectionFactor(
    outdoorTemp,
    supplyWaterTemp,
    heatPump
  );
  return heatPump.ratedCOP * correctionFactor;
};

export const calculateResult = (
  input: CalculationInput,
  heatPump: HeatPumpParams
): CalculationResult => {
  const temperatureCorrectionFactor = calculateTemperatureCorrectionFactor(
    input.outdoorTemp,
    input.supplyWaterTemp,
    heatPump
  );

  const cop = heatPump.ratedCOP * temperatureCorrectionFactor;
  const capacity = heatPump.ratedCapacity * temperatureCorrectionFactor;
  const powerConsumption = input.heatLoad / cop;

  const hourlyCost = {
    peak: powerConsumption * input.electricityPrice.peak,
    valley: powerConsumption * input.electricityPrice.valley,
    flat: powerConsumption * input.electricityPrice.flat
  };

  const dailyCost =
    hourlyCost.peak * input.operatingHours.peak +
    hourlyCost.valley * input.operatingHours.valley +
    hourlyCost.flat * input.operatingHours.flat;

  const monthlyCost = dailyCost * 30;
  const annualCost = dailyCost * 365;

  return {
    cop: Number(cop.toFixed(2)),
    temperatureCorrectionFactor: Number(temperatureCorrectionFactor.toFixed(3)),
    capacity: Number(capacity.toFixed(2)),
    powerConsumption: Number(powerConsumption.toFixed(2)),
    hourlyCost: {
      peak: Number(hourlyCost.peak.toFixed(2)),
      valley: Number(hourlyCost.valley.toFixed(2)),
      flat: Number(hourlyCost.flat.toFixed(2))
    },
    dailyCost: Number(dailyCost.toFixed(2)),
    monthlyCost: Number(monthlyCost.toFixed(2)),
    annualCost: Number(annualCost.toFixed(2)),
    isValid: true
  };
};

export const generateCOPCurve = (
  heatPump: HeatPumpParams,
  supplyWaterTemp: number,
  minTemp?: number,
  maxTemp?: number
): COPCurvePoint[] => {
  const points: COPCurvePoint[] = [];
  const start = minTemp ?? heatPump.minOutdoorTemp;
  const end = maxTemp ?? heatPump.maxOutdoorTemp;
  const step = (end - start) / 20;

  for (let temp = start; temp <= end; temp += step) {
    const cop = calculateCOP(temp, supplyWaterTemp, heatPump);
    points.push({
      temp: Number(temp.toFixed(1)),
      cop: Number(cop.toFixed(2))
    });
  }

  return points;
};

export const generateAnnualCostCurve = (
  input: CalculationInput,
  heatPump: HeatPumpParams,
  monthlyTemperatures: { month: string; avgTemp: number; heatingDays: number }[]
): CostCurvePoint[] => {
  return monthlyTemperatures.map(item => {
    if (item.heatingDays === 0) {
      return {
        month: item.month,
        cost: 0,
        temp: item.avgTemp
      };
    }

    const cop = calculateCOP(item.avgTemp, input.supplyWaterTemp, heatPump);
    const powerConsumption = input.heatLoad / cop;
    const dailyHours = input.operatingHours.peak + input.operatingHours.valley + input.operatingHours.flat;
    const avgPrice = (
      input.electricityPrice.peak * input.operatingHours.peak +
      input.electricityPrice.valley * input.operatingHours.valley +
      input.electricityPrice.flat * input.operatingHours.flat
    ) / dailyHours;

    const monthlyCost = powerConsumption * dailyHours * avgPrice * item.heatingDays;

    return {
      month: item.month,
      cost: Number(monthlyCost.toFixed(2)),
      temp: item.avgTemp
    };
  });
};
