import type { AngularVelocityRecord, SamplingGap } from '../types';

function generateVelocityData(
  flywheelId: string,
  startTime: number,
  endTime: number,
  interval: number,
  maxOmega: number,
  hasGap: boolean = false,
  gapStart?: number,
  gapEnd?: number
): { records: AngularVelocityRecord[]; gaps: SamplingGap[] } {
  const records: AngularVelocityRecord[] = [];
  const gaps: SamplingGap[] = [];
  
  let idCounter = 0;
  let prevOmega = 0;
  
  for (let t = startTime; t <= endTime; t += interval) {
    if (hasGap && gapStart && gapEnd && t >= gapStart && t <= gapEnd) {
      if (t === gapStart) {
        gaps.push({
          id: `gap-${flywheelId}-${idCounter}`,
          flywheelId,
          startTime: gapStart,
          endTime: gapEnd,
          duration: gapEnd - gapStart,
          materialInvolved: flywheelId === 'fw-002' ? '铸铁' : '铝合金',
          reason: 'data_loss',
          isInterpolated: false,
        });
      }
      continue;
    }
    
    const progress = (t - startTime) / (endTime - startTime);
    const omega = maxOmega * Math.sin(progress * Math.PI * 0.8) + maxOmega * 0.2;
    const alpha = (omega - prevOmega) / interval;
    const torque = 150 * alpha + 10 * omega;
    
    records.push({
      id: `vel-${flywheelId}-${idCounter++}`,
      flywheelId,
      timestamp: parseFloat(t.toFixed(2)),
      omega: parseFloat(omega.toFixed(4)),
      alpha: parseFloat(alpha.toFixed(4)),
      torque: parseFloat(torque.toFixed(2)),
      source: 'sensor',
      isValid: true,
    });
    
    prevOmega = omega;
  }
  
  return { records, gaps };
}

const data1 = generateVelocityData('fw-001', 0, 20, 0.2, 120);
const data2 = generateVelocityData('fw-002', 0, 18, 0.2, 95, true, 8.2, 10.6);
const data3 = generateVelocityData('fw-003', 0, 15, 0.2, 140, true, 12.3, 14.7);

export const mockVelocities: AngularVelocityRecord[] = [
  ...data1.records,
  ...data2.records,
  ...data3.records,
];

export const mockGaps: SamplingGap[] = [
  ...data1.gaps,
  ...data2.gaps,
  ...data3.gaps,
];
