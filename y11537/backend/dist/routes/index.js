"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const auth_1 = require("../middleware/auth");
const authController_1 = require("../controllers/authController");
const dataController_1 = require("../controllers/dataController");
const queueController_1 = require("../controllers/queueController");
const reportController_1 = require("../controllers/reportController");
const types_1 = require("../models/types");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({
    dest: 'uploads/',
    limits: {
        fileSize: 50 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /\.(zip|tar|gz|rar|tgz)$/i;
        if (allowedTypes.test(file.originalname)) {
            cb(null, true);
        }
        else {
            cb(new Error('仅支持 .zip, .tar, .tar.gz, .rar 格式'));
        }
    }
});
router.post('/auth/login', authController_1.login);
router.get('/auth/me', auth_1.authenticateToken, authController_1.getCurrentUser);
router.post('/auth/change-password', auth_1.authenticateToken, authController_1.changePassword);
router.post('/data/registration', auth_1.authenticateToken, (0, auth_1.requirePermission)(types_1.AuditAction.SUBMIT), dataController_1.submitRegistration);
router.post('/data/signin', auth_1.authenticateToken, (0, auth_1.requirePermission)(types_1.AuditAction.SUBMIT), dataController_1.submitSignin);
router.post('/data/homework', auth_1.authenticateToken, (0, auth_1.requirePermission)(types_1.AuditAction.SUBMIT), dataController_1.submitHomework);
router.post('/data/price-adjustment', auth_1.authenticateToken, (0, auth_1.requirePermission)(types_1.AuditAction.SUBMIT), dataController_1.submitPriceAdjustment);
router.post('/data/history-archive', auth_1.authenticateToken, (0, auth_1.requirePermission)(types_1.AuditAction.SUBMIT), dataController_1.submitHistoryArchive);
router.post('/data/history-archive/upload', auth_1.authenticateToken, (0, auth_1.requirePermission)(types_1.AuditAction.SUBMIT), upload.single('file'), dataController_1.uploadHistoryArchive);
router.get('/queue', auth_1.authenticateToken, queueController_1.getQueueList);
router.get('/queue/stats', auth_1.authenticateToken, queueController_1.getQueueStatistics);
router.get('/queue/:id', auth_1.authenticateToken, queueController_1.getQueueDetail);
router.post('/queue/:id/manual-takeover', auth_1.authenticateToken, (0, auth_1.requirePermission)(types_1.AuditAction.MANUAL_TAKEOVER), queueController_1.handleManualTakeover);
router.post('/queue/:id/compensate', auth_1.authenticateToken, (0, auth_1.requirePermission)(types_1.AuditAction.COMPENSATE), queueController_1.handleCompensateAndClose);
router.post('/queue/:id/close', auth_1.authenticateToken, (0, auth_1.requirePermission)(types_1.AuditAction.CLOSE), queueController_1.handleCloseQueue);
router.post('/queue/:id/retry', auth_1.authenticateToken, (0, auth_1.requirePermission)(types_1.AuditAction.RETRY), queueController_1.handleRetry);
router.get('/reports/signin', auth_1.authenticateToken, reportController_1.getSigninReport);
router.get('/reports/signin/export', auth_1.authenticateToken, (0, auth_1.requirePermission)(types_1.AuditAction.EXPORT), reportController_1.exportSigninReport);
router.get('/reports/failed-records', auth_1.authenticateToken, reportController_1.getFailedRecords);
router.get('/reports/failed-records/export', auth_1.authenticateToken, (0, auth_1.requirePermission)(types_1.AuditAction.EXPORT), reportController_1.exportFailedRecords);
router.get('/reports/hrbp-dashboard', auth_1.authenticateToken, reportController_1.getHrbpDashboard);
router.get('/reports/diff/:recordType/:recordId', auth_1.authenticateToken, reportController_1.getRecordDiff);
router.post('/failed-records/:id/resolve', auth_1.authenticateToken, (0, auth_1.requirePermission)(types_1.AuditAction.MANUAL_TAKEOVER), reportController_1.resolveFailedRecord);
exports.default = router;
//# sourceMappingURL=index.js.map