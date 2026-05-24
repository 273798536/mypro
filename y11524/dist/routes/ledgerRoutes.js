"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
const dayjs_1 = __importDefault(require("dayjs"));
const schemas_1 = require("../validation/schemas");
const ledgerService_1 = require("../services/ledgerService");
const exportService_1 = require("../services/exportService");
const types_1 = require("../types");
const connection_1 = require("../database/connection");
const router = (0, express_1.Router)();
function now() {
    return (0, dayjs_1.default)().format('YYYY-MM-DD HH:mm:ss');
}
function recordValidationFailure(dataSource, rawData, errorMessage, appointmentNo, batchNo) {
    const db = (0, connection_1.getDatabase)();
    const stmt = db.prepare(`
    INSERT INTO failed_records (id, data_source, raw_data, error_message, appointment_no, batch_no, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
    stmt.run((0, uuid_1.v4)(), dataSource, rawData, errorMessage, appointmentNo, batchNo, now());
}
function validateRequest(schema, data, dataSource) {
    const result = schema.safeParse(data);
    if (!result.success) {
        const errorMessages = result.error.issues.map((issue) => issue.message).join(', ');
        if (dataSource) {
            recordValidationFailure(dataSource, JSON.stringify(data), errorMessages, data.appointmentNo, data.batchNo);
        }
        throw new Error(errorMessages);
    }
    return result.data;
}
router.post('/import/appointment', async (req, res) => {
    try {
        const input = validateRequest(schemas_1.appointmentOrderSchema, req.body, types_1.DataSource.APPOINTMENT);
        const result = (0, ledgerService_1.importAppointmentOrder)(input);
        res.json({
            success: true,
            created: result.created,
            data: {
                ledgerId: result.data.ledger.id,
                status: result.data.ledger.status,
            },
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : '未知错误',
        });
    }
});
router.post('/import/technician-location', async (req, res) => {
    try {
        const input = validateRequest(schemas_1.technicianLocationSchema, req.body, types_1.DataSource.TECHNICIAN_LOCATION);
        const result = (0, ledgerService_1.importTechnicianLocation)(input);
        res.json({
            success: true,
            created: result.created,
            data: result.data,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : '未知错误',
        });
    }
});
router.post('/import/user-review', async (req, res) => {
    try {
        const input = validateRequest(schemas_1.userReviewSchema, req.body, types_1.DataSource.USER_REVIEW);
        const result = (0, ledgerService_1.importUserReview)(input);
        res.json({
            success: true,
            created: result.created,
            data: result.data,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : '未知错误',
        });
    }
});
router.post('/import/second-confirmation', async (req, res) => {
    try {
        const input = validateRequest(schemas_1.secondConfirmationSchema, req.body, types_1.DataSource.SECOND_CONFIRMATION);
        const result = (0, ledgerService_1.importSecondConfirmation)(input);
        res.json({
            success: true,
            created: result.created,
            data: result.data,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : '未知错误',
        });
    }
});
router.post('/status/change', async (req, res) => {
    try {
        const input = validateRequest(schemas_1.statusChangeSchema, req.body);
        const result = (0, ledgerService_1.changeLedgerStatus)(input);
        res.json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : '未知错误',
        });
    }
});
router.get('/list', async (req, res) => {
    try {
        const { status, area, page, pageSize, role } = req.query;
        const result = (0, ledgerService_1.getLedgerList)({
            status: status,
            area: area,
            page: page ? parseInt(page) : undefined,
            pageSize: pageSize ? parseInt(pageSize) : undefined,
            role: role,
        });
        res.json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : '未知错误',
        });
    }
});
router.get('/detail/:id', async (req, res) => {
    try {
        const { role } = req.query;
        const detail = (0, ledgerService_1.getLedgerDetail)(req.params.id, role);
        res.json({
            success: true,
            data: detail,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : '未知错误',
        });
    }
});
router.get('/failed-records', async (req, res) => {
    try {
        const { dataSource, page, pageSize } = req.query;
        const result = (0, ledgerService_1.getFailedRecords)({
            dataSource: dataSource,
            page: page ? parseInt(page) : undefined,
            pageSize: pageSize ? parseInt(pageSize) : undefined,
        });
        res.json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : '未知错误',
        });
    }
});
router.get('/statistics', async (req, res) => {
    try {
        const { area, role } = req.query;
        const result = (0, exportService_1.getStatistics)({
            area: area,
            role: role || types_1.RoleType.AREA_MANAGER,
        });
        res.json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : '未知错误',
        });
    }
});
router.post('/export', async (req, res) => {
    try {
        const { status, area, role, exportType } = req.body;
        const filepath = await (0, exportService_1.exportToCSV)({
            status: status,
            area: area,
            role: role,
            exportType: exportType,
        });
        res.json({
            success: true,
            data: {
                filepath,
                filename: filepath.split('/').pop(),
            },
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : '未知错误',
        });
    }
});
router.post('/export/:id', async (req, res) => {
    try {
        const { role } = req.body;
        const filepath = await (0, exportService_1.exportDetailToCSV)(req.params.id, role);
        res.json({
            success: true,
            data: {
                filepath,
                filename: filepath.split('/').pop(),
            },
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : '未知错误',
        });
    }
});
router.get('/health', (req, res) => {
    res.json({ success: true, message: 'API is running' });
});
exports.default = router;
//# sourceMappingURL=ledgerRoutes.js.map