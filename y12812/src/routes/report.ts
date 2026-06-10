import { Router, Request, Response } from 'express';
import * as xlsx from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';
import { SampleRepository } from '../repositories/SampleRepository';
import { BatchRepository } from '../repositories/BatchRepository';
import { StatisticsRepository } from '../repositories/StatisticsRepository';
import { ProcessingRecordRepository } from '../repositories/ProcessingRecordRepository';
import { ReportExportRepository } from '../repositories/ReportExportRepository';
import { AuditLogRepository } from '../repositories/AuditLogRepository';
import { SampleStatus, Sample } from '../types';

const router = Router();

const EXPORT_DIR = path.join(process.cwd(), 'data', 'exports');

function ensureExportDir(): void {
  if (!fs.existsSync(EXPORT_DIR)) {
    fs.mkdirSync(EXPORT_DIR, { recursive: true });
  }
}

function buildReportSheets(batchId: string, batchNo: string, samples: Sample[]) {
  const groupStats = StatisticsRepository.calculateGroupStatistics(batchId);
  const overallStats = StatisticsRepository.calculateOverallStatistics(batchId);
  const timePointInfo = StatisticsRepository.getTimePointCompleteness(batchId);
  const processingRecords = ProcessingRecordRepository.findByBatchId(batchId);

  const summaryData = [
    ['种子发芽率统计报告'],
    [],
    ['批次编号', batchNo],
    ['统计时间', new Date().toLocaleString('zh-CN')],
    ['样本总数', overallStats.totalSamples],
    ['平均发芽率', `${overallStats.avgGerminationRate}%`],
    ['质控通过率', `${overallStats.overallQcPassRate}%`],
    ['异常率', `${overallStats.abnormalRate}%`],
    [],
    ['时间点完整性'],
    ['播种日期完整数', String(timePointInfo.completeTimePoints)],
    ['播种日期缺失数', String(timePointInfo.missingSowingDate)],
    ['发芽日期缺失数', String(timePointInfo.missingGerminationDates)],
    ['完整率', `${timePointInfo.completenessRate}%`],
  ];

  const groupData = [
    ['分组统计'],
    ['分组名称', '样本数', '平均发芽率(%)', '最高发芽率(%)', '最低发芽率(%)', '异常数', '质控通过率(%)'],
    ...groupStats.map(g => [
      g.groupName,
      g.sampleCount,
      g.avgGerminationRate,
      g.maxGerminationRate,
      g.minGerminationRate,
      g.abnormalCount,
      g.qcPassRate
    ])
  ];

  const sampleData = [
    ['样本明细'],
    ['条码', '分组', '种子类型', '播种日期', '总种子数', '发芽种子数', '发芽率(%)', '质控', '异常', '异常说明', '病理备注', '处理意见'],
    ...samples.map(s => [
      s.barcode,
      s.groupName,
      s.seedType,
      s.sowingDate || '缺失',
      s.totalSeeds,
      s.germinatedSeeds,
      s.germinationRate,
      s.qcPassed ? '通过' : '不通过',
      s.abnormal ? '是' : '否',
      s.abnormalRemark || '',
      s.pathologyRemark || '',
      s.handlingOpinion || ''
    ])
  ];

  const recordsData = [
    ['处理记录（质控与统计共用）'],
    ['样本条码', '记录类型', '操作人', '操作时间', '原值', '新值', '备注'],
    ...processingRecords.map(r => {
      const sample = samples.find(s => s.id === r.sampleId);
      return [
        sample?.barcode || r.sampleId,
        r.recordType,
        r.operator,
        r.operationTime,
        r.oldValue || '',
        r.newValue || '',
        r.remark || ''
      ];
    })
  ];

  return { summaryData, groupData, sampleData, recordsData };
}

router.post('/export/:batchId', (req: Request, res: Response) => {
  try {
    const { batchId } = req.params;
    const { operator } = req.body;

    if (!operator) {
      return res.status(400).json({ error: '请提供操作人' });
    }

    const batch = BatchRepository.findById(batchId);
    if (!batch) {
      return res.status(404).json({ error: '批次不存在' });
    }

    const samples = SampleRepository.findByBatchId(batchId);

    const exportRecord = ReportExportRepository.create(batchId, operator);

    ensureExportDir();

    const { summaryData, groupData, sampleData, recordsData } = buildReportSheets(batchId, batch.batchNo, samples);

    const wb = xlsx.utils.book_new();

    const ws1 = xlsx.utils.aoa_to_sheet(summaryData);
    ws1['!cols'] = [{ wch: 20 }, { wch: 30 }];
    xlsx.utils.book_append_sheet(wb, ws1, '报告概要');

    const ws2 = xlsx.utils.aoa_to_sheet(groupData);
    xlsx.utils.book_append_sheet(wb, ws2, '分组统计');

    const ws3 = xlsx.utils.aoa_to_sheet(sampleData);
    ws3['!cols'] = [
      { wch: 15 }, { wch: 12 }, { wch: 18 }, { wch: 14 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 8 },
      { wch: 8 }, { wch: 30 }, { wch: 30 }, { wch: 30 }
    ];
    xlsx.utils.book_append_sheet(wb, ws3, '样本明细');

    const ws4 = xlsx.utils.aoa_to_sheet(recordsData);
    xlsx.utils.book_append_sheet(wb, ws4, '处理记录');

    const filePath = path.join(EXPORT_DIR, exportRecord.fileName);
    xlsx.writeFile(wb, filePath);

    for (const sample of samples) {
      if (sample.status === SampleStatus.STATISTICS_DONE) {
        SampleRepository.updateStatus(sample.id, SampleStatus.REPORT_GENERATED, operator, '报告已导出');
      }
    }
    BatchRepository.updateStatus(batchId, SampleStatus.REPORT_GENERATED, operator, `报告已导出: ${exportRecord.fileName}`);

    ProcessingRecordRepository.create({
      sampleId: samples[0]?.id || '',
      batchId,
      recordType: 'statistics',
      operator,
      newValue: SampleStatus.REPORT_GENERATED,
      remark: `导出报告: ${exportRecord.fileName}, 第${exportRecord.runNumber}次`,
      shared: true
    });

    AuditLogRepository.create({
      batchId,
      operation: '导出报告',
      operator,
      fieldName: 'report',
      newValue: exportRecord.fileName,
      reason: `第${exportRecord.runNumber}次导出`
    });

    res.json({
      data: {
        fileName: exportRecord.fileName,
        runNumber: exportRecord.runNumber,
        exportTime: exportRecord.exportTime,
        filePath: `/data/exports/${exportRecord.fileName}`,
        message: `报告已导出为第${exportRecord.runNumber}次运行结果`
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/download/:fileName', (req: Request, res: Response) => {
  try {
    const filePath = path.join(EXPORT_DIR, req.params.fileName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: '文件不存在' });
    }
    res.download(filePath);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/history/:batchId', (req: Request, res: Response) => {
  try {
    const exports = ReportExportRepository.findByBatchId(req.params.batchId);
    res.json({ data: exports });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/preview/:batchId', (req: Request, res: Response) => {
  try {
    const batch = BatchRepository.findById(req.params.batchId);
    if (!batch) {
      return res.status(404).json({ error: '批次不存在' });
    }

    const samples = SampleRepository.findByBatchId(req.params.batchId);
    const { summaryData, groupData, sampleData, recordsData } = buildReportSheets(req.params.batchId, batch.batchNo, samples);

    const nextRunNumber = ReportExportRepository.getNextRunNumber(req.params.batchId);

    res.json({
      data: {
        batchNo: batch.batchNo,
        batchName: batch.name,
        nextRunNumber,
        preview: {
          summary: summaryData,
          groupStats: groupData,
          sampleDetails: sampleData,
          processingRecords: recordsData
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
