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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const XLSX = __importStar(require("xlsx"));
const runService_1 = require("./services/runService");
const recordService_1 = require("./services/recordService");
const anomalyService_1 = require("./services/anomalyService");
const permissionService_1 = require("./services/permissionService");
const importService_1 = require("./services/importService");
const exportService_1 = require("./services/exportService");
const router = (0, express_1.Router)();
const uploadDir = path_1.default.join(__dirname, '..', '..', 'uploads');
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => cb(null, `${Date.now()}_${file.originalname}`)
});
const upload = (0, multer_1.default)({ storage });
router.get('/health', (_req, res) => {
    res.json({ ok: true });
});
router.get('/runs', (_req, res) => {
    res.json((0, runService_1.getRuns)());
});
router.get('/runs/:id', (req, res) => {
    const run = (0, runService_1.getRun)(Number(req.params.id));
    if (!run)
        return res.status(404).json({ error: 'not found' });
    res.json(run);
});
router.delete('/runs/:id', (req, res) => {
    (0, runService_1.deleteRun)(Number(req.params.id));
    res.json({ ok: true });
});
router.post('/import', upload.single('file'), (req, res) => {
    try {
        if (!req.file)
            return res.status(400).json({ error: 'no file' });
        const result = (0, importService_1.importFile)(req.file.path, req.file.originalname);
        res.json(result);
    }
    catch (e) {
        res.status(400).json({ error: e.message });
    }
});
router.get('/records', (req, res) => {
    const runId = Number(req.query.run_id);
    if (!runId)
        return res.status(400).json({ error: 'run_id required' });
    const filters = {
        anomalyType: req.query.anomaly_type,
        migrationStatus: req.query.migration_status,
        hasAnomaly: req.query.has_anomaly !== undefined ? req.query.has_anomaly === 'true' : undefined
    };
    res.json((0, recordService_1.getRecordsByRun)(runId, filters));
});
router.get('/records/:id', (req, res) => {
    const r = (0, recordService_1.getRecord)(Number(req.params.id));
    if (!r)
        return res.status(404).json({ error: 'not found' });
    res.json(r);
});
router.patch('/records/:id/migration-status', (req, res) => {
    const { status } = req.body;
    const valid = ['not_started', 'in_progress', 'completed', 'blocked'];
    if (!valid.includes(status))
        return res.status(400).json({ error: 'invalid status' });
    (0, recordService_1.updateMigrationStatus)(Number(req.params.id), status);
    res.json({ ok: true });
});
router.get('/records/:id/anomalies', (req, res) => {
    res.json((0, anomalyService_1.getAnomaliesByRecord)(Number(req.params.id)));
});
router.patch('/anomalies/:id', (req, res) => {
    (0, anomalyService_1.updateAnomaly)(Number(req.params.id), req.body);
    res.json({ ok: true });
});
router.get('/records/:id/permissions', (req, res) => {
    res.json((0, permissionService_1.getPermissionsByRecord)(Number(req.params.id)));
});
router.post('/records/:id/permissions', (req, res) => {
    const id = (0, permissionService_1.createPermission)({ record_id: Number(req.params.id), ...req.body });
    res.json({ id });
});
router.delete('/permissions/:id', (req, res) => {
    (0, permissionService_1.deletePermission)(Number(req.params.id));
    res.json({ ok: true });
});
router.get('/stats/overview', (req, res) => {
    const runId = Number(req.query.run_id);
    if (!runId)
        return res.status(400).json({ error: 'run_id required' });
    const records = (0, recordService_1.getRecordsByRun)(runId);
    const byAnomalyType = {};
    const byMigrationStatus = {};
    let errorCount = 0;
    let warningCount = 0;
    for (const r of records) {
        byMigrationStatus[r.migration_status] = (byMigrationStatus[r.migration_status] || 0) + 1;
        for (const a of r.anomalies) {
            byAnomalyType[a.anomaly_type] = (byAnomalyType[a.anomaly_type] || 0) + 1;
            if (a.severity === 'error')
                errorCount++;
            else
                warningCount++;
        }
    }
    res.json({
        total: records.length,
        withAnomaly: records.filter((r) => r.anomalies.length > 0).length,
        errorCount,
        warningCount,
        byAnomalyType,
        byMigrationStatus
    });
});
router.get('/export/:runId', (req, res) => {
    try {
        const runId = Number(req.params.runId);
        const wb = (0, exportService_1.buildExportWorkbook)(runId);
        const filename = (0, exportService_1.getExportFilename)(runId);
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
        res.send(buffer);
    }
    catch (e) {
        res.status(400).json({ error: e.message });
    }
});
exports.default = router;
