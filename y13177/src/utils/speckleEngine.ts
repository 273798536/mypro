import type {
  DataPoint,
  AnomalyInfo,
  Evidence,
  DeviceParams,
  MaterialParams,
  SupplementItem,
} from '@/types';

const SAMPLE_COUNT = 20;

interface SimulationEvent {
  type: 'material-defect' | 'vibration' | 'overheat';
  startIdx: number;
  endIdx: number;
  intensityFactor: number;
  contrastFactor: number;
  stabilityFactor: number;
  evidence: Omit<Evidence, 'id'>;
}

const defaultEvents: SimulationEvent[] = [
  {
    type: 'material-defect',
    startIdx: 4,
    endIdx: 5,
    intensityFactor: 1.6,
    contrastFactor: 1.05,
    stabilityFactor: 0.8,
    evidence: {
      sourceName: '材料检测报告-6061-A042',
      sourceType: '材料报告',
      content: '试样第4~5测量点附近存在局部氧化斑点，直径约0.5mm',
      lineNumber: 12,
    },
  },
  {
    type: 'vibration',
    startIdx: 8,
    endIdx: 9,
    intensityFactor: 0.75,
    contrastFactor: 0.4,
    stabilityFactor: 0.5,
    evidence: {
      sourceName: '实验室操作日志-20260610',
      sourceType: '操作日志',
      content: '14:32 隔壁振动台启动，持续约 2 分钟，本设备未暂停',
      lineNumber: 15,
    },
  },
  {
    type: 'overheat',
    startIdx: 14,
    endIdx: 14,
    intensityFactor: 0,
    contrastFactor: 0,
    stabilityFactor: 0,
    evidence: {
      sourceName: '实验室操作日志-20260610',
      sourceType: '操作日志',
      content: '14:47 设备自动触发过热保护，冷却 30 秒后恢复采集',
      lineNumber: 22,
    },
  },
];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function formatTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function genId(prefix: string, idx: number): string {
  return `${prefix}-${String(idx).padStart(3, '0')}`;
}

export interface ComputeResult {
  dataPoints: DataPoint[];
  anomalies: AnomalyInfo[];
  conclusion: string;
}

export function computeSpeckleData(
  deviceParams: DeviceParams,
  materialParams: MaterialParams,
  supplements: SupplementItem[],
  seed: number = 42
): ComputeResult {
  const rand = seededRandom(seed);
  const dataPoints: DataPoint[] = [];
  const anomalies: AnomalyInfo[] = [];

  const intensityBase =
    deviceParams.intensityMin +
    (deviceParams.intensityMax - deviceParams.intensityMin) *
      (0.3 + materialParams.surfaceRoughness * 0.08);

  const contrastBase =
    deviceParams.contrastMin +
    (deviceParams.contrastMax - deviceParams.contrastMin) *
      (0.4 + materialParams.hardness * 0.005);

  const stabilityBase = 0.88 + rand() * 0.06;

  const events = [...defaultEvents];

  for (let i = 0; i < SAMPLE_COUNT; i++) {
    let intensity = intensityBase * (0.97 + rand() * 0.06);
    let contrast = contrastBase * (0.95 + rand() * 0.1);
    let stability = stabilityBase * (0.98 + rand() * 0.04);
    let sourceRow = `${deviceParams.nameplateLine}`;

    const event = events.find((e) => i >= e.startIdx && i <= e.endIdx);

    if (event) {
      intensity = intensity * event.intensityFactor;
      contrast = contrast * event.contrastFactor;
      stability = stability * event.stabilityFactor;

      if (event.type === 'vibration') {
        sourceRow = `操作日志-第${event.evidence.lineNumber}行`;
      } else if (event.type === 'overheat') {
        sourceRow = `操作日志-第${event.evidence.lineNumber}行`;
      } else if (event.type === 'material-defect') {
        sourceRow = `材料报告-第${event.evidence.lineNumber}行`;
      }
    }

    dataPoints.push({
      timestamp: i,
      intensity: Math.round(intensity * 100) / 100,
      contrast: Math.round(contrast * 100) / 100,
      stability: Math.round(stability * 100) / 100,
      sourceRow,
    });
  }

  let anomalyIdx = 0;

  for (const event of events) {
    const isExtreme =
      event.type === 'material-defect' &&
      dataPoints[event.startIdx].intensity > deviceParams.intensityMax;

    const isNoise =
      event.type === 'vibration' &&
      dataPoints[event.startIdx].stability < deviceParams.stabilityThreshold;

    const isMissing = event.type === 'overheat';

    if (!isExtreme && !isNoise && !isMissing) continue;

    anomalyIdx++;
    const anomalyId = genId('anom', anomalyIdx);

    const evList: Evidence[] = [
      {
        id: `${anomalyId}-ev-1`,
        ...event.evidence,
      },
    ];

    if (isExtreme) {
      evList.unshift({
        id: `${anomalyId}-ev-0`,
        sourceName: `设备铭牌-${deviceParams.deviceName}`,
        sourceType: '铭牌',
        content: `出厂标定强度范围：${deviceParams.intensityMin.toFixed(2)} ~ ${deviceParams.intensityMax.toFixed(2)}`,
        lineNumber: 3,
      });
    }
    if (isNoise) {
      evList.unshift({
        id: `${anomalyId}-ev-0`,
        sourceName: `设备铭牌-${deviceParams.deviceName}`,
        sourceType: '铭牌',
        content: `工作环境要求：振动加速度 ≤ ${deviceParams.vibrationLimit}g，稳定性阈值 ${deviceParams.stabilityThreshold.toFixed(2)}`,
        lineNumber: 9,
      });
    }

    for (const sup of supplements) {
      if (sup.anomalyId === anomalyId || sup.anomalyId === undefined) {
        evList.push({
          id: `${anomalyId}-ev-sup-${sup.id}`,
          sourceName: sup.sourceName,
          sourceType: sup.sourceType,
          content: sup.content,
          lineNumber: sup.lineNumber,
        });
      }
    }

    let description = '';
    let type: 'extreme' | 'noise' | 'missing' = 'extreme';

    if (isExtreme) {
      type = 'extreme';
      const peak = dataPoints[event.startIdx].intensity;
      description = `强度峰值 ${peak.toFixed(2)}，超出铭牌范围 ${deviceParams.intensityMin.toFixed(2)} ~ ${deviceParams.intensityMax.toFixed(2)}，疑似材料局部异常`;
    } else if (isNoise) {
      type = 'noise';
      const stab = dataPoints[event.startIdx].stability;
      description = `稳定性骤降至 ${stab.toFixed(2)}，低于阈值 ${deviceParams.stabilityThreshold.toFixed(2)}，疑似环境振动噪声`;
    } else if (isMissing) {
      type = 'missing';
      description = '数据采集中断，设备触发过热保护，该点数据无效';
    }

    const anomaly: AnomalyInfo = {
      id: anomalyId,
      type,
      description,
      affectedRangeStart: event.startIdx,
      affectedRangeEnd: event.endIdx,
      evidences: evList,
    };

    anomalies.push(anomaly);

    for (let i = event.startIdx; i <= event.endIdx; i++) {
      dataPoints[i].anomaly = anomaly;
    }
  }

  const extremeCount = anomalies.filter((a) => a.type === 'extreme').length;
  const noiseCount = anomalies.filter((a) => a.type === 'noise').length;
  const missingCount = anomalies.filter((a) => a.type === 'missing').length;

  let conclusion = '';
  if (anomalies.length === 0) {
    conclusion = `检测结果正常。全部 ${SAMPLE_COUNT} 个采样点均在设备铭牌标定范围内，${materialParams.materialName} 散斑特征稳定，未见异常。`;
  } else {
    const parts: string[] = [];
    if (extremeCount > 0)
      parts.push(`${extremeCount} 处强度异常（超出铭牌范围），建议结合材料报告复检`);
    if (noiseCount > 0)
      parts.push(`${noiseCount} 处疑似环境噪声干扰，已标注来源不纳入结论`);
    if (missingCount > 0)
      parts.push(`${missingCount} 处数据采集中断，为设备保护触发，不影响整体`);
    conclusion = `检测结果基本有效。${parts.join('；')}。整体散斑特征符合 ${materialParams.materialName} 正常区间。`;
  }

  return { dataPoints, anomalies, conclusion };
}

export function nowTimestamp(): string {
  return formatTime(new Date());
}

export function bumpVersion(current: string, changeType: '补充' | '修正'): string {
  const match = current.match(/^v(\d+)\.(\d+)$/);
  if (!match) return 'v2.0';
  const major = parseInt(match[1], 10);
  const minor = parseInt(match[2], 10);
  if (changeType === '修正') {
    return `v${major + 1}.0`;
  }
  return `v${major}.${minor + 1}`;
}
