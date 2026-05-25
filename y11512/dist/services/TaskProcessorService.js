"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskProcessorService = void 0;
const RetryQueue_1 = require("../entities/RetryQueue");
const ReceiptService_1 = require("./ReceiptService");
const database_1 = require("../config/database");
const BorrowApplication_1 = require("../entities/BorrowApplication");
const ExpressOrder_1 = require("../entities/ExpressOrder");
const CompensationRecord_1 = require("../entities/CompensationRecord");
class TaskProcessorService {
    static async processTask(payloadType, payload, applicationId, operatorId, operatorName) {
        switch (payloadType) {
            case RetryQueue_1.PayloadType.BORROW_APPLICATION:
                return this.processBorrowApplication(payload, applicationId, operatorId, operatorName);
            case RetryQueue_1.PayloadType.EXPRESS_ORDER:
                return this.processExpressOrder(payload, applicationId, operatorId, operatorName);
            case RetryQueue_1.PayloadType.COMPENSATION_RECORD:
                return this.processCompensationRecord(payload, applicationId, operatorId, operatorName);
            case RetryQueue_1.PayloadType.FEE_CALCULATION:
                return this.processFeeCalculation(payload, applicationId, operatorId, operatorName);
            case RetryQueue_1.PayloadType.EXTERNAL_RECEIPT:
                return this.processExternalReceipt(payload, applicationId, operatorId, operatorName);
            default:
                return {
                    success: false,
                    action: 'failed',
                    error: `未知的任务类型: ${payloadType}`
                };
        }
    }
    static async processBorrowApplication(payload, applicationId, operatorId, operatorName) {
        const application = await this.applicationRepository.findOne({
            where: { id: applicationId }
        });
        if (!application) {
            return {
                success: false,
                action: 'failed',
                error: '借阅申请不存在'
            };
        }
        const action = payload.action || 'unknown';
        switch (action) {
            case 'create':
            case 'submit':
                return {
                    success: true,
                    action: 'confirmed',
                    details: {
                        applicationNo: application.applicationNo,
                        action: '借阅申请已确认'
                    }
                };
            case 'resubmit':
                return {
                    success: true,
                    action: 'confirmed',
                    details: {
                        applicationNo: application.applicationNo,
                        action: '重新提交已确认'
                    }
                };
            case 'withdraw':
                return {
                    success: true,
                    action: 'confirmed',
                    details: {
                        applicationNo: application.applicationNo,
                        action: '撤回已确认'
                    }
                };
            default:
                return {
                    success: true,
                    action: 'processed',
                    details: {
                        applicationNo: application.applicationNo,
                        action: '借阅申请任务已处理'
                    }
                };
        }
    }
    static async processExpressOrder(payload, applicationId, operatorId, operatorName) {
        const action = payload.action || 'create';
        if (action === 'create' && payload.expressNo) {
            const expressOrder = await this.expressRepository.findOne({
                where: { expressNo: payload.expressNo }
            });
            if (expressOrder) {
                return {
                    success: true,
                    action: 'confirmed',
                    details: {
                        expressNo: payload.expressNo,
                        fee: payload.fee,
                        message: '快递单创建已确认'
                    }
                };
            }
        }
        return {
            success: true,
            action: 'processed',
            details: {
                action,
                expressNo: payload.expressNo,
                message: '快递单任务已处理'
            }
        };
    }
    static async processCompensationRecord(payload, applicationId, operatorId, operatorName) {
        const action = payload.action || 'create';
        if (action === 'create' && payload.recordNo) {
            const record = await this.compensationRepository.findOne({
                where: { recordNo: payload.recordNo }
            });
            if (record) {
                return {
                    success: true,
                    action: 'confirmed',
                    details: {
                        recordNo: payload.recordNo,
                        type: payload.type,
                        amount: payload.amount,
                        message: '赔偿记录创建已确认'
                    }
                };
            }
        }
        return {
            success: true,
            action: 'processed',
            details: {
                action,
                recordNo: payload.recordNo,
                message: '赔偿记录任务已处理'
            }
        };
    }
    static async processFeeCalculation(payload, applicationId, operatorId, operatorName) {
        const action = payload.action || 'recalculate';
        if (action === 'recalculate') {
            const result = await ReceiptService_1.ReceiptService.calculateAndRecordFees(applicationId, operatorId || 'system', operatorName || '系统自动处理');
            return {
                success: result.success,
                action: result.action,
                details: result.details
            };
        }
        return {
            success: true,
            action: 'processed',
            details: {
                action,
                message: '费用计算任务已处理'
            }
        };
    }
    static async processExternalReceipt(payload, applicationId, operatorId, operatorName) {
        const result = await ReceiptService_1.ReceiptService.processReceiptPayload(applicationId, payload, operatorId, operatorName);
        return {
            success: result.success,
            action: result.action,
            details: result.details,
            error: result.error
        };
    }
    static async classifyError(error) {
        const message = error.message.toLowerCase();
        if (message.includes('network') || message.includes('timeout') || message.includes('connect')) {
            return {
                category: 'network_error',
                shouldRetry: true,
                retryDelay: 300
            };
        }
        if (message.includes('api') || message.includes('external') || message.includes('third-party')) {
            return {
                category: 'external_api_error',
                shouldRetry: true,
                retryDelay: 600
            };
        }
        if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
            return {
                category: 'data_validation_error',
                shouldRetry: false,
                retryDelay: 0
            };
        }
        if (message.includes('business') || message.includes('rule') || message.includes('duplicate')) {
            return {
                category: 'business_rule_error',
                shouldRetry: false,
                retryDelay: 0
            };
        }
        if (message.includes('database') || message.includes('system') || message.includes('internal')) {
            return {
                category: 'system_error',
                shouldRetry: true,
                retryDelay: 600
            };
        }
        return {
            category: 'unknown_error',
            shouldRetry: true,
            retryDelay: 600
        };
    }
}
exports.TaskProcessorService = TaskProcessorService;
TaskProcessorService.applicationRepository = database_1.AppDataSource.getRepository(BorrowApplication_1.BorrowApplication);
TaskProcessorService.expressRepository = database_1.AppDataSource.getRepository(ExpressOrder_1.ExpressOrder);
TaskProcessorService.compensationRepository = database_1.AppDataSource.getRepository(CompensationRecord_1.CompensationRecord);
