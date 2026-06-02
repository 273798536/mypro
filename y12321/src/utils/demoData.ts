import { AnalysisRecord, TimeSeriesPoint } from '../types';
import { createEvidenceItem, calculateCorrelation, detectMisjudgment } from './analysisEngine';

function generateDeterministicNormalData(): TimeSeriesPoint[] {
  const data: TimeSeriesPoint[] = [];
  const baseDate = new Date('2025-01-01');
  
  const baseValuesA = [
    100, 102, 98, 105, 101, 99, 103, 97, 106, 102,
    104, 99, 101, 105, 98, 103, 100, 102, 97, 104,
    101, 99, 103, 105, 98, 102, 100, 96, 104, 101,
    103, 99, 102, 105, 97, 100, 104, 98, 102, 101,
    99, 103, 100, 105, 98, 102, 96, 104, 101, 103,
    99, 102, 100, 105, 97, 101, 104, 98, 102, 100
  ];
  
  const baseValuesB = [
    50, 51, 49, 52, 50, 49, 51, 48, 53, 51,
    52, 49, 50, 52, 48, 51, 50, 51, 47, 52,
    50, 49, 51, 53, 48, 51, 50, 47, 52, 50,
    51, 49, 50, 52, 48, 50, 52, 49, 51, 50,
    49, 51, 50, 53, 48, 51, 47, 52, 50, 51,
    49, 50, 50, 52, 48, 50, 52, 49, 51, 50
  ];
  
  for (let i = 0; i < 60; i++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + i);
    
    data.push({
      date: date.toISOString().split('T')[0],
      valueA: baseValuesA[i],
      valueB: baseValuesB[i],
    });
  }
  
  return data;
}

function generateSmallSampleData(): TimeSeriesPoint[] {
  const data: TimeSeriesPoint[] = [];
  const baseDate = new Date('2025-03-01');
  
  const sampleDates = [0, 7, 14, 21, 28, 35, 42, 49];
  const valuesA = [500, 520, 490, 510, 530, 480, 505, 515];
  const valuesB = [20, 22, 19, 21, 23, 18, 20, 21];
  
  for (let i = 0; i < 8; i++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + sampleDates[i]);
    
    data.push({
      date: date.toISOString().split('T')[0],
      valueA: valuesA[i],
      valueB: valuesB[i],
    });
  }
  
  return data;
}

function generateLagRelationData(): TimeSeriesPoint[] {
  const data: TimeSeriesPoint[] = [];
  const baseDate = new Date('2025-02-01');
  
  const lagDays = 2;
  const valuesA: number[] = [];
  
  for (let i = 0; i < 50; i++) {
    valuesA.push(200 + Math.sin(i / 5) * 50 + i * 0.5);
  }
  
  for (let i = 0; i < 50; i++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + i);
    
    const bIndex = Math.max(0, i - lagDays);
    const valueB = 100 + Math.sin(bIndex / 5) * 30 + bIndex * 0.3;
    
    data.push({
      date: date.toISOString().split('T')[0],
      valueA: valuesA[i],
      valueB: valueB,
    });
  }
  
  return data;
}

export function createDemoRecords(): AnalysisRecord[] {
  const now = new Date().toISOString();
  
  const normalData = generateDeterministicNormalData();
  const normalCorr = calculateCorrelation(normalData);
  const normalDetect = detectMisjudgment(normalCorr, normalData.length);
  
  const smallData = generateSmallSampleData();
  const smallCorr = calculateCorrelation(smallData);
  const smallDetect = detectMisjudgment(smallCorr, smallData.length);
  
  const lagData = generateLagRelationData();
  const lagCorr = calculateCorrelation(lagData);
  const lagDetect = detectMisjudgment(lagCorr, lagData.length);
  
  const records: AnalysisRecord[] = [
    {
      id: 'DEMO-001',
      metricA: '商品浏览量',
      metricB: '加购件数',
      timeSeriesData: normalData,
      sampleSize: normalData.length,
      status: normalDetect.status,
      judgment: normalDetect.judgment,
      correlationCoeff: normalCorr.coefficient,
      pValue: normalCorr.pValue,
      lagValue: normalCorr.lagValue,
      lagModified: false,
      pendingReason: normalDetect.pendingReason,
      abnormalReason: normalDetect.abnormalReason,
      evidenceChain: [
        createEvidenceItem('source', `数据来源：埋点系统导出，日期范围：${normalData[0].date} 至 ${normalData[normalData.length - 1].date}`),
        createEvidenceItem('judgment', `执行相关性计算：Pearson r=${normalCorr.coefficient.toFixed(3)}, p=${normalCorr.pValue.toFixed(4)}`),
        createEvidenceItem('judgment', `误判检测：样本量=${normalData.length}，时间趋势A=${normalCorr.trendCorrelationA.toFixed(3)}，时间趋势B=${normalCorr.trendCorrelationB.toFixed(3)}，最佳滞后=${normalCorr.lagValue}天`),
        createEvidenceItem('result', normalDetect.judgment),
      ],
      createdAt: now,
      updatedAt: now,
      dataSource: '埋点系统',
      groupField: '商品类目',
      groupFieldAddedAt: now,
      eventNote: '期间平台稳定运营，无大促活动',
      eventNoteAddedAt: now,
    },
    {
      id: 'DEMO-002',
      metricA: '活动曝光',
      metricB: '用户注册',
      timeSeriesData: smallData,
      sampleSize: smallData.length,
      status: smallDetect.status,
      judgment: smallDetect.judgment,
      correlationCoeff: smallCorr.coefficient,
      pValue: smallCorr.pValue,
      lagValue: smallCorr.lagValue,
      lagModified: false,
      pendingReason: smallDetect.pendingReason,
      abnormalReason: smallDetect.abnormalReason,
      evidenceChain: [
        createEvidenceItem('source', `数据来源：活动后台导出，日期范围：${smallData[0].date} 至 ${smallData[smallData.length - 1].date}`),
        createEvidenceItem('judgment', `执行相关性计算：Pearson r=${smallCorr.coefficient.toFixed(3)}, p=${smallCorr.pValue.toFixed(4)}`),
        createEvidenceItem('judgment', `误判检测：样本量=${smallData.length} < 最小要求30`),
        createEvidenceItem('result', smallDetect.judgment),
      ],
      createdAt: now,
      updatedAt: now,
      dataSource: '活动后台',
    },
    {
      id: 'DEMO-003',
      metricA: '广告投放额',
      metricB: '订单转化量',
      timeSeriesData: lagData,
      sampleSize: lagData.length,
      status: lagDetect.status,
      judgment: lagDetect.judgment,
      correlationCoeff: lagCorr.coefficient,
      pValue: lagCorr.pValue,
      lagValue: lagCorr.lagValue,
      lagModified: false,
      pendingReason: lagDetect.pendingReason,
      abnormalReason: lagDetect.abnormalReason,
      evidenceChain: [
        createEvidenceItem('source', `数据来源：广告平台API，日期范围：${lagData[0].date} 至 ${lagData[lagData.length - 1].date}`),
        createEvidenceItem('judgment', `执行相关性计算：Pearson r=${lagCorr.coefficient.toFixed(3)}, p=${lagCorr.pValue.toFixed(4)}`),
        createEvidenceItem('judgment', `误判检测：最佳滞后=${lagCorr.lagValue}天，滞后相关系数=${lagCorr.maxLagCorrelation.toFixed(3)}`),
        createEvidenceItem('result', lagDetect.judgment),
      ],
      createdAt: now,
      updatedAt: now,
      dataSource: '广告平台API',
      groupField: '投放渠道',
      groupFieldAddedAt: now,
    },
  ];
  
  return records;
}

export function createDemoAuditLogs(): Array<{
  id: string;
  recordId: string;
  fieldName: string;
  oldValue: string;
  newValue: string;
  reason: string;
  modifiedAt: string;
  operator: string;
  impactScope: string[];
}> {
  return [];
}
