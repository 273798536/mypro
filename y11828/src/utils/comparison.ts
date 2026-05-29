import type { RunResult, ComparisonResult, MinecartConfig } from '../types/game';

export function compareRuns(
  runA: RunResult,
  runB: RunResult
): ComparisonResult[] {
  const results: ComparisonResult[] = [];

  const fields = [
    { key: 'success', label: '任务完成', isBoolean: true },
    { key: 'totalTime', label: '总耗时' },
    { key: 'finalEnergy', label: '剩余能量' },
    { key: 'oreCollected', label: '收集矿石' },
    { key: 'maxSpeed', label: '最高速度' },
    { key: 'energyUsed', label: '消耗能量' },
  ];

  fields.forEach(({ key, label, isBoolean }) => {
    const oldValue = runA[key as keyof RunResult];
    const newValue = runB[key as keyof RunResult];

    if (isBoolean) {
      const change = (newValue ? 1 : 0) - (oldValue ? 1 : 0);
      let impact: 'positive' | 'negative' | 'neutral' = 'neutral';
      if (key === 'success') {
        impact = change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral';
      }
      results.push({
        field: label,
        oldValue: oldValue as boolean,
        newValue: newValue as boolean,
        change,
        impact,
      });
    } else {
      const oldNum = oldValue as number;
      const newNum = newValue as number;
      const change = newNum - oldNum;
      const percentChange = oldNum > 0 ? (change / oldNum) * 100 : 0;

      let impact: 'positive' | 'negative' | 'neutral' = 'neutral';
      if (key === 'totalTime' || key === 'energyUsed') {
        impact = change < 0 ? 'positive' : change > 0 ? 'negative' : 'neutral';
      } else if (key === 'finalEnergy' || key === 'oreCollected' || key === 'maxSpeed') {
        impact = change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral';
      }

      results.push({
        field: label,
        oldValue: oldNum.toFixed(2),
        newValue: newNum.toFixed(2),
        change: percentChange,
        impact,
      });
    }
  });

  return results;
}

export function analyzeParameterImpact(
  oldConfig: MinecartConfig,
  newConfig: MinecartConfig,
  oldResult: RunResult,
  newResult: RunResult
): {
  parameter: string;
  affectedMetrics: string[];
  correlation: number;
}[] {
  const analysis: {
    parameter: string;
    affectedMetrics: string[];
    correlation: number;
  }[] = [];

  const params: { key: keyof MinecartConfig; label: string }[] = [
    { key: 'mass', label: '质量' },
    { key: 'friction', label: '摩擦系数' },
    { key: 'energyConsumption', label: '能耗' },
    { key: 'maxSpeed', label: '最大速度' },
    { key: 'acceleration', label: '加速度' },
  ];

  params.forEach(({ key, label }) => {
    const oldVal = oldConfig[key];
    const newVal = newConfig[key];

    if (oldVal !== newVal) {
      const affectedMetrics: string[] = [];
      let correlation = 0;

      if (key === 'energyConsumption') {
        const energyChange = newResult.energyUsed - oldResult.energyUsed;
        const paramChange = (Number(newVal) - Number(oldVal)) / Number(oldVal);
        correlation = paramChange > 0 && energyChange > 0 ? 0.8 : 0;
        if (Math.abs(energyChange) > 5) {
          affectedMetrics.push('消耗能量');
        }
        if (newResult.success !== oldResult.success && Number(newVal) > Number(oldVal)) {
          affectedMetrics.push('任务完成率');
        }
      }

      if (key === 'maxSpeed') {
        const speedChange = newResult.maxSpeed - oldResult.maxSpeed;
        correlation = speedChange > 0 ? 0.9 : 0;
        if (Math.abs(speedChange) > 10) {
          affectedMetrics.push('最高速度');
        }
        const timeChange = newResult.totalTime - oldResult.totalTime;
        if (Math.abs(timeChange) > 5) {
          affectedMetrics.push('总耗时');
        }
      }

      if (key === 'acceleration') {
        const timeChange = newResult.totalTime - oldResult.totalTime;
        correlation = timeChange < 0 ? 0.7 : 0;
        if (Math.abs(timeChange) > 3) {
          affectedMetrics.push('总耗时');
        }
      }

      if (key === 'mass') {
        const speedChange = newResult.maxSpeed - oldResult.maxSpeed;
        const paramChange = (Number(newVal) - Number(oldVal)) / Number(oldVal);
        correlation = paramChange > 0 && speedChange < 0 ? 0.6 : 0;
        if (Math.abs(speedChange) > 5) {
          affectedMetrics.push('最高速度');
        }
        const energyChange = newResult.energyUsed - oldResult.energyUsed;
        if (Math.abs(energyChange) > 3) {
          affectedMetrics.push('消耗能量');
        }
      }

      analysis.push({
        parameter: label,
        affectedMetrics,
        correlation,
      });
    }
  });

  return analysis;
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatEnergy(energy: number): string {
  return `${energy.toFixed(1)} kJ`;
}
