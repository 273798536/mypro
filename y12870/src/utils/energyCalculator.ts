import type { WeatherForecast, EnergyDevice, SalinityRecord, ResultStatus } from '@/types';

const RHO = 1025;
const G = 9.81;

export function waveEnergyFlux(Hs: number, T: number): number {
  return 0.5 * RHO * G * (Hs ** 2) * T / 1000;
}

export function wavePowerPerMeter(Hs: number, T: number): number {
  return 0.975 * (Hs ** 2) * T;
}

export function deviceAnnualEnergy(device: EnergyDevice, weathers: WeatherForecast[]): {
  totalKwh: number; avgPowerKw: number; capacityFactor: number;
} {
  if (!weathers.length) return { totalKwh: 0, avgPowerKw: 0, capacityFactor: 0 };
  let totalKw = 0;
  weathers.forEach(w => {
    const flux = waveEnergyFlux(w.waveHeight, w.wavePeriod);
    totalKw += flux * device.efficiency;
  });
  const avgKw = totalKw / weathers.length;
  const capped = Math.min(avgKw, device.ratedPower);
  const totalKwh = capped * weathers.length;
  const cf = capped / device.ratedPower;
  return {
    totalKwh: +totalKwh.toFixed(0),
    avgPowerKw: +capped.toFixed(1),
    capacityFactor: +cf.toFixed(3),
  };
}

export function averageSalinityByDepth(records: SalinityRecord[], depthMin: number, depthMax: number): number | null {
  const filtered = records.filter(r =>
    (r.normalizedValue ?? r.value) != null && r.depth >= depthMin && r.depth <= depthMax
  );
  if (!filtered.length) return null;
  const sum = filtered.reduce((s, r) => s + (r.normalizedValue ?? r.value), 0);
  return +(sum / filtered.length).toFixed(2);
}

export function assessWeatherReliability(w: WeatherForecast[]): {
  score: number; status: ResultStatus; note: string;
} {
  if (!w.length) return { score: 0, status: 'RECOLLECT', note: '无气象数据' };
  const avg = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
  const avgHs = avg(w.map(x => x.waveHeight));
  const avgTp = avg(w.map(x => x.wavePeriod));
  const std = (a: number[]) => Math.sqrt(avg(a.map(v => (v - avg(a)) ** 2)));
  const cvHs = std(w.map(x => x.waveHeight)) / avgHs;
  const cvTp = std(w.map(x => x.wavePeriod)) / avgTp;
  const score = Math.max(0, 1 - (cvHs * 0.6 + cvTp * 0.4));
  let status: ResultStatus = 'AVAILABLE';
  let note = '预报数据完整，波动平稳';
  if (score < 0.55) { status = 'RECOLLECT'; note = '有效波高/周期波动过大，建议重新采集'; }
  else if (score < 0.8) { status = 'DEFERRED'; note = '数据波动中等，建议复核原始资料'; }
  return { score: +score.toFixed(2), status, note };
}
