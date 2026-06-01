import {
  generateId,
  randomRange,
  randomInt,
  randomChoice,
  addDays,
  addSeconds,
  formatDateOnly,
  calculateEfficiency,
  calculateOutputPower,
  formatAnomalyMessage,
} from '@/utils/helpers';
import type {
  Material,
  TestBench,
  WorkingConditionSegment,
  SegmentScheme,
  VoltageCurrentData,
  TemperatureData,
  SpeedTorqueData,
  EfficiencyReport,
  AnomalyRecord,
  CorrectionLog,
  CaliberConfig,
  ThresholdConfig,
  AnomalyType,
  TemperatureObjectType,
} from '@/types';

const MATERIALS_DATA: Omit<Material, 'id'>[] = [
  { code: 'CU-001', name: '紫铜T1', type: 'copper', temperatureLimit: 105, powerRange: [0, 500], speedSampleInterval: 100 },
  { code: 'CU-002', name: '黄铜H62', type: 'copper', temperatureLimit: 100, powerRange: [0, 400], speedSampleInterval: 100 },
  { code: 'AL-001', name: '纯铝1060', type: 'aluminum', temperatureLimit: 90, powerRange: [0, 300], speedSampleInterval: 100 },
  { code: 'AL-002', name: '铝合金6061', type: 'aluminum', temperatureLimit: 95, powerRange: [0, 350], speedSampleInterval: 100 },
  { code: 'ST-001', name: '硅钢片35Q155', type: 'steel', temperatureLimit: 120, powerRange: [0, 600], speedSampleInterval: 100 },
  { code: 'ST-002', name: '硅钢片50W470', type: 'steel', temperatureLimit: 115, powerRange: [0, 550], speedSampleInterval: 100 },
  { code: 'ST-003', name: '不锈钢304', type: 'steel', temperatureLimit: 130, powerRange: [0, 450], speedSampleInterval: 100 },
  { code: 'OT-001', name: '复合材料', type: 'other', temperatureLimit: 85, powerRange: [0, 250], speedSampleInterval: 100 },
];

const TEST_BENCHES_DATA: Omit<TestBench, 'id' | 'lastUpdate'>[] = [
  { name: '效率测试台#1', code: 'TB-001', status: 'online' },
  { name: '效率测试台#2', code: 'TB-002', status: 'online' },
  { name: '效率测试台#3', code: 'TB-003', status: 'online' },
  { name: '效率测试台#4', code: 'TB-004', status: 'offline' },
  { name: '效率测试台#5', code: 'TB-005', status: 'offline' },
  { name: '效率测试台#6', code: 'TB-006', status: 'maintenance' },
];

const SEGMENTS_DATA: Omit<WorkingConditionSegment, 'id'>[] = [
  { name: '低速段', order: 0, speedRange: [0, 1000], torqueRange: [0, 50], color: '#3B82F6' },
  { name: '中速段', order: 1, speedRange: [1000, 2000], torqueRange: [50, 100], color: '#8B5CF6' },
  { name: '高速段', order: 2, speedRange: [2000, 3000], torqueRange: [100, 150], color: '#10B981' },
  { name: '超高速段', order: 3, speedRange: [3000, 4000], torqueRange: [150, 200], color: '#F59E0B' },
];

const CALIBER_CONFIGS: Omit<CaliberConfig, 'id'>[] = [
  { name: '电压有效值', type: 'voltage', formula: 'U = Vrms', unit: 'V', precision: 2, isSystemDefault: true, description: '交流电压真有效值测量' },
  { name: '电流有效值', type: 'current', formula: 'I = Irms', unit: 'A', precision: 3, isSystemDefault: true, description: '交流电流真有效值测量' },
  { name: '有功功率', type: 'power', formula: 'P = U*I*cosφ', unit: 'kW', precision: 4, isSystemDefault: true, description: '有功功率计算，包含功率因数' },
  { name: '平均温度', type: 'temperature', formula: 'Tavg = Σ(Ti)/n', unit: '°C', precision: 1, isSystemDefault: true, description: '多点温度平均值' },
  { name: '效率', type: 'efficiency', formula: 'η = Pout/Pin × 100%', unit: '%', precision: 2, isSystemDefault: true, description: '输出功率与输入功率之比' },
];

const OPERATORS = ['张工', '李工', '王工', '赵工', '刘工'];
const CORRECTION_REASONS = [
  '转速传感器漂移修正',
  '扭矩零点校准',
  '数据异常手动修正',
  '与历史数据偏差过大',
  '传感器临时故障',
];

export function generateMaterials(): Material[] {
  return MATERIALS_DATA.map(m => ({ ...m, id: generateId() }));
}

export function generateTestBenches(): TestBench[] {
  const now = new Date();
  return TEST_BENCHES_DATA.map(tb => ({
    ...tb,
    id: generateId(),
    lastUpdate: addSeconds(now, -randomInt(0, 3600)),
  }));
}

export function generateSegments(): WorkingConditionSegment[] {
  return SEGMENTS_DATA.map(s => ({ ...s, id: generateId() }));
}

export function generateSegmentScheme(segments: WorkingConditionSegment[]): SegmentScheme {
  return {
    id: generateId(),
    name: '标准工况分段方案',
    segments,
    isActive: true,
    createdAt: new Date(),
    createdBy: randomChoice(OPERATORS),
  };
}

export function generateCaliberConfigs(): CaliberConfig[] {
  return CALIBER_CONFIGS.map(c => ({ ...c, id: generateId() }));
}

export function generateThresholdConfigs(materials: Material[]): ThresholdConfig[] {
  return materials.map(m => ({
    materialId: m.id,
    temperatureLimit: m.temperatureLimit,
    powerMin: m.powerRange[0],
    powerMax: m.powerRange[1],
    speedSampleInterval: m.speedSampleInterval,
  }));
}

function getSegmentForValue(
  speed: number,
  torque: number,
  segments: WorkingConditionSegment[]
): string {
  for (const seg of segments) {
    if (speed >= seg.speedRange[0] && speed < seg.speedRange[1] &&
        torque >= seg.torqueRange[0] && torque < seg.torqueRange[1]) {
      return seg.id;
    }
  }
  return segments[segments.length - 1].id;
}

export function generateTimeSeriesData(
  testBenches: TestBench[],
  materials: Material[],
  segments: WorkingConditionSegment[],
  days: number = 30
): {
  voltageData: VoltageCurrentData[];
  temperatureData: TemperatureData[];
  speedData: SpeedTorqueData[];
} {
  const voltageData: VoltageCurrentData[] = [];
  const temperatureData: TemperatureData[] = [];
  const speedData: SpeedTorqueData[] = [];
  
  const startTime = addDays(new Date(), -days);
  const interval = 1;
  const totalPoints = days * 24 * 60 * 3;
  
  const onlineBenches = testBenches.filter(tb => tb.status === 'online');
  
  for (let i = 0; i < totalPoints; i++) {
    const timestamp = addSeconds(startTime, i * interval * 20);
    
    for (const tb of onlineBenches) {
      for (const material of materials.slice(0, 3)) {
        const segmentIndex = Math.floor((i / (totalPoints / segments.length)) % segments.length);
        const segment = segments[segmentIndex];
        
        const baseSpeed = randomRange(segment.speedRange[0], segment.speedRange[1]);
        const baseTorque = randomRange(segment.torqueRange[0], segment.torqueRange[1]);
        const segmentId = segment.id;
        
        const isSpeedMissing = Math.random() < 0.05;
        const speed = isSpeedMissing ? 0 : baseSpeed + randomRange(-10, 10);
        const torque = isSpeedMissing ? 0 : baseTorque + randomRange(-2, 2);
        
        speedData.push({
          id: generateId(),
          testBenchId: tb.id,
          materialId: material.id,
          timestamp,
          speed,
          torque,
          isMissing: isSpeedMissing,
          segmentId,
        });
        
        const baseVoltage = 380 + randomRange(-5, 5);
        const baseCurrent = randomRange(10, 50);
        let power = (baseVoltage * baseCurrent) / 1000;
        
        if (Math.random() < 0.02) {
          power = -power;
        }
        
        voltageData.push({
          id: generateId(),
          testBenchId: tb.id,
          materialId: material.id,
          timestamp,
          voltage: baseVoltage,
          current: baseCurrent,
          power,
          segmentId,
        });
        
        const tempObjects: TemperatureObjectType[] = ['winding', 'bearing', 'housing'];
        for (const objType of tempObjects) {
          let baseTemp = 60;
          if (objType === 'winding') baseTemp = 80 + segmentIndex * 5;
          else if (objType === 'bearing') baseTemp = 65 + segmentIndex * 3;
          else baseTemp = 50 + segmentIndex * 2;
          
          if (Math.random() < 0.03 && segmentIndex >= 2) {
            baseTemp += 20 + randomRange(0, 15);
          }
          
          temperatureData.push({
            id: generateId(),
            testBenchId: tb.id,
            materialId: material.id,
            timestamp,
            objectType: objType,
            temperature: baseTemp + randomRange(-3, 3),
            segmentId,
          });
        }
      }
    }
  }
  
  return { voltageData, temperatureData, speedData };
}

export function generateEfficiencyReports(
  testBenches: TestBench[],
  materials: Material[],
  segments: WorkingConditionSegment[],
  voltageData: VoltageCurrentData[],
  speedData: SpeedTorqueData[]
): EfficiencyReport[] {
  const reports: EfficiencyReport[] = [];
  const onlineBenches = testBenches.filter(tb => tb.status === 'online');
  
  for (const tb of onlineBenches) {
    for (const material of materials.slice(0, 3)) {
      for (const segment of segments) {
        const segVoltageData = voltageData.filter(
          d => d.testBenchId === tb.id && d.materialId === material.id && d.segmentId === segment.id
        );
        const segSpeedData = speedData.filter(
          d => d.testBenchId === tb.id && d.materialId === material.id && d.segmentId === segment.id
        );
        
        if (segVoltageData.length === 0 || segSpeedData.length === 0) continue;
        
        const avgInputPower = segVoltageData.reduce((sum, d) => sum + Math.abs(d.power), 0) / segVoltageData.length;
        const avgSpeed = segSpeedData.filter(d => !d.isMissing).reduce((sum, d) => sum + d.speed, 0) / 
                        Math.max(1, segSpeedData.filter(d => !d.isMissing).length);
        const avgTorque = segSpeedData.filter(d => !d.isMissing).reduce((sum, d) => sum + d.torque, 0) / 
                         Math.max(1, segSpeedData.filter(d => !d.isMissing).length);
        
        const outputPower = calculateOutputPower(avgSpeed, avgTorque);
        const efficiency = calculateEfficiency(avgInputPower, outputPower);
        
        const startTime = new Date(Math.min(...segVoltageData.map(d => d.timestamp.getTime())));
        const endTime = new Date(Math.max(...segVoltageData.map(d => d.timestamp.getTime())));
        
        const isCorrected = Math.random() < 0.1;
        const report: EfficiencyReport = {
          id: generateId(),
          testBenchId: tb.id,
          materialId: material.id,
          segmentId: segment.id,
          startTime,
          endTime,
          inputPower: avgInputPower,
          outputPower,
          efficiency,
          isCorrected,
        };
        
        if (isCorrected) {
          const origSpeed = avgSpeed;
          const origTorque = avgTorque;
          const origEff = efficiency;
          
          report.originalData = {
            speed: origSpeed,
            torque: origTorque,
            efficiency: origEff,
          };
          
          const correctedSpeed = origSpeed + randomRange(-50, 50);
          const correctedTorque = origTorque + randomRange(-5, 5);
          const correctedOutputPower = calculateOutputPower(correctedSpeed, correctedTorque);
          const correctedEff = calculateEfficiency(avgInputPower, correctedOutputPower);
          
          report.correctedData = {
            speed: correctedSpeed,
            torque: correctedTorque,
            efficiency: correctedEff,
            operator: randomChoice(OPERATORS),
            reason: randomChoice(CORRECTION_REASONS),
            correctedAt: new Date(),
          };
          
          report.outputPower = correctedOutputPower;
          report.efficiency = correctedEff;
        }
        
        reports.push(report);
      }
    }
  }
  
  return reports;
}

export function generateAnomalies(
  testBenches: TestBench[],
  materials: Material[],
  segments: WorkingConditionSegment[],
  voltageData: VoltageCurrentData[],
  temperatureData: TemperatureData[],
  speedData: SpeedTorqueData[],
  thresholdConfigs: ThresholdConfig[]
): AnomalyRecord[] {
  const anomalies: AnomalyRecord[] = [];
  const testBenchMap = new Map(testBenches.map(tb => [tb.id, tb]));
  const materialMap = new Map(materials.map(m => [m.id, m]));
  const segmentMap = new Map(segments.map(s => [s.id, s]));
  const thresholdMap = new Map(thresholdConfigs.map(t => [t.materialId, t]));
  
  for (let i = 0; i < speedData.length; i++) {
    if (i > 0 && speedData[i].isMissing && !speedData[i - 1].isMissing) {
      let missingCount = 0;
      for (let j = i; j < speedData.length && speedData[j].isMissing; j++) {
        missingCount++;
      }
      
      if (missingCount > 1) {
        const data = speedData[i];
        const tb = testBenchMap.get(data.testBenchId)!;
        const material = materialMap.get(data.materialId)!;
        const threshold = thresholdMap.get(data.materialId)!;
        const segment = segmentMap.get(data.segmentId)!;
        
        const actualInterval = missingCount * 20 * 1000;
        
        anomalies.push({
          id: generateId(),
          type: 'speed_missing' as AnomalyType,
          severity: actualInterval > 500 ? 'critical' : 'error',
          testBenchId: tb.id,
          materialId: material.id,
          segmentId: segment.id,
          timestamp: data.timestamp,
          actualValue: actualInterval,
          threshold: threshold.speedSampleInterval,
          message: formatAnomalyMessage(
            'speed_missing',
            material.code,
            tb.code,
            data.timestamp,
            actualInterval,
            threshold.speedSampleInterval
          ),
          resolved: false,
        });
        
        i += missingCount - 1;
      }
    }
  }
  
  for (const data of temperatureData) {
    const material = materialMap.get(data.materialId)!;
    const threshold = thresholdMap.get(data.materialId)!;
    
    if (data.temperature > threshold.temperatureLimit) {
      const tb = testBenchMap.get(data.testBenchId)!;
      const segment = segmentMap.get(data.segmentId)!;
      
      anomalies.push({
        id: generateId(),
        type: 'temp_overlimit' as AnomalyType,
        severity: data.temperature > threshold.temperatureLimit + 15 ? 'critical' : 'warning',
        testBenchId: tb.id,
        materialId: material.id,
        objectType: data.objectType,
        segmentId: segment.id,
        timestamp: data.timestamp,
        actualValue: data.temperature,
        threshold: threshold.temperatureLimit,
        message: formatAnomalyMessage(
          'temp_overlimit',
          material.code,
          tb.code,
          data.timestamp,
          data.temperature,
          threshold.temperatureLimit,
          data.objectType,
          segment.name
        ),
        resolved: false,
      });
    }
  }
  
  for (const data of voltageData) {
    if (data.power < 0) {
      const tb = testBenchMap.get(data.testBenchId)!;
      const material = materialMap.get(data.materialId)!;
      const threshold = thresholdMap.get(data.materialId)!;
      const segment = segmentMap.get(data.segmentId)!;
      
      anomalies.push({
        id: generateId(),
        type: 'power_reverse' as AnomalyType,
        severity: 'error',
        testBenchId: tb.id,
        materialId: material.id,
        segmentId: segment.id,
        timestamp: data.timestamp,
        actualValue: data.power,
        threshold: 0,
        message: formatAnomalyMessage(
          'power_reverse',
          material.code,
          tb.code,
          data.timestamp,
          data.power,
          0
        ),
        resolved: false,
      });
    }
  }
  
  return anomalies;
}

export function generateCorrectionLogs(reports: EfficiencyReport[]): CorrectionLog[] {
  const correctedReports = reports.filter(r => r.isCorrected && r.correctedData);
  const logs: CorrectionLog[] = [];
  
  for (const report of correctedReports.slice(0, 30)) {
    const original = report.originalData!;
    const corrected = report.correctedData!;
    
    logs.push({
      id: generateId(),
      reportId: report.id,
      operatorId: generateId(),
      operatorName: corrected.operator,
      originalSpeed: original.speed,
      originalTorque: original.torque,
      originalEfficiency: original.efficiency,
      correctedSpeed: corrected.speed,
      correctedTorque: corrected.torque,
      correctedEfficiency: corrected.efficiency,
      reason: corrected.reason,
      status: randomChoice(['pending', 'approved', 'approved', 'approved']),
      createdAt: corrected.correctedAt,
      approvedAt: Math.random() < 0.7 ? new Date() : undefined,
      approver: Math.random() < 0.7 ? randomChoice(OPERATORS) : undefined,
    });
  }
  
  return logs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function generateAnomalyTrend(anomalies: AnomalyRecord[], days: number = 7): { date: string; count: number }[] {
  const trend: { date: string; count: number }[] = [];
  const today = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(today, -i);
    const dateStr = formatDateOnly(date);
    const count = anomalies.filter(a => isSameDay(new Date(a.timestamp), date)).length;
    trend.push({ date: dateStr, count });
  }
  
  return trend;
}

function isSameDay(date1: Date, date2: Date): boolean {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
}

export function generateAllMockData() {
  const materials = generateMaterials();
  const testBenches = generateTestBenches();
  const segments = generateSegments();
  const segmentScheme = generateSegmentScheme(segments);
  const caliberConfigs = generateCaliberConfigs();
  const thresholdConfigs = generateThresholdConfigs(materials);
  
  const { voltageData, temperatureData, speedData } = generateTimeSeriesData(
    testBenches, materials, segments, 7
  );
  
  const efficiencyReports = generateEfficiencyReports(
    testBenches, materials, segments, voltageData, speedData
  );
  
  const anomalies = generateAnomalies(
    testBenches, materials, segments, voltageData, temperatureData, speedData, thresholdConfigs
  );
  
  const correctionLogs = generateCorrectionLogs(efficiencyReports);
  const anomalyTrend = generateAnomalyTrend(anomalies);
  
  return {
    materials,
    testBenches,
    segments,
    segmentScheme,
    caliberConfigs,
    thresholdConfigs,
    voltageData,
    temperatureData,
    speedData,
    efficiencyReports,
    anomalies,
    correctionLogs,
    anomalyTrend,
  };
}
