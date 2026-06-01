import type { Coil, MagneticSequence, MagneticDataPoint, Report } from '@/types';
import { performFullCalculation } from './calculator';
import { coilStorage, magneticStorage, reportStorage, historyStorage } from './storage';

const generateSinusoidalData = (
  amplitude: number,
  frequency: number,
  startTime: number,
  endTime: number,
  step: number,
  noiseLevel: number = 0.05
): MagneticDataPoint[] => {
  const data: MagneticDataPoint[] = [];
  for (let t = startTime; t <= endTime; t += step) {
    const noise = (Math.random() - 0.5) * noiseLevel * amplitude;
    const flux = amplitude * Math.sin(2 * Math.PI * frequency * t) + noise;
    data.push({ time: t, magneticFlux: flux });
  }
  return data;
};

const generatePulseData = (
  peakAmplitude: number,
  startTime: number,
  pulseWidth: number,
  totalTime: number,
  step: number
): MagneticDataPoint[] => {
  const data: MagneticDataPoint[] = [];
  for (let t = 0; t <= totalTime; t += step) {
    const distFromPeak = Math.abs(t - startTime);
    let flux = 0;
    if (distFromPeak < pulseWidth) {
      flux = peakAmplitude * (1 - distFromPeak / pulseWidth);
    }
    data.push({ time: t, magneticFlux: flux });
  }
  return data;
};

export const generateSampleData = () => {
  const sampleCoils: Omit<Coil, 'id' | 'createdAt' | 'updatedAt'>[] = [
    {
      name: '实验线圈 A-001',
      turns: 500,
      crossSection: 2,
      crossSectionUnit: 'cm²',
      resistance: 10,
      resistanceUnit: 'Ω',
      material: '铜线',
      remark: '标准实验线圈，用于课堂演示',
      status: 'normal',
    },
    {
      name: '精密线圈 B-002',
      turns: 2000,
      crossSection: 0.5,
      crossSectionUnit: 'cm²',
      resistance: 50,
      resistanceUnit: 'Ω',
      material: '漆包铜线',
      remark: '高匝数精密测量线圈',
      status: 'normal',
    },
    {
      name: '备用线圈 C-003',
      turns: 100,
      crossSection: 5,
      crossSectionUnit: 'cm²',
      resistance: 2,
      resistanceUnit: 'Ω',
      material: '粗铜线',
      remark: '低匝数大截面积线圈',
      status: 'normal',
    },
  ];

  const coils: Coil[] = [];
  sampleCoils.forEach(coil => {
    const saved = coilStorage.add(coil);
    coils.push(saved);
  });

  const sequences: MagneticSequence[] = [];

  const sinData = generateSinusoidalData(0.05, 10, 0, 0.5, 0.005);
  const seq1 = magneticStorage.add({
    coilId: coils[0].id,
    name: '正弦磁场序列 S-001',
    dataPoints: sinData,
    timeUnit: 's',
    magneticUnit: 'T',
    isSupplemented: false,
    remark: '标准正弦变化磁场，50Hz',
    status: 'complete',
  });
  sequences.push(seq1);

  const pulseData = generatePulseData(0.08, 0.02, 0.05, 0.1, 0.001);
  const seq2 = magneticStorage.add({
    coilId: coils[0].id,
    name: '脉冲磁场序列 P-001',
    dataPoints: pulseData,
    timeUnit: 's',
    magneticUnit: 'T',
    isSupplemented: false,
    remark: '单脉冲磁场',
    status: 'complete',
  });
  sequences.push(seq2);

  const partialData = generateSinusoidalData(0.03, 5, 0, 0.2, 0.005).slice(0, 20);
  const seq3 = magneticStorage.add({
    coilId: coils[1].id,
    name: '部分数据序列 D-001（待补录）',
    dataPoints: partialData,
    timeUnit: 's',
    magneticUnit: 'T',
    isSupplemented: false,
    remark: '数据采集中断，需要补录',
    status: 'partial',
  });
  sequences.push(seq3);

  const anomalyData = generateSinusoidalData(0.06, 8, 0, 0.3, 0.003);
  anomalyData[15] = { ...anomalyData[15], magneticFlux: anomalyData[15].magneticFlux * 0.1 };
  anomalyData[30] = { ...anomalyData[30], magneticFlux: -anomalyData[30].magneticFlux };
  const seq4 = magneticStorage.add({
    coilId: coils[0].id,
    name: '异常数据检测测试 A-001',
    dataPoints: anomalyData,
    timeUnit: 's',
    magneticUnit: 'T',
    isSupplemented: false,
    remark: '用于测试异常检测功能，包含匝数缺失模拟和磁通反向',
    status: 'complete',
  });
  sequences.push(seq4);

  const reports: Report[] = [];
  for (let i = 0; i < Math.min(sequences.length, 3); i++) {
    const coil = coils[i % coils.length];
    const sequence = sequences[i];
    
    const calcResult = performFullCalculation(coil, sequence, 'mV');

    const report = reportStorage.add({
      coilId: coil.id,
      magneticId: sequence.id,
      name: `测算报告 R-${String(i + 1).padStart(3, '0')}`,
      ...calcResult,
      emfUnit: 'mV',
      remark: calcResult.anomalies.length > 0 ? '检测到数据异常，请仔细检查' : '数据正常',
    });
    reports.push(report);
  }

  historyStorage.add({
    operationType: 'create',
    operationDetail: '创建线圈参数 "实验线圈 A-001"',
    affectedItems: ['线圈参数'],
    operator: '系统',
  });
  historyStorage.add({
    operationType: 'create',
    operationDetail: '导入磁场序列 "正弦磁场序列 S-001"',
    affectedItems: ['磁场数据'],
    operator: '系统',
  });
  historyStorage.add({
    operationType: 'supplement',
    operationDetail: '补录磁场数据点 3 个',
    affectedItems: ['数据点 #15', '#16', '#17'],
    operator: '张教练',
  });
  historyStorage.add({
    operationType: 'recalculate',
    operationDetail: '重新计算测算报告',
    affectedItems: ['测算报告 R-001'],
    operator: '李教练',
  });
  historyStorage.add({
    operationType: 'update',
    operationDetail: '修改备注：异常数据检测测试 A-001',
    affectedItems: ['磁场数据'],
    operator: '王教练',
  });

  return { coils, sequences, reports };
};
