import { AnalysisRecord, TimeSeriesPoint } from '../types';
import { createEvidenceItem, calculateCorrelation, detectMisjudgment } from './analysisEngine';

function generateNormalTimeSeries(): TimeSeriesPoint[] {
  const data: TimeSeriesPoint[] = [];
  const baseDate = new Date('2025-01-01');
  
  for (let i = 0; i < 60; i++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + i);
    
    const baseValue = 100 + i * 0.5;
    const noiseA = (Math.random() - 0.5) * 10;
    const noiseB = (Math.random() - 0.5) * 8;
    const trendFactor = i * 0.3;
    
    data.push({
      date: date.toISOString().split('T')[0],
      valueA: baseValue + trendFactor + noiseA,
      valueB: baseValue * 0.8 + trendFactor * 1.2 + noiseB,
    });
  }
  
  return data;
}

function generateSmallSampleTimeSeries(): TimeSeriesPoint[] {
  const data: TimeSeriesPoint[] = [];
  const baseDate = new Date('2025-03-01');
  
  for (let i = 0; i < 8; i++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + i * 7);
    
    data.push({
      date: date.toISOString().split('T')[0],
      valueA: 500 + Math.random() * 200,
      valueB: 20 + Math.random() * 15,
    });
  }
  
  return data;
}

function generateLagRelationTimeSeries(): TimeSeriesPoint[] {
  const data: TimeSeriesPoint[] = [];
  const baseDate = new Date('2025-02-01');
  
  for (let i = 0; i < 45; i++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + i);
    
    const baseA = 200 + Math.sin(i / 10) * 50 + Math.random() * 10;
    const lagOffset = 7;
    const bIndex = Math.max(0, i - lagOffset);
    const baseB = 100 + Math.sin(bIndex / 10) * 30 + Math.random() * 8;
    
    data.push({
      date: date.toISOString().split('T')[0],
      valueA: baseA,
      valueB: baseB,
    });
  }
  
  return data;
}

function generateCommonTrendTimeSeries(): TimeSeriesPoint[] {
  const data: TimeSeriesPoint[] = [];
  const baseDate = new Date('2025-01-01');
  
  for (let i = 0; i < 50; i++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + i);
    
    const timeTrend = i * 2;
    
    data.push({
      date: date.toISOString().split('T')[0],
      valueA: 100 + timeTrend + Math.random() * 5,
      valueB: 50 + timeTrend * 0.5 + Math.random() * 4,
    });
  }
  
  return data;
}

export function createDemoRecords(): AnalysisRecord[] {
  const now = new Date().toISOString();
  
  const normalData = generateNormalTimeSeries();
  const normalCorr = calculateCorrelation(normalData);
  const normalDetect = detectMisjudgment(normalCorr, normalData.length);
  
  const smallData = generateSmallSampleTimeSeries();
  const smallCorr = calculateCorrelation(smallData);
  const smallDetect = detectMisjudgment(smallCorr, smallData.length);
  
  const records: AnalysisRecord[] = [
    {
      id: 'DEMO-001',
      metricA: '广告投放额',
      metricB: '订单转化量',
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
        createEvidenceItem('source', `数据来源：广告平台API导出，日期范围：${normalData[0].date} 至 ${normalData[normalData.length - 1].date}`),
        createEvidenceItem('judgment', `执行相关性计算：Pearson r=${normalCorr.coefficient.toFixed(3)}, p=${normalCorr.pValue.toFixed(4)}`),
        createEvidenceItem('judgment', `误判检测：样本量=${normalData.length}，缺失率=${(normalCorr.missingRate * 100).toFixed(1)}%，异常值影响=${normalCorr.outlierImpact.toFixed(3)}`),
        createEvidenceItem('result', normalDetect.judgment),
      ],
      createdAt: now,
      updatedAt: now,
      dataSource: '广告平台API',
      groupField: '投放渠道',
      groupFieldAddedAt: now,
      eventNote: '期间无重大运营活动',
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
