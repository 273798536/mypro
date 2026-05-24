import express from 'express';
import { importService } from '../services/importService';
import { checkService } from '../services/checkService';
import { exportService } from '../services/exportService';
import { BatchDAO, HistoryDAO, AuditLogDAO, FailedRecordDAO, AsyncTaskDAO } from '../db/dao';

export function createApiServer(workDir?: string) {
  const app = express();
  app.use(express.json());

  const batchDAO = new BatchDAO(workDir);
  const historyDAO = new HistoryDAO(workDir);
  const auditLogDAO = new AuditLogDAO(workDir);
  const failedRecordDAO = new FailedRecordDAO(workDir);
  const asyncTaskDAO = new AsyncTaskDAO(workDir);

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.post('/api/import', async (req, res) => {
    try {
      const { file_path, type, strategy, operator, remark } = req.body;

      if (!file_path || !type) {
        return res.status(400).json({
          error: '缺少必要参数: file_path, type',
        });
      }

      const result = await importService.importData(
        type,
        file_path,
        strategy || 'append',
        operator || 'api_user',
        remark
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  app.post('/api/check', async (req, res) => {
    try {
      const { type, cross } = req.body;

      let result;
      if (cross) {
        result = await checkService.crossCheck();
      } else if (type) {
        result = await checkService.checkConsistency(type);
      } else {
        result = await checkService.crossCheck();
      }

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  app.get('/api/report', async (req, res) => {
    try {
      const report = await checkService.generateReport();
      res.json({
        success: true,
        data: report,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  app.get('/api/batches', async (req, res) => {
    try {
      const batches = await batchDAO.findAll();
      res.json({
        success: true,
        data: batches,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  app.get('/api/batches/:id', async (req, res) => {
    try {
      const batch = await batchDAO.findById(req.params.id);
      if (!batch) {
        return res.status(404).json({
          success: false,
          error: '批次不存在',
        });
      }
      res.json({
        success: true,
        data: batch,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  app.get('/api/history/:materialCode', async (req, res) => {
    try {
      const history = await historyDAO.getHistory(req.params.materialCode);
      res.json({
        success: true,
        data: history,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  app.get('/api/audit-logs', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const logs = await auditLogDAO.findAll(limit);
      res.json({
        success: true,
        data: logs,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  app.get('/api/failed-records', async (req, res) => {
    try {
      const { batch_id, status } = req.query;
      let records;

      if (batch_id) {
        records = await failedRecordDAO.findByBatchId(batch_id as string);
      } else if (status) {
        records = await failedRecordDAO.findByStatus(status as any);
      } else {
        records = await failedRecordDAO.findAll();
      }

      res.json({
        success: true,
        data: records,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  app.patch('/api/failed-records/:id', async (req, res) => {
    try {
      const { status, operator } = req.body;
      if (!['pending', 'fixed', 'ignored'].includes(status)) {
        return res.status(400).json({
          error: '无效的状态值',
        });
      }
      await failedRecordDAO.updateStatus(req.params.id, status, operator);
      res.json({
        success: true,
        message: '状态已更新',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  app.get('/api/tasks', async (req, res) => {
    try {
      const { status } = req.query;
      let tasks;

      if (status) {
        tasks = await asyncTaskDAO.findByStatus(status as any);
      } else {
        tasks = await asyncTaskDAO.findAll();
      }

      res.json({
        success: true,
        data: tasks,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  app.post('/api/tasks/retry', async (req, res) => {
    try {
      const { operator } = req.body;
      const result = await importService.processRetryableTasks(operator || 'api_user');
      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  app.post('/api/export', async (req, res) => {
    try {
      const { type, batch_id, failed, history, audit, all, output } = req.body;

      if (!output) {
        return res.status(400).json({
          error: '缺少输出路径',
        });
      }

      if (all) {
        await exportService.exportAll(output);
      } else if (type) {
        await exportService.exportToCSV(type, output);
      } else if (batch_id) {
        await exportService.exportBatchToCSV(batch_id, output);
      } else if (failed) {
        await exportService.exportFailedRecords(output);
      } else if (history) {
        await exportService.exportHistory(history, output);
      } else if (audit) {
        await exportService.exportAuditLog(output);
      } else {
        return res.status(400).json({
          error: '请指定导出类型',
        });
      }

      res.json({
        success: true,
        output_path: output,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  return app;
}
