import { AppDataSource } from '../data-source';
import { Sample } from '../entities/Sample';
import { ProcessingRecord } from '../entities/ProcessingRecord';
import * as XLSX from 'xlsx';
import { createAuditLog } from './auditService';

export interface ReportData {
  sample: Sample;
  records: ProcessingRecord[];
  qualityReport: string;
  duplicateExplanation: string;
  timePointExplanation: string;
  traceabilityInfo: string;
}

export function generateDuplicateExplanation(barcode: string, count: number): string {
  return `【条码重复说明】
样本条码「${barcode}」在系统中共计出现 ${count} 次。这通常发生在以下情况：
1. 同一患者同一份标本进行了重复送检；
2. 实验室操作中条码扫描错误或重复打印；
3. 不同样本误用了相同的条码编号。

处理建议：
- 请核对样本采集记录和实验室LIS系统，确认条码唯一性；
- 如为同一患者复查样本，建议在报告中注明"复查"并保留所有检测结果；
- 如为操作失误，应及时更正条码并记录变更原因；
- 所有重复记录已在系统中保留完整处理轨迹，可供追溯。`;
}

export function generateTimePointExplanation(sampleName: string, missingFields: string[]): string {
  const fieldNames: Record<string, string> = {
    collectionTime: '采集时间',
    testTime: '检测时间',
  };
  
  const missingNames = missingFields.map(f => fieldNames[f] || f).join('、');
  
  return `【时间点缺失说明】
样本「${sampleName}」的${missingNames}字段为空。时间点信息对细菌耐药谱分析至关重要：
1. 采集时间帮助判断感染发生时机与病程发展；
2. 检测时间用于评估检验周转时间(TAT)是否符合要求；
3. 时间序列分析可追踪耐药菌株的流行病学变化。

当前状态：
- 已由复核人员确认并通过审核；
- 缺失字段已在系统中标记，后续补录后将自动更新；
- 本次报告中耐药谱分析结果仅供参考，建议结合临床综合判断。`;
}

export async function generateReport(sampleId: number, operator: string): Promise<ReportData> {
  const sample = await AppDataSource.getRepository(Sample).findOne({
    where: { id: sampleId },
    relations: ['processingRecords'],
  });

  if (!sample) {
    throw new Error('Sample not found');
  }

  const records = sample.processingRecords.sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const allSamples = await AppDataSource.getRepository(Sample).find({
    where: { barcode: sample.barcode },
  });

  const duplicateCount = allSamples.length;
  const missingFields: string[] = [];
  if (!sample.collectionTime) missingFields.push('collectionTime');
  if (!sample.testTime) missingFields.push('testTime');

  const qualityReport = generateQualityReport(sample, records);
  const duplicateExplanation = sample.hasDuplicateBarcode 
    ? generateDuplicateExplanation(sample.barcode, duplicateCount) 
    : '';
  const timePointExplanation = sample.hasMissingTimePoint 
    ? generateTimePointExplanation(sample.sampleName, missingFields) 
    : '';
  const traceabilityInfo = generateTraceabilityInfo(sample, records);

  await createAuditLog({
    sampleId,
    action: 'report_export',
    operator,
  });

  return {
    sample,
    records,
    qualityReport,
    duplicateExplanation,
    timePointExplanation,
    traceabilityInfo,
  };
}

function generateQualityReport(sample: Sample, records: ProcessingRecord[]): string {
  const qualityChecks = records.filter(r => r.recordType === 'quality_check');
  const reviews = records.filter(r => r.recordType === 'exception_review');
  
  const latestReview = reviews[reviews.length - 1];
  const qualityStatusText: Record<string, string> = {
    pass: '合格',
    warning: '有异常（已复核）',
    fail: '不合格',
  };

  let report = `【质量评估报告】
样本编号：${sample.barcode}
样本名称：${sample.sampleName}
检测细菌：${sample.bacteriaName}
整体质量状态：${qualityStatusText[sample.qualityStatus] || sample.qualityStatus}

质量检查记录：
`;

  qualityChecks.forEach((check, idx) => {
    report += `${idx + 1}. ${new Date(check.createdAt).toLocaleString('zh-CN')} - ${check.description}
   结果：${check.result === 'pass' ? '通过' : check.result === 'warning' ? '异常' : '不通过'}
   ${check.analysisData ? `分析数据：${check.analysisData}` : ''}
`;
  });

  if (latestReview) {
    report += `
复核信息：
复核人：${latestReview.reviewedBy || '未记录'}
复核时间：${latestReview.reviewedAt ? new Date(latestReview.reviewedAt).toLocaleString('zh-CN') : '未记录'}
复核意见：${latestReview.reviewComment || '无'}
`;
  }

  if (sample.qualityNotes) {
    report += `\n质量备注：${sample.qualityNotes}\n`;
  }

  return report;
}

function generateTraceabilityInfo(sample: Sample, records: ProcessingRecord[]): string {
  let info = `【处理轨迹追溯】
样本条码：${sample.barcode}
导入时间：${new Date(sample.createdAt).toLocaleString('zh-CN')}
导入人：${sample.importedBy || '未记录'}

处理流程：
`;

  records.forEach((record, idx) => {
    const typeText: Record<string, string> = {
      quality_check: '质量检查',
      difference_analysis: '差异分析',
      exception_review: '异常复核',
      status_update: '状态更新',
      timepoint_fix: '时间点修正',
      duplicate_handle: '重复处理',
    };
    const resultText: Record<string, string> = {
      pending: '待处理',
      pass: '通过',
      fail: '不通过',
      warning: '异常',
      fixed: '已修正',
    };

    info += `${idx + 1}. [${typeText[record.recordType] || record.recordType}] ${new Date(record.createdAt).toLocaleString('zh-CN')}
   操作人：${record.createdBy}
   结果：${resultText[record.result] || record.result}
   ${record.description ? `描述：${record.description}` : ''}
   ${record.handlingOpinion ? `处理意见：${record.handlingOpinion}` : ''}
   ${record.isReviewed ? `复核人：${record.reviewedBy} | 复核时间：${record.reviewedAt ? new Date(record.reviewedAt).toLocaleString('zh-CN') : ''}` : ''}
`;
  });

  return info;
}

export async function exportReportToExcel(sampleIds: number[], operator: string): Promise<Buffer> {
  const allData: any[] = [];

  for (const sampleId of sampleIds) {
    const report = await generateReport(sampleId, operator);
    allData.push({
      '样本条码': report.sample.barcode,
      '样本名称': report.sample.sampleName,
      '细菌名称': report.sample.bacteriaName,
      '耐药谱': report.sample.resistanceProfile,
      '采集时间': report.sample.collectionTime,
      '检测时间': report.sample.testTime,
      '质量状态': report.sample.qualityStatus === 'pass' ? '合格' : report.sample.qualityStatus === 'warning' ? '有异常' : '不合格',
      '状态': report.sample.status,
      '质量备注': report.sample.qualityNotes,
      '质量报告': report.qualityReport,
      '条码重复说明': report.duplicateExplanation,
      '时间点说明': report.timePointExplanation,
      '处理轨迹': report.traceabilityInfo,
    });
  }

  const ws = XLSX.utils.json_to_sheet(allData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '细菌耐药谱报告');

  ws['!cols'] = [
    { wch: 20 }, { wch: 25 }, { wch: 20 }, { wch: 40 },
    { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 12 },
    { wch: 30 }, { wch: 60 }, { wch: 60 }, { wch: 60 }, { wch: 80 },
  ];

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}
