import {
  BoomPoint,
  RemarkHistory,
  ScreenshotHistory,
  MaterialTrace,
  TraceNode,
  AnomalyType,
} from '../types';
import { generateId } from '../utils/date';

const BOOM_IDS = ['BOOM-01', 'BOOM-02', 'BOOM-03', 'BOOM-04', 'BOOM-05'];
const NORMAL_FLOOR_UNIT = '米';
const MIXED_FLOOR_UNIT = '层';
const VALUE_UNIT = 'kN';

interface MockDataResult {
  points: BoomPoint[];
  remarkHistory: RemarkHistory[];
  screenshotHistory: ScreenshotHistory[];
  materialTraces: MaterialTrace[];
}

export function generateMockData(): MockDataResult {
  const now = Date.now();
  const startTime = now - 6 * 60 * 60 * 1000;
  const interval = 30 * 1000;
  const totalPoints = Math.floor((6 * 60 * 60 * 1000) / interval);

  const points: BoomPoint[] = [];
  const remarkHistory: RemarkHistory[] = [];
  const screenshotHistory: ScreenshotHistory[] = [];
  const materialTraces: MaterialTrace[] = [];

  const anomalyIndices: Record<string, number[]> = {
    'BOOM-01': [45, 120, 256, 412, 580],
    'BOOM-02': [78, 189, 345, 520, 678],
    'BOOM-03': [33, 156, 298, 445, 601],
    'BOOM-04': [67, 201, 378, 512, 654],
    'BOOM-05': [89, 234, 389, 567, 701],
  };

  const mixedUnitBooms = ['BOOM-02', 'BOOM-04'];
  const mixedUnitRanges: Record<string, [number, number]> = {
    'BOOM-02': [100, 250],
    'BOOM-04': [300, 450],
  };

  const baseValues: Record<string, number> = {
    'BOOM-01': 12.5,
    'BOOM-02': 18.3,
    'BOOM-03': 15.7,
    'BOOM-04': 22.1,
    'BOOM-05': 9.8,
  };

  const anomalyTypes: AnomalyType[] = ['value_out_of_range', 'floor_mismatch', 'other'];

  for (const boomId of BOOM_IDS) {
    const baseValue = baseValues[boomId];
    const isMixedUnitBoom = mixedUnitBooms.includes(boomId);
    const mixedRange = mixedUnitRanges[boomId] || [0, 0];
    const anomalyIdx = anomalyIndices[boomId] || [];

    for (let i = 0; i < totalPoints; i++) {
      const timestamp = startTime + i * interval;
      const wave = Math.sin(i * 0.05) * 2 + Math.sin(i * 0.12) * 1;
      const noise = (Math.random() - 0.5) * 0.8;
      let value = baseValue + wave + noise;
      let isAnomaly = false;
      let anomalyType: AnomalyType | undefined;

      if (anomalyIdx.includes(i)) {
        isAnomaly = true;
        const typeIdx = Math.floor(Math.random() * anomalyTypes.length);
        anomalyType = anomalyTypes[typeIdx];
        if (anomalyType === 'value_out_of_range') {
          value = baseValue * (1.5 + Math.random() * 0.8);
        } else if (anomalyType === 'floor_mismatch') {
          value = baseValue * 0.3;
        } else {
          value = baseValue * 1.2 + Math.random() * 3;
        }
      }

      let floorUnit = NORMAL_FLOOR_UNIT;
      if (isMixedUnitBoom && i >= mixedRange[0] && i <= mixedRange[1]) {
        floorUnit = MIXED_FLOOR_UNIT;
      }

      const floor = 10 + Math.round(Math.sin(i * 0.03) * 3 + Math.random() * 0.5);

      const point: BoomPoint = {
        id: `${boomId}-${i}`,
        boomId,
        timestamp,
        value: Math.round(value * 100) / 100,
        unit: VALUE_UNIT,
        floor,
        floorUnit,
        isAnomaly,
        anomalyType,
        currentRemark: '',
        status: isAnomaly ? 'pending' : 'resolved',
        materialId: `mat-${boomId}-${Math.floor(i / 50)}`,
      };

      points.push(point);

      if (isAnomaly) {
        const anomalyPos = anomalyIdx.indexOf(i);
        const trace = generateMaterialTrace(point.id, boomId, timestamp, anomalyType || 'other', anomalyPos);
        materialTraces.push(trace);

        if (i === anomalyIdx[0]) {
          const remark: RemarkHistory = {
            id: generateId(),
            pointId: point.id,
            remark: '初次检测到异常，数值偏高，待确认',
            timestamp: timestamp + 5 * 60 * 1000,
            operator: '系统自动标记',
          };
          remarkHistory.push(remark);

          point.currentRemark = '初次检测到异常，数值偏高，待确认';
          point.status = 'confirmed';
        } else if (i === anomalyIdx[1]) {
          const remark: RemarkHistory = {
            id: generateId(),
            pointId: point.id,
            remark: '连续异常，建议关注趋势变化',
            timestamp: timestamp + 8 * 60 * 1000,
            operator: '系统自动标记',
          };
          remarkHistory.push(remark);

          point.currentRemark = '连续异常，建议关注趋势变化';
          point.status = 'pending';
        } else if (i === anomalyIdx[2]) {
          const remark1: RemarkHistory = {
            id: generateId(),
            pointId: point.id,
            remark: '疑似传感器漂移，需要现场核查',
            timestamp: timestamp + 3 * 60 * 1000,
            operator: '算法值班人 - 张工',
          };
          const remark2: RemarkHistory = {
            id: generateId(),
            pointId: point.id,
            remark: '已安排运维班检查，预计明天出结果',
            timestamp: timestamp + 30 * 60 * 1000,
            operator: '运维 - 老何',
          };
          remarkHistory.push(remark1, remark2);
          point.currentRemark = '已安排运维班检查，预计明天出结果';
          point.status = 'pending';
        } else if (i === anomalyIdx[3]) {
          const remark: RemarkHistory = {
            id: generateId(),
            pointId: point.id,
            remark: '与前序异常同属一批，待统一处理',
            timestamp: timestamp + 2 * 60 * 1000,
            operator: '算法值班人 - 张工',
          };
          remarkHistory.push(remark);

          point.currentRemark = '与前序异常同属一批，待统一处理';
          point.status = 'confirmed';
        } else if (i === anomalyIdx[4]) {
          const remark1: RemarkHistory = {
            id: generateId(),
            pointId: point.id,
            remark: '现场已核查，确认为机械卡滞导致',
            timestamp: timestamp + 60 * 60 * 1000,
            operator: '运维 - 老何',
          };
          const remark2: RemarkHistory = {
            id: generateId(),
            pointId: point.id,
            remark: '已处理完成，恢复正常运行',
            timestamp: timestamp + 120 * 60 * 1000,
            operator: '运维 - 老何',
          };
          remarkHistory.push(remark1, remark2);
          point.currentRemark = '已处理完成，恢复正常运行';
          point.status = 'resolved';
        }
      }
    }
  }

  const samplePoint = points.find(p => p.boomId === 'BOOM-01' && p.isAnomaly);
  if (samplePoint) {
    const screenshot: ScreenshotHistory = {
      id: generateId(),
      pointId: samplePoint.id,
      dataUrl: '',
      timestamp: samplePoint.timestamp + 10 * 60 * 1000,
      description: '异常发生时的监控截图',
    };
    screenshotHistory.push(screenshot);
  }

  return { points, remarkHistory, screenshotHistory, materialTraces };
}

function generateMaterialTrace(
  pointId: string,
  boomId: string,
  timestamp: number,
  anomalyType: string,
  anomalyPos: number
): MaterialTrace {
  const modelVersion = anomalyPos < 2 ? 'v2.1' : 'v2.3';
  const dataSource = anomalyPos % 2 === 0 ? '原始数据采集' : '校准后数据';
  const systemSource = anomalyPos < 3 ? '剧院主控系统' : '备用监控系统';

  const chain: TraceNode[] = [
    {
      id: `sys-${anomalyPos < 3 ? 'theater-control' : 'backup-monitor'}`,
      name: systemSource,
      type: 'system',
      timestamp: timestamp - 300000 - anomalyPos * 10000,
    },
    {
      id: `model-boom-analysis-${modelVersion}`,
      name: `吊杆分析模型 ${modelVersion}`,
      type: 'model',
      timestamp: timestamp - 120000 - anomalyPos * 5000,
    },
    {
      id: `data-${boomId}-${anomalyPos % 2 === 0 ? 'raw' : 'calibrated'}`,
      name: `${boomId} ${dataSource}`,
      type: 'data',
      timestamp: timestamp - 30000 - anomalyPos * 2000,
    },
    {
      id: pointId,
      name: `异常点位 (${anomalyType === 'value_out_of_range' ? '数值越界' : anomalyType === 'floor_mismatch' ? '楼层异常' : '其他异常'})`,
      type: 'point',
      timestamp,
    },
  ];

  return {
    id: `trace-${pointId}`,
    pointId,
    source: systemSource,
    rawData: JSON.stringify({
      sensorId: boomId,
      anomalyType,
      anomalyIndex: anomalyPos,
      modelVersion,
      samplingRate: '30s',
      calibrationDate: anomalyPos < 3 ? '2024-01-15' : '2024-03-20',
      threshold: 25.5,
    }),
    chain,
  };
}
