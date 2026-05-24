import { Router, Request, Response } from 'express';
import {
  getUnifiedRecords,
  exportToCSV,
  exportToJSON,
  getStatisticsForExport,
  getRetryAnalysis,
} from '../services/exportService';

const router = Router();

router.get('/records', async (req: Request, res: Response) => {
  try {
    const { status, dirtyType, startDate, endDate } = req.query;
    const records = await getUnifiedRecords({
      status: status as string,
      dirtyType: dirtyType as string,
      startDate: startDate as string,
      endDate: endDate as string,
    });
    res.json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
});

router.get('/csv', async (req: Request, res: Response) => {
  try {
    const { status, dirtyType, startDate, endDate } = req.query;
    const filepath = await exportToCSV({
      status: status as string,
      dirtyType: dirtyType as string,
      startDate: startDate as string,
      endDate: endDate as string,
    });
    res.download(filepath);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
});

router.get('/json', async (req: Request, res: Response) => {
  try {
    const { status, dirtyType, startDate, endDate } = req.query;
    const filepath = await exportToJSON({
      status: status as string,
      dirtyType: dirtyType as string,
      startDate: startDate as string,
      endDate: endDate as string,
    });
    res.download(filepath);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
});

router.get('/statistics', async (req: Request, res: Response) => {
  try {
    const stats = await getStatisticsForExport();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
});

router.get('/retry-analysis', async (req: Request, res: Response) => {
  try {
    const analysis = await getRetryAnalysis();
    res.json({ success: true, data: analysis });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
});

router.get('/nurse-report', async (req: Request, res: Response) => {
  try {
    const [stats, retryAnalysis, manualItems, deadLetterItems] = await Promise.all([
      getStatisticsForExport(),
      getRetryAnalysis(),
      getUnifiedRecords({ status: 'manual_intervention' }),
      getUnifiedRecords({ status: 'dead_letter' }),
    ]);

    const retryClassification = {
      missing_fields: retryAnalysis.filter((r: any) => r.dirtyType === 'missing_fields').length,
      cross_day: retryAnalysis.filter((r: any) => r.dirtyType === 'cross_day').length,
      name_changed: retryAnalysis.filter((r: any) => r.dirtyType === 'name_changed').length,
      amount_conflict: retryAnalysis.filter((r: any) => r.dirtyType === 'amount_conflict').length,
      quantity_conflict: retryAnalysis.filter((r: any) => r.dirtyType === 'quantity_conflict').length,
    };

    const report = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalToday: retryAnalysis.length,
        manualIntervention: manualItems.length,
        deadLetter: deadLetterItems.length,
        retryClassification,
      },
      manualInterventionItems: manualItems.map(item => ({
        queueId: item.queueId,
        recordType: item.recordType,
        deviceId: item.deviceId,
        deviceName: item.deviceName,
        details: item.details,
        createdAt: item.createdAt,
      })),
      deadLetterItems: deadLetterItems.map(item => ({
        queueId: item.queueId,
        recordType: item.recordType,
        deviceId: item.deviceId,
        deviceName: item.deviceName,
        retryCount: retryAnalysis.find((r: any) => r.id === item.queueId)?.retryCount || 0,
        createdAt: item.createdAt,
      })),
      recoveryNextSteps: {
        priority: [
          '1. 优先处理 missing_fields 类型（只需补全字段即可恢复）',
          '2. 处理 cross_day 类型（需核实日期后重新提交）',
          '3. 处理 name_changed 类型（需确认设备名称变更原因）',
          '4. 处理金额/数量冲突类型（需与财务核对后修正）',
        ],
      },
    };

    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
});

export default router;
