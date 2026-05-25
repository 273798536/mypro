import { PayloadType } from '../entities/RetryQueue';
import { ReceiptService } from './ReceiptService';
import { FeeCalculationService } from './FeeCalculationService';
import { AppDataSource } from '../config/database';
import { BorrowApplication } from '../entities/BorrowApplication';
import { ExpressOrder } from '../entities/ExpressOrder';
import { CompensationRecord } from '../entities/CompensationRecord';

export interface TaskProcessResult {
  success: boolean;
  action: string;
  details?: any;
  error?: string;
}

export class TaskProcessorService {
  private static applicationRepository = AppDataSource.getRepository(BorrowApplication);
  private static expressRepository = AppDataSource.getRepository(ExpressOrder);
  private static compensationRepository = AppDataSource.getRepository(CompensationRecord);

  static async processTask(
    payloadType: PayloadType,
    payload: any,
    applicationId: string,
    operatorId?: string,
    operatorName?: string
  ): Promise<TaskProcessResult> {
    switch (payloadType) {
      case PayloadType.BORROW_APPLICATION:
        return this.processBorrowApplication(payload, applicationId, operatorId, operatorName);
      case PayloadType.EXPRESS_ORDER:
        return this.processExpressOrder(payload, applicationId, operatorId, operatorName);
      case PayloadType.COMPENSATION_RECORD:
        return this.processCompensationRecord(payload, applicationId, operatorId, operatorName);
      case PayloadType.FEE_CALCULATION:
        return this.processFeeCalculation(payload, applicationId, operatorId, operatorName);
      case PayloadType.EXTERNAL_RECEIPT:
        return this.processExternalReceipt(payload, applicationId, operatorId, operatorName);
      default:
        return {
          success: false,
          action: 'failed',
          error: `未知的任务类型: ${payloadType}`
        };
    }
  }

  private static async processBorrowApplication(
    payload: any,
    applicationId: string,
    operatorId?: string,
    operatorName?: string
  ): Promise<TaskProcessResult> {
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

  private static async processExpressOrder(
    payload: any,
    applicationId: string,
    operatorId?: string,
    operatorName?: string
  ): Promise<TaskProcessResult> {
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

  private static async processCompensationRecord(
    payload: any,
    applicationId: string,
    operatorId?: string,
    operatorName?: string
  ): Promise<TaskProcessResult> {
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

  private static async processFeeCalculation(
    payload: any,
    applicationId: string,
    operatorId?: string,
    operatorName?: string
  ): Promise<TaskProcessResult> {
    const action = payload.action || 'recalculate';

    if (action === 'recalculate') {
      const result = await ReceiptService.calculateAndRecordFees(
        applicationId,
        operatorId || 'system',
        operatorName || '系统自动处理'
      );

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

  private static async processExternalReceipt(
    payload: any,
    applicationId: string,
    operatorId?: string,
    operatorName?: string
  ): Promise<TaskProcessResult> {
    const result = await ReceiptService.processReceiptPayload(
      applicationId,
      payload,
      operatorId,
      operatorName
    );

    return {
      success: result.success,
      action: result.action,
      details: result.details,
      error: result.error
    };
  }

  static async classifyError(error: Error): Promise<{
    category: string;
    shouldRetry: boolean;
    retryDelay: number;
  }> {
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
