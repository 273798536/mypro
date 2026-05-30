import { Router, Request, Response } from 'express';
import { createObjectCsvStringifier } from 'csv-writer';
import { MonitoringRepository } from '../repositories/monitoringRepository';
import { MonitoringService } from '../services/monitoringService';
import { generatePhase1SampleData, generatePhase2SampleData } from '../services/sampleDataGenerator';
import { ImportPhase1Data, ImportPhase2Data, MonitoringDetail } from '../types';

export function createMonitoringRoutes(
  repository: MonitoringRepository,
  service: MonitoringService
): Router {
  const router = Router();

  router.post('/seed/sample', async (req: Request, res: Response) => {
    try {
      const phase1Data = generatePhase1SampleData();
      const phase2Data = generatePhase2SampleData();

      const phase1Result = await service.importPhase1(phase1Data, 'seed');
      const phase2Result = await service.importPhase2(phase2Data, 'seed');

      res.json({
        success: true,
        message: '样例数据生成完成，包含两阶段导入',
        phase1: {
          sensors: phase1Result.sensors.length,
          records: phase1Result.temperatureRecords.length,
          anomalies: phase1Result.summary.anomalies
        },
        phase2: {
          archives: phase2Result.cableArchives.length,
          affectedDetails: phase2Result.affectedDetails.length,
          changeLogs: phase2Result.changeLogs.length
        },
        phaseComparison: {
          beforePhase2: phase2Result.summary.phase2Comparison.before.message,
          afterPhase2: phase2Result.summary.phase2Comparison.after.message,
          changes: phase2Result.summary.phase2Comparison.changes
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  router.post('/import/phase1', async (req: Request, res: Response) => {
    try {
      const data = req.body as ImportPhase1Data;
      const importedBy = (req.headers['x-user'] as string) || 'system';

      if (!data.sensors || !data.temperatureRecords) {
        return res.status(400).json({
          success: false,
          error: '缺少必要数据：sensors 和 temperatureRecords 为必填'
        });
      }

      const result = await service.importPhase1(data, importedBy);

      res.json({
        success: true,
        message: '第一阶段导入完成',
        data: {
          sensors: result.sensors,
          temperatureRecords: result.temperatureRecords.length,
          details: result.details.length,
          summary: result.summary
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  router.post('/import/phase2', async (req: Request, res: Response) => {
    try {
      const data = req.body as ImportPhase2Data;
      const importedBy = (req.headers['x-user'] as string) || 'system';

      if (!data.cableArchives) {
        return res.status(400).json({
          success: false,
          error: '缺少必要数据：cableArchives 为必填'
        });
      }

      const result = await service.importPhase2(data, importedBy);

      res.json({
        success: true,
        message: '第二阶段导入完成，已重新分析受影响的明细',
        data: {
          cableArchives: result.cableArchives,
          affectedDetailsCount: result.affectedDetails.length,
          affectedDetails: result.affectedDetails.map(d => ({
            id: d.id,
            record_time: d.record_time,
            sensor_id: d.sensor_id,
            old_status: result.changeLogs
              .filter(l => l.detail_id === d.id && l.field_name === 'status')
              .map(l => l.old_value),
            new_status: d.status,
            changes: result.changeLogs
              .filter(l => l.detail_id === d.id)
              .map(l => ({
                field: l.field_name,
                old: l.old_value,
                new: l.new_value,
                reason: l.change_reason
              }))
          })),
          summary: result.summary
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  router.get('/details', async (req: Request, res: Response) => {
    try {
      const params = {
        sensorId: req.query.sensorId as string | undefined,
        cableId: req.query.cableId as string | undefined,
        isAnomaly: req.query.isAnomaly !== undefined ? req.query.isAnomaly === 'true' : undefined,
        status: req.query.status as string | undefined,
        affectedByCableArchive: req.query.affectedByArchive !== undefined ? req.query.affectedByArchive === 'true' : undefined,
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined
      };

      const details = await repository.getMonitoringDetails(params);

      res.json({
        success: true,
        count: details.length,
        data: details
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  router.get('/details/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await service.getDetailWithHistory(id);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(404).json({ success: false, error: (error as Error).message });
    }
  });

  router.patch('/details/:id/status', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status, reason } = req.body as { status: MonitoringDetail['status']; reason?: string };

      const validStatuses: MonitoringDetail['status'][] = ['pending', 'normal', 'warning', 'critical', 'resolved'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `无效的状态值，允许值：${validStatuses.join(', ')}`
        });
      }

      const result = await service.updateDetailStatus(
        id,
        status,
        reason || '人工更新状态'
      );

      res.json({
        success: true,
        message: '状态更新成功',
        data: result
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  router.get('/export', async (req: Request, res: Response) => {
    try {
      const params = {
        sensorId: req.query.sensorId as string | undefined,
        isAnomaly: req.query.isAnomaly !== undefined ? req.query.isAnomaly === 'true' : undefined,
        status: req.query.status as string | undefined,
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined
      };

      const exportData = await service.exportResults(params);

      const format = (req.query.format as string)?.toLowerCase() || 'json';

      if (format === 'csv') {
        if (exportData.length === 0) {
          res.setHeader('Content-Type', 'text/csv; charset=utf-8');
          return res.send('');
        }

        const headers = Object.keys(exportData[0]).map(key => ({
          id: key,
          title: key
        }));

        const csvStringifier = createObjectCsvStringifier({ header: headers });
        const csvContent = '\uFEFF' + csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(exportData);

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="bridge_cable_monitoring_${Date.now()}.csv"`);
        res.send(csvContent);
      } else {
        res.json({
          success: true,
          count: exportData.length,
          data: exportData
        });
      }
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  router.get('/statistics', async (req: Request, res: Response) => {
    try {
      const stats = await service.getStatistics();
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  router.get('/sensors', async (req: Request, res: Response) => {
    try {
      const sensors = await repository.getSensors();
      res.json({ success: true, count: sensors.length, data: sensors });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  router.get('/cables', async (req: Request, res: Response) => {
    try {
      const archives = await repository.getCableArchives();
      res.json({ success: true, count: archives.length, data: archives });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  router.get('/batches', async (req: Request, res: Response) => {
    try {
      const batches = await repository.getImportBatches();
      res.json({ success: true, count: batches.length, data: batches });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  router.get('/details/:id/changes', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const logs = await repository.getChangeLogs(id);
      res.json({ success: true, count: logs.length, data: logs });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  return router;
}
