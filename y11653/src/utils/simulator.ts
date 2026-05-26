import type { WaterQuality, Chemical, AnomalyEvent, AnomalyType } from '@/types';

const WATER_VOLUME = 1000;
const MIXING_ENERGY_COST = 0.5;

interface SimulationResult {
  newQuality: WaterQuality;
  cost: number;
  anomalies: AnomalyType[];
  anomalyEvents: AnomalyEvent[];
  reboundEffects: {
    indicator: keyof WaterQuality;
    remainingSteps: number;
    magnitude: number;
  }[];
}

export function calculateTreatment(
  currentQuality: WaterQuality,
  chemical: Chemical,
  dosage: number,
  mixingTime: number,
  existingRebound: { indicator: keyof WaterQuality; remainingSteps: number; magnitude: number }[]
): SimulationResult {
  const anomalies: AnomalyType[] = [];
  const anomalyEvents: AnomalyEvent[] = [];
  const newRebound: { indicator: keyof WaterQuality; remainingSteps: number; magnitude: number }[] = [];

  const [minDosage, maxDosage] = chemical.dosageRange;
  const isOverdose = dosage > maxDosage * 1.5;
  const isUnderMixing = mixingTime < 5;

  let efficiencyMultiplier = 1;
  let costMultiplier = 1;

  if (isOverdose) {
    anomalies.push('overdose');
    efficiencyMultiplier = 0.5;
    costMultiplier = 1.5;
    anomalyEvents.push({
      id: `anomaly-${Date.now()}-overdose`,
      type: 'overdose',
      timestamp: Date.now(),
      severity: 'danger',
      message: '投药过量！药剂使用量超出推荐范围1.5倍以上',
      suggestion: '请将投药量调整至推荐范围内，过量投药会导致药剂浪费和指标反弹',
    });

    chemical.targetIndicators.forEach((indicator) => {
      if (indicator !== 'ph') {
        newRebound.push({
          indicator,
          remainingSteps: 2 + Math.floor(Math.random() * 2),
          magnitude: 0.15 + Math.random() * 0.1,
        });
      }
    });
  } else if (dosage > maxDosage) {
    efficiencyMultiplier = 0.9;
    anomalyEvents.push({
      id: `anomaly-${Date.now()}-highdosage`,
      type: 'overdose',
      timestamp: Date.now(),
      severity: 'warning',
      message: '投药量偏高，接近上限',
      suggestion: '建议适当降低投药量，在保证处理效果的同时控制成本',
    });
  }

  if (isUnderMixing) {
    anomalies.push('insufficient_mixing');
    efficiencyMultiplier *= 0.5;
    anomalyEvents.push({
      id: `anomaly-${Date.now()}-mixing`,
      type: 'insufficient_mixing',
      timestamp: Date.now(),
      severity: 'warning',
      message: '搅拌时间不足，药剂混合不充分',
      suggestion: '建议搅拌时间不少于5分钟，确保药剂与污水充分反应',
    });
  }

  const newQuality: WaterQuality = { ...currentQuality };

  chemical.targetIndicators.forEach((indicator) => {
    if (indicator === 'ph') {
      if (chemical.id === 'lime') {
        newQuality.ph = Math.min(10, newQuality.ph + dosage / 100);
      }
    } else {
      const dosageRatio = Math.min(dosage / maxDosage, 1.5);
      const removalRate = chemical.efficiency * efficiencyMultiplier * Math.min(dosageRatio, 1);
      const removal = currentQuality[indicator] * removalRate * 0.6;
      newQuality[indicator] = Math.max(0, currentQuality[indicator] - removal);
    }
  });

  existingRebound.forEach((effect) => {
    const reboundAmount = currentQuality[effect.indicator] * effect.magnitude;
    newQuality[effect.indicator] += reboundAmount;

    if (effect.remainingSteps > 1) {
      newRebound.push({
        indicator: effect.indicator,
        remainingSteps: effect.remainingSteps - 1,
        magnitude: effect.magnitude * 0.8,
      });
    } else {
      anomalies.push('rebound');
      anomalyEvents.push({
        id: `anomaly-${Date.now()}-rebound`,
        type: 'rebound',
        timestamp: Date.now(),
        severity: 'warning',
        message: '指标反弹！前期过量投药的后果显现',
        suggestion: '过量投药会导致微生物群落失衡，需要多个周期才能恢复',
      });
    }
  });

  if (newQuality.ph < 5 || newQuality.ph > 10) {
    anomalies.push('ph_extreme');
    anomalyEvents.push({
      id: `anomaly-${Date.now()}-ph`,
      type: 'ph_extreme',
      timestamp: Date.now(),
      severity: 'danger',
      message: `pH值异常（${newQuality.ph.toFixed(1)}），超出微生物存活范围`,
      suggestion: '立即调整pH值至6-9范围内，否则生物处理系统将崩溃',
    });
  }

  const chemicalCost = (dosage * WATER_VOLUME * chemical.unitPrice) / 1000000;
  const mixingCost = mixingTime * MIXING_ENERGY_COST;
  const totalCost = (chemicalCost + mixingCost) * costMultiplier;

  return {
    newQuality,
    cost: totalCost,
    anomalies,
    anomalyEvents,
    reboundEffects: newRebound,
  };
}

export function generateRandomInlet(): WaterQuality {
  return {
    cod: 100 + Math.random() * 80,
    ammonia: 20 + Math.random() * 20,
    totalPhosphorus: 2.5 + Math.random() * 2,
    totalNitrogen: 35 + Math.random() * 20,
    ph: 6.5 + Math.random() * 1.5,
    turbidity: 60 + Math.random() * 50,
  };
}
