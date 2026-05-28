import { StudentData, DataPoint, CircuitParams } from '@/types';
import { generateId } from './helpers';
import { calculateChargeVoltage, calculateDischargeVoltage, calculateTimeConstant } from './calculator';
import { toOhms, toFarads, toVolts, toSeconds } from './units';

function generateStudentDataPoints(
  params: CircuitParams,
  noiseLevel: number = 0.05,
  bias: number = 0
): DataPoint[] {
  const tau = calculateTimeConstant(params);
  const Vs = toVolts(params.sourceVoltage, params.voltageUnit);
  const V0 = toVolts(params.initialVoltage, params.voltageUnit);
  const timeRange = toSeconds(params.timeRange, params.timeUnit);
  const points: DataPoint[] = [];
  const dt = timeRange / (params.samplePoints - 1);

  for (let i = 0; i < params.samplePoints; i++) {
    const t = i * dt;
    const theoreticalV = params.mode === 'discharge'
      ? calculateDischargeVoltage(t, Vs, tau)
      : calculateChargeVoltage(t, Vs, V0, tau);
    
    const noise = (Math.random() - 0.5) * 2 * noiseLevel * Vs;
    const voltage = theoreticalV + noise + bias * Vs;
    
    points.push({
      time: t,
      voltage: Math.max(0, Math.min(Vs * 1.1, voltage)),
      source: 'student',
    });
  }
  return points;
}

const studentNames = [
  '张三', '李四', '王五', '赵六', '钱七',
  '孙八', '周九', '吴十', '郑一', '冯二',
  '陈明', '杨华', '朱亮', '何静', '刘芳',
];

export function generateMockStudentData(
  params: CircuitParams,
  count: number = 10
): StudentData[] {
  const students: StudentData[] = [];
  const experimentId = 'EXP-' + Date.now();

  for (let i = 0; i < count; i++) {
    const isAnomalous = i < 2;
    const hasBias = i >= 2 && i < 4;
    const noiseLevel = isAnomalous ? 0.2 : (0.02 + Math.random() * 0.06);
    const bias = hasBias ? (Math.random() > 0.5 ? 0.1 : -0.1) : 0;

    const dataPoints = generateStudentDataPoints(params, noiseLevel, bias);

    if (isAnomalous && dataPoints.length > 5) {
      dataPoints[Math.floor(dataPoints.length / 2)].voltage *= 1.5;
      dataPoints[Math.floor(dataPoints.length / 3)].voltage *= 0.5;
    }

    students.push({
      id: generateId(),
      studentId: `2024${String(i + 1).padStart(4, '0')}`,
      studentName: studentNames[i % studentNames.length],
      experimentId,
      dataPoints,
      paramsSnapshot: { ...params },
      corrections: [],
      status: 'raw',
      importedAt: new Date().toISOString(),
      source: '模拟数据',
      warnings: [],
    });
  }

  return students;
}

export function generateSingleMockStudent(
  params: CircuitParams,
  studentId: string,
  studentName: string
): StudentData {
  const dataPoints = generateStudentDataPoints(params, 0.03 + Math.random() * 0.04, 0);
  
  return {
    id: generateId(),
    studentId,
    studentName,
    experimentId: 'EXP-' + Date.now(),
    dataPoints,
    paramsSnapshot: { ...params },
    corrections: [],
    status: 'raw',
    importedAt: new Date().toISOString(),
    source: '模拟数据',
    warnings: [],
  };
}
