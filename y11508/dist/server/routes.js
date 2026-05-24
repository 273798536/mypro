"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApiRouter = createApiRouter;
const express_1 = require("express");
const middleware_1 = require("./middleware");
const types_1 = require("../types");
function createApiRouter(dbService, statusEngine, importService, reportService) {
    const router = (0, express_1.Router)();
    router.use(middleware_1.authMiddleware);
    router.get('/devices', (0, middleware_1.requirePermission)('devices', 'view'), async (req, res) => {
        const devices = await dbService.getDevices();
        const filtered = devices.map(d => (0, middleware_1.filterResponse)(d, req.user.role, 'devices'));
        res.json({ success: true, data: filtered });
    });
    router.get('/devices/:deviceCode', (0, middleware_1.requirePermission)('devices', 'view'), async (req, res) => {
        const device = await dbService.findDeviceByCode(req.params.deviceCode);
        if (!device) {
            return res.status(404).json({ success: false, error: '设备不存在' });
        }
        res.json({ success: true, data: (0, middleware_1.filterResponse)(device, req.user.role, 'devices') });
    });
    router.put('/devices/:deviceCode/status', (0, middleware_1.requirePermission)('devices', 'edit'), async (req, res) => {
        const { status, reason } = req.body;
        if (!status || !reason) {
            return res.status(400).json({ success: false, error: '缺少状态或原因' });
        }
        let result;
        if (status === types_1.DeviceStatus.DEACTIVATED) {
            result = await statusEngine.deactivateDevice(req.params.deviceCode, req.user.username, reason);
        }
        else if (status === types_1.DeviceStatus.NORMAL) {
            result = await statusEngine.activateDevice(req.params.deviceCode, req.user.username, reason);
        }
        else {
            return res.status(400).json({ success: false, error: '无效的状态变更' });
        }
        if (!result) {
            return res.status(404).json({ success: false, error: '设备不存在或状态无需变更' });
        }
        res.json({ success: true, data: result });
    });
    router.get('/inspections', (0, middleware_1.requirePermission)('inspectionRecords', 'view'), async (req, res) => {
        const records = await dbService.getInspectionRecords();
        const filtered = records.map(r => (0, middleware_1.filterResponse)(r, req.user.role, 'inspectionRecords'));
        res.json({ success: true, data: filtered });
    });
    router.post('/inspections', (0, middleware_1.requirePermission)('inspectionRecords', 'create'), async (req, res) => {
        const record = await dbService.createInspectionRecord({
            ...req.body,
            createdBy: req.user.username
        });
        res.json({ success: true, data: record });
    });
    router.put('/inspections/:id/status', async (req, res) => {
        const { status, reason } = req.body;
        const record = await dbService.getInspectionRepository().findOne({ where: { id: req.params.id } });
        if (!record) {
            return res.status(404).json({ success: false, error: '记录不存在' });
        }
        if (!(0, middleware_1.checkStatusTransition)(record.status, status, req.user.role)) {
            return res.status(403).json({ success: false, error: '无权进行此状态变更' });
        }
        const updated = await dbService.updateInspectionRecordStatus(req.params.id, status, req.user.username, reason);
        res.json({ success: true, data: updated });
    });
    router.get('/certificates', (0, middleware_1.requirePermission)('calibrationCertificates', 'view'), async (req, res) => {
        const certs = await dbService.getCalibrationCertificates();
        const filtered = certs.map(c => (0, middleware_1.filterResponse)(c, req.user.role, 'calibrationCertificates'));
        res.json({ success: true, data: filtered });
    });
    router.post('/certificates', (0, middleware_1.requirePermission)('calibrationCertificates', 'create'), async (req, res) => {
        const cert = await dbService.createCalibrationCertificate({
            ...req.body,
            createdBy: req.user.username
        });
        res.json({ success: true, data: cert });
    });
    router.get('/quotes', (0, middleware_1.requirePermission)('maintenanceQuotes', 'view'), async (req, res) => {
        const quotes = await dbService.getMaintenanceQuotes();
        const filtered = quotes.map(q => (0, middleware_1.filterResponse)(q, req.user.role, 'maintenanceQuotes'));
        res.json({ success: true, data: filtered });
    });
    router.post('/quotes', (0, middleware_1.requirePermission)('maintenanceQuotes', 'create'), async (req, res) => {
        const quote = await dbService.createMaintenanceQuote({
            ...req.body,
            createdBy: req.user.username
        });
        res.json({ success: true, data: quote });
    });
    router.get('/confirms', (0, middleware_1.requirePermission)('secondaryConfirms', 'view'), async (req, res) => {
        const confirms = await dbService.getSecondaryConfirms();
        const filtered = confirms.map(c => (0, middleware_1.filterResponse)(c, req.user.role, 'secondaryConfirms'));
        res.json({ success: true, data: filtered });
    });
    router.post('/confirms', (0, middleware_1.requirePermission)('secondaryConfirms', 'create'), async (req, res) => {
        const confirm = await dbService.createSecondaryConfirm({
            ...req.body,
            createdBy: req.user.username
        });
        res.json({ success: true, data: confirm });
    });
    router.get('/dashboard', async (req, res) => {
        const stats = await reportService.getDashboardStats();
        res.json({ success: true, data: stats });
    });
    router.get('/reconciliation', (0, middleware_1.requirePermission)('devices', 'view'), async (req, res) => {
        const results = await reportService.reconcileDeviceRecords();
        res.json({ success: true, data: results });
    });
    router.post('/status-check', async (req, res) => {
        const results = await statusEngine.runFullStatusCheck();
        res.json({ success: true, data: results });
    });
    router.post('/import', (0, middleware_1.requirePermission)('inspectionRecords', 'create'), async (req, res) => {
        const { source, filePath } = req.body;
        if (!source || !filePath) {
            return res.status(400).json({ success: false, error: '缺少导入源或文件路径' });
        }
        let result;
        switch (source) {
            case types_1.ImportSource.INSPECTION:
                result = await importService.importInspectionRecordsFromCSV(filePath, req.user.username);
                break;
            case types_1.ImportSource.CALIBRATION:
                result = await importService.importCalibrationCertificatesFromCSV(filePath, req.user.username);
                break;
            case types_1.ImportSource.MAINTENANCE_QUOTE:
                result = await importService.importMaintenanceQuotesFromCSV(filePath, req.user.username);
                break;
            case types_1.ImportSource.SECONDARY_CONFIRM:
                result = await importService.importSecondaryConfirmsFromCSV(filePath, req.user.username);
                break;
            default:
                return res.status(400).json({ success: false, error: '无效的导入源' });
        }
        res.json({ success: true, data: result });
    });
    router.get('/import-failures', (0, middleware_1.requirePermission)('importFailures', 'view'), async (req, res) => {
        const failures = await dbService.getImportFailures();
        const filtered = failures.map(f => (0, middleware_1.filterResponse)(f, req.user.role, 'importFailures'));
        res.json({ success: true, data: filtered });
    });
    router.get('/status-logs', (0, middleware_1.requirePermission)('statusLogs', 'view'), async (req, res) => {
        const { entityType, entityId } = req.query;
        const logs = await dbService.getStatusLogs(entityType, entityId);
        res.json({ success: true, data: logs });
    });
    router.get('/export/:reportType', (0, middleware_1.requirePermission)('inspectionRecords', 'view'), async (req, res) => {
        const { reportType } = req.params;
        let csvContent;
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
    });
    router.post('/replay/sessions', async (req, res) => {
        const { name } = req.body;
        const session = await dbService.createReplaySession(name, req.user.username);
        res.json({ success: true, data: session });
    });
    router.get('/replay/sessions', async (req, res) => {
        const sessions = await dbService.getReplaySessions();
        res.json({ success: true, data: sessions });
    });
    router.post('/replay/sessions/:id/execute', async (req, res) => {
        const commands = await dbService.getReplayCommands(req.params.id);
        const results = [];
        for (const cmd of commands) {
            const startTime = Date.now();
            try {
                let result = '';
                if (cmd.type === 'http') {
                    const requestData = JSON.parse(cmd.content);
                    const httpModule = await Promise.resolve().then(() => __importStar(require('../http/client')));
                    const client = new httpModule.HttpClient();
                    client.setUserContext(req.user.username);
                    const response = await client.request(requestData);
                    result = JSON.stringify(response);
                }
                else if (cmd.type === 'db') {
                    result = 'DB command executed';
                }
                else if (cmd.type === 'script') {
                    result = 'Script executed';
                }
                const duration = Date.now() - startTime;
                await dbService.updateReplayCommandResult(cmd.id, result, duration);
                results.push({ commandId: cmd.id, success: true, result, duration });
            }
            catch (error) {
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
//# sourceMappingURL=routes.js.map