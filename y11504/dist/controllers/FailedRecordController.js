"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FailedRecordController = void 0;
const FailedRecordService_1 = require("../services/FailedRecordService");
class FailedRecordController {
    constructor(dataSource) {
        this.dataSource = dataSource;
        this.create = async (req, res) => {
            try {
                const record = await this.failedRecordService.create(req.body, req.user);
                res.status(201).json({
                    success: true,
                    data: record,
                });
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    error: error instanceof Error ? error.message : '创建失败',
                });
            }
        };
        this.getById = async (req, res) => {
            try {
                const { id } = req.params;
                const record = await this.failedRecordService.getById(id);
                if (!record) {
                    res.status(404).json({ success: false, error: '记录不存在' });
                    return;
                }
                res.json({
                    success: true,
                    data: record,
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
                const { page, pageSize, recordType, sourceSystem, batchId, isResolved, startDate, endDate, } = req.query;
                const result = await this.failedRecordService.list({
                    page: page ? parseInt(page, 10) : undefined,
                    pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
                    recordType: recordType,
                    sourceSystem: sourceSystem,
                    batchId: batchId,
                    isResolved: isResolved !== undefined ? isResolved === 'true' : undefined,
                    startDate: startDate ? new Date(startDate) : undefined,
                    endDate: endDate ? new Date(endDate) : undefined,
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
        this.markResolved = async (req, res) => {
            try {
                if (!req.user)
                    throw new Error('未认证');
                const { id } = req.params;
                const { notes } = req.body;
                const record = await this.failedRecordService.markResolved(id, req.user, notes);
                if (!record) {
                    res.status(404).json({ success: false, error: '记录不存在' });
                    return;
                }
                res.json({
                    success: true,
                    data: record,
                });
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    error: error instanceof Error ? error.message : '操作失败',
                });
            }
        };
        this.retry = async (req, res) => {
            try {
                const { id } = req.params;
                const result = await this.failedRecordService.retry(id, async () => {
                    return true;
                });
                if (!result.record) {
                    res.status(404).json({ success: false, error: '记录不存在' });
                    return;
                }
                res.json({
                    success: true,
                    data: result,
                });
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    error: error instanceof Error ? error.message : '重试失败',
                });
            }
        };
        this.getStatistics = async (req, res) => {
            try {
                const stats = await this.failedRecordService.getStatistics();
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
        this.failedRecordService = new FailedRecordService_1.FailedRecordService(dataSource);
    }
}
exports.FailedRecordController = FailedRecordController;
//# sourceMappingURL=FailedRecordController.js.map