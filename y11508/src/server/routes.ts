import { Router } from 'express';
import { DatabaseService } from '../db/service';
import { StatusLinkEngine } from '../engine/status-link';
import { DataImportService } from '../imports';
import { ReportService } from '../reports';
import { authMiddleware, AuthRequest, requirePermission, filterResponse, checkStatusTransition } from './middleware';
import { ImportSource, RecordStatus, DeviceStatus } from '../types';

export function createApiRouter(
  dbService: DatabaseService,
  statusEngine: StatusLinkEngine,
  importService: DataImportService,
  reportService: ReportService
): Router {
  const router = Router();

  router.use(authMiddleware);

  router.get('/devices',
    requirePermission('devices', 'view'),
    async (req: AuthRequest, res) => {
      const devices = await dbService.getDevices();
      const filtered = devices.map(d => filterResponse(d, req.user!.role, 'devices'));
      res.json({ success: true, data: filtered });
    }
  );

  router.get('/devices/:deviceCode',
    requirePermission('devices', 'view'),
    async (req: AuthRequest, res) => {
      const device = await dbService.findDeviceByCode(req.params.deviceCode);
      if (!device) {
        return res.status(404).json({ success: false, error: '设备不存在' });
      }
      res.json({ success: true, data: filterResponse(device, req.user!.role, 'devices') });
    }
  );

  router.put('/devices/:deviceCode/status',
    requirePermission('devices', 'edit'),
    async (req: AuthRequest, res) => {
      const { status, reason } = req.body;
      if (!status || !reason) {
        return res.status(400).json({ success: false, error: '缺少状态或原因' });
      }

      let result;
      if (status === DeviceStatus.DEACTIVATED) {
        result = await statusEngine.deactivateDevice(req.params.deviceCode, req.user!.username, reason);
      } else if (status === DeviceStatus.NORMAL) {
        result = await statusEngine.activateDevice(req.params.deviceCode, req.user!.username, reason);
      } else {
        return res.status(400).json({ success: false, error: '无效的状态变更' });
      }

      if (!result) {
        return res.status(404).json({ success: false, error: '设备不存在或状态无需变更' });
      }

      res.json({ success: true, data: result });
    }
  );

  router.get('/inspections',
    requirePermission('inspectionRecords', 'view'),
    async (req: AuthRequest, res) => {
      const records = await dbService.getInspectionRecords();
      const filtered = records.map(r => filterResponse(r, req.user!.role, 'inspectionRecords'));
      res.json({ success: true, data: filtered });
    }
  );

  router.post('/inspections',
    requirePermission('inspectionRecords', 'create'),
    async (req: AuthRequest, res) => {
      const record = await dbService.createInspectionRecord({
        ...req.body,
        createdBy: req.user!.username
      });
      res.json({ success: true, data: record });
    }
  );

  router.put('/inspections/:id/status',
    async (req: AuthRequest, res) => {
      const { status, reason } = req.body;
      const record = await dbService.getInspectionRepository().findOne({ where: { id: req.params.id } });

      if (!record) {
        return res.status(404).json({ success: false, error: '记录不存在' });
      }

      if (!checkStatusTransition(record.status, status, req.user!.role)) {
        return res.status(403).json({ success: false, error: '无权进行此状态变更' });
      }

      const updated = await dbService.updateInspectionRecordStatus(
        req.params.id,
        status as RecordStatus,
        req.user!.username,
        reason
      );

      res.json({ success: true, data: updated });
    }
  );

  router.get('/certificates',
    requirePermission('calibrationCertificates', 'view'),
    async (req: AuthRequest, res) => {
      const certs = await dbService.getCalibrationCertificates();
      const filtered = certs.map(c => filterResponse(c, req.user!.role, 'calibrationCertificates'));
      res.json({ success: true, data: filtered });
    }
  );

  router.post('/certificates',
    requirePermission('calibrationCertificates', 'create'),
    async (req: AuthRequest, res) => {
      const cert = await dbService.createCalibrationCertificate({
        ...req.body,
        createdBy: req.user!.username
      });
      res.json({ success: true, data: cert });
    }
  );

  router.get('/quotes',
    requirePermission('maintenanceQuotes', 'view'),
    async (req: AuthRequest, res) => {
      const quotes = await dbService.getMaintenanceQuotes();
      const filtered = quotes.map(q => filterResponse(q, req.user!.role, 'maintenanceQuotes'));
      res.json({ success: true, data: filtered });
    }
  );

  router.post('/quotes',
    requirePermission('maintenanceQuotes', 'create'),
    async (req: AuthRequest, res) => {
      const quote = await dbService.createMaintenanceQuote({
        ...req.body,
        createdBy: req.user!.username
      });
      res.json({ success: true, data: quote });
    }
  );

  router.get('/confirms',
    requirePermission('secondaryConfirms', 'view'),
    async (req: AuthRequest, res) => {
      const confirms = await dbService.getSecondaryConfirms();
      const filtered = confirms.map(c => filterResponse(c, req.user!.role, 'secondaryConfirms'));
      res.json({ success: true, data: filtered });
    }
  );

  router.post('/confirms',
    requirePermission('secondaryConfirms', 'create'),
    async (req: AuthRequest, res) => {
      const confirm = await dbService.createSecondaryConfirm({
        ...req.body,
        createdBy: req.user!.username
      });
      res.json({ success: true, data: confirm });
    }
  );

  router.get('/dashboard', async (req: AuthRequest, res) => {
    const stats = await reportService.getDashboardStats();
    res.json({ success: true, data: stats });
  });

  router.get('/reconciliation',
    requirePermission('devices', 'view'),
    async (req, res) => {
      const results = await reportService.reconcileDeviceRecords();
      res.json({ success: true, data: results });
    }
  );

  router.post('/status-check', async (req: AuthRequest, res) => {
    const results = await statusEngine.runFullStatusCheck();
    res.json({ success: true, data: results });
  });

  router.post('/import',
    requirePermission('inspectionRecords', 'create'),
    async (req: AuthRequest, res) => {
      const { source, filePath } = req.body;
      if (!source || !filePath) {
        return res.status(400).json({ success: false, error: '缺少导入源或文件路径' });
      }

      let result;
      switch (source) {
        case ImportSource.INSPECTION:
          result = await importService.importInspectionRecordsFromCSV(filePath, req.user!.username);
          break;
        case ImportSource.CALIBRATION:
          result = await importService.importCalibrationCertificatesFromCSV(filePath, req.user!.username);
          break;
        case ImportSource.MAINTENANCE_QUOTE:
          result = await importService.importMaintenanceQuotesFromCSV(filePath, req.user!.username);
          break;
        case ImportSource.SECONDARY_CONFIRM:
          result = await importService.importSecondaryConfirmsFromCSV(filePath, req.user!.username);
          break;
        default:
          return res.status(400).json({ success: false, error: '无效的导入源' });
      }

      res.json({ success: true, data: result });
    }
  );

  router.get('/import-failures',
    requirePermission('importFailures', 'view'),
    async (req: AuthRequest, res) => {
      const failures = await dbService.getImportFailures();
      const filtered = failures.map(f => filterResponse(f, req.user!.role, 'importFailures'));
      res.json({ success: true, data: filtered });
    }
  );

  router.get('/status-logs',
    requirePermission('statusLogs', 'view'),
    async (req, res) => {
      const { entityType, entityId } = req.query;
      const logs = await dbService.getStatusLogs(
        entityType as string | undefined,
        entityId as string | undefined
      );
      res.json({ success: true, data: logs });
    }
  );

  router.get('/export/:reportType',
    requirePermission('inspectionRecords', 'view'),
    async (req, res) => {
      const { reportType } = req.params;
      let csvContent: string;

      switch (reportType) {
        case 'devices':
          csvContent = await reportService.exportDeviceStatusReport();
          break;
        case 'inspections':
          csvContent = await reportService.exportInspectionReport();
          break;
        case 'certificates':
          csvContent = await reportService.exportCertificateReport();
          break;
        case 'reconciliation':
          csvContent = await reportService.exportReconciliationReport();
          break;
        default:
          return res.status(400).json({ success: false, error: '无效的报表类型' });
      }

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${reportType}-report.csv"`);
      res.send(csvContent);
    }
  );

  router.post('/replay/sessions', async (req: AuthRequest, res) => {
    const { name } = req.body;
    const session = await dbService.createReplaySession(name, req.user!.username);
    res.json({ success: true, data: session });
  });

  router.get('/replay/sessions', async (req, res) => {
    const sessions = await dbService.getReplaySessions();
    res.json({ success: true, data: sessions });
  });

  router.post('/replay/sessions/:id/execute', async (req: AuthRequest, res) => {
    const commands = await dbService.getReplayCommands(req.params.id);
    const results: any[] = [];

    for (const cmd of commands) {
      const startTime = Date.now();
      try {
        let result = '';
        if (cmd.type === 'http') {
          const requestData = JSON.parse(cmd.content);
          const httpModule = await import('../http/client');
          const client = new httpModule.HttpClient();
          client.setUserContext(req.user!.username);
          const response = await client.request(requestData);
          result = JSON.stringify(response);
        } else if (cmd.type === 'db') {
          result = 'DB command executed';
        } else if (cmd.type === 'script') {
          result = 'Script executed';
        }

        const duration = Date.now() - startTime;
        await dbService.updateReplayCommandResult(cmd.id, result, duration);
        results.push({ commandId: cmd.id, success: true, result, duration });
      } catch (error: any) {
        const duration = Date.now() - startTime;
        await dbService.updateReplayCommandResult(cmd.id, error.message, duration);
        results.push({ commandId: cmd.id, success: false, error: error.message, duration });
      }
    }

    const hasErrors = results.some(r => !r.success);
    await dbService.completeReplaySession(req.params.id, hasErrors ? 'failed' : 'completed');

    res.json({ success: true, data: results });
  });

  return router;
}