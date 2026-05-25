"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LedgerController = void 0;
const LedgerService_1 = require("../services/LedgerService");
const ChangeHistoryService_1 = require("../services/ChangeHistoryService");
const ExportService_1 = require("../services/ExportService");
const enums_1 = require("../types/enums");
const masking_1 = require("../utils/masking");
class LedgerController {
    constructor(dataSource) {
        this.dataSource = dataSource;
        this.createDraft = async (req, res) => {
            try {
                if (!req.user)
                    throw new Error('未认证');
                const ledger = await this.ledgerService.createDraft(req.body, req.user);
                res.status(201).json({
                    success: true,
                    data: ledger,
                });
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    error: error instanceof Error ? error.message : '创建失败',
                });
            }
        };
        this.updateDraft = async (req, res) => {
            try {
                if (!req.user)
                    throw new Error('未认证');
                const { id } = req.params;
                const ledger = await this.ledgerService.updateDraft(id, req.body, req.user);
                res.json({
                    success: true,
                    data: ledger,
                });
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    error: error instanceof Error ? error.message : '更新失败',
                });
            }
        };
        this.submit = async (req, res) => {
            try {
                if (!req.user)
                    throw new Error('未认证');
                const { id } = req.params;
                const ledger = await this.ledgerService.submit(id, req.body, req.user);
                res.json({
                    success: true,
                    data: ledger,
                });
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    error: error instanceof Error ? error.message : '提交失败',
                });
            }
        };
        this.reject = async (req, res) => {
            try {
                if (!req.user)
                    throw new Error('未认证');
                const { id } = req.params;
                const ledger = await this.ledgerService.reject(id, req.body, req.user);
                res.json({
                    success: true,
                    data: ledger,
                });
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    error: error instanceof Error ? error.message : '驳回失败',
                });
            }
        };
        this.confirm = async (req, res) => {
            try {
                if (!req.user)
                    throw new Error('未认证');
                const { id } = req.params;
                const ledger = await this.ledgerService.confirm(id, req.body, req.user);
                res.json({
                    success: true,
                    data: ledger,
                });
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    error: error instanceof Error ? error.message : '确认失败',
                });
            }
        };
        this.audit = async (req, res) => {
            try {
                if (!req.user)
                    throw new Error('未认证');
                const { id } = req.params;
                const ledger = await this.ledgerService.audit(id, req.body, req.user);
                res.json({
                    success: true,
                    data: ledger,
                });
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    error: error instanceof Error ? error.message : '审计失败',
                });
            }
        };
        this.getById = async (req, res) => {
            try {
                const { id } = req.params;
                const ledger = await this.ledgerService.getById(id, { includeRelations: true });
                if (!ledger) {
                    res.status(404).json({ success: false, error: '台账不存在' });
                    return;
                }
                const sensitiveLevel = this.getSensitiveLevelForUser(req.user?.role);
                const maskedLedger = (0, masking_1.applyMasking)(JSON.parse(JSON.stringify(ledger)), sensitiveLevel);
                res.json({
                    success: true,
                    data: maskedLedger,
                });
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    error: error instanceof Error ? error.message : '查询失败',
                });
            }
        };
        this.getByLedgerNo = async (req, res) => {
            try {
                const { ledgerNo } = req.params;
                const ledger = await this.ledgerService.getByLedgerNo(ledgerNo);
                if (!ledger) {
                    res.status(404).json({ success: false, error: '台账不存在' });
                    return;
                }
                const sensitiveLevel = this.getSensitiveLevelForUser(req.user?.role);
                const maskedLedger = (0, masking_1.applyMasking)(JSON.parse(JSON.stringify(ledger)), sensitiveLevel);
                res.json({
                    success: true,
                    data: maskedLedger,
                });
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    error: error instanceof Error ? error.message : '查询失败',
                });
            }
        };
        this.list = async (req, res) => {
            try {
                const { page, pageSize, status, engineerId, repairOrderId, dataQuality, startDate, endDate, } = req.query;
                const result = await this.ledgerService.list({
                    page: page ? parseInt(page, 10) : undefined,
                    pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
                    status: status,
                    engineerId: engineerId,
                    repairOrderId: repairOrderId,
                    dataQuality: dataQuality,
                    startDate: startDate ? new Date(startDate) : undefined,
                    endDate: endDate ? new Date(endDate) : undefined,
                });
                const sensitiveLevel = this.getSensitiveLevelForUser(req.user?.role);
                const maskedLedgers = result.ledgers.map((l) => (0, masking_1.applyMasking)(JSON.parse(JSON.stringify(l)), sensitiveLevel));
                res.json({
                    success: true,
                    data: {
                        ledgers: maskedLedgers,
                        total: result.total,
                        page: result.page,
                        pageSize: result.pageSize,
                    },
                });
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    error: error instanceof Error ? error.message : '查询失败',
                });
            }
        };
        this.getStatistics = async (req, res) => {
            try {
                const stats = await this.ledgerService.getStatistics();
                res.json({
                    success: true,
                    data: stats,
                });
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    error: error instanceof Error ? error.message : '查询失败',
                });
            }
        };
        this.getChangeHistory = async (req, res) => {
            try {
                const { id } = req.params;
                const { page, pageSize, action } = req.query;
                const result = await this.changeHistoryService.getLedgerHistories(id, {
                    page: page ? parseInt(page, 10) : undefined,
                    pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
                    action: action,
                });
                res.json({
                    success: true,
                    data: result,
                });
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    error: error instanceof Error ? error.message : '查询失败',
                });
            }
        };
        this.compareVersions = async (req, res) => {
            try {
                const { id } = req.params;
                const { version1, version2 } = req.query;
                const result = await this.changeHistoryService.compareVersions(id, parseInt(version1, 10), parseInt(version2, 10));
                res.json({
                    success: true,
                    data: result,
                });
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    error: error instanceof Error ? error.message : '对比失败',
                });
            }
        };
        this.exportLedger = async (req, res) => {
            try {
                if (!req.user)
                    throw new Error('未认证');
                const { id } = req.params;
                const { format = 'json', includeSensitive } = req.query;
                const result = await this.exportService.exportSingleLedger(id, {
                    format: format,
                    includeSensitive: includeSensitive === 'true',
                }, req.user);
                res.setHeader('Content-Type', result.contentType);
                res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
                res.send(result.data);
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    error: error instanceof Error ? error.message : '导出失败',
                });
            }
        };
        this.exportLedgers = async (req, res) => {
            try {
                if (!req.user)
                    throw new Error('未认证');
                const { format = 'json', includeSensitive, status, engineerId, dataQuality, startDate, endDate, includeHistory, includePartScans, includePhotos, includeExternalReceipts, } = req.query;
                const result = await this.exportService.exportLedgers({
                    format: format,
                    includeSensitive: includeSensitive === 'true',
                    filters: {
                        status: status,
                        engineerId: engineerId,
                        dataQuality: dataQuality,
                        startDate: startDate ? new Date(startDate) : undefined,
                        endDate: endDate ? new Date(endDate) : undefined,
                    },
                    includeHistory: includeHistory === 'true',
                    includePartScans: includePartScans === 'true',
                    includePhotos: includePhotos === 'true',
                    includeExternalReceipts: includeExternalReceipts === 'true',
                }, req.user);
                res.setHeader('Content-Type', result.contentType);
                res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
                res.send(result.data);
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    error: error instanceof Error ? error.message : '导出失败',
                });
            }
        };
        this.validate = async (req, res) => {
            try {
                const { id } = req.params;
                const result = await this.ledgerService.validateLedger(id);
                res.json({
                    success: true,
                    data: result,
                });
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    error: error instanceof Error ? error.message : '验证失败',
                });
            }
        };
        this.ledgerService = new LedgerService_1.LedgerService(dataSource);
        this.changeHistoryService = new ChangeHistoryService_1.ChangeHistoryService(dataSource);
        this.exportService = new ExportService_1.ExportService(dataSource);
    }
    getSensitiveLevelForUser(role) {
        switch (role) {
            case 'admin':
                return enums_1.SensitiveFieldLevel.NONE;
            case 'auditor':
            case 'service_manager':
                return enums_1.SensitiveFieldLevel.MASK;
            default:
                return enums_1.SensitiveFieldLevel.MASK;
        }
    }
}
exports.LedgerController = LedgerController;
//# sourceMappingURL=LedgerController.js.map