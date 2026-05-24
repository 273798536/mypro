import { CompensationQueue, SigninRecord } from '../models';
import { QueueStatus, RetryCategory, DataSource, SigninType, AuditAction } from '../models/types';
import { signinQueue } from '../config/queue';
import { createAuditLog } from './auditService';
import { createFailedRecord, classifyError } from './failedRecordService';
import { Op } from 'sequelize';

interface AddToQueueParams {
  source: DataSource;
  sourceRecordId?: number;
  sourceRecordNo?: string;
  signinType: SigninType;
  employeeId: string;
  employeeName: string;
  department: string;
  trainingId: string;
  trainingName: string;
  trainingDate: Date;
  signinTime?: Date;
  retryCategory: RetryCategory;
  errorMessage?: string;
  errorStack?: string;
  originalData?: any;
  isProxy?: boolean;
  proxyEmployeeId?: string;
  proxyEmployeeName?: string;
  maxRetryCount?: number;
  createdBy?: number;
  operatorName?: string;
  operatorRole?: string;
  ipAddress?: string;
}

export async function addToCompensationQueue(params: AddToQueueParams): Promise<CompensationQueue> {
  const queueNo = `QUE-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  
  const queueItem = await CompensationQueue.create({
    queueNo,
    source: params.source,
    sourceRecordId: params.sourceRecordId,
    sourceRecordNo: params.sourceRecordNo,
    signinType: params.signinType,
    employeeId: params.employeeId,
    employeeName: params.employeeName,
    department: params.department,
    trainingId: params.trainingId,
    trainingName: params.trainingName,
    trainingDate: params.trainingDate,
    signinTime: params.signinTime,
    status: QueueStatus.PENDING,
    retryCategory: params.retryCategory,
    retryCount: 0,
    maxRetryCount: params.maxRetryCount || parseInt(process.env.MAX_RETRY_ATTEMPTS || '5'),
    errorMessage: params.errorMessage,
    errorStack: params.errorStack,
    originalData: params.originalData,
    isProxy: params.isProxy || false,
    proxyEmployeeId: params.proxyEmployeeId,
    proxyEmployeeName: params.proxyEmployeeName,
    createdBy: params.createdBy
  });
  
  await createAuditLog({
    action: AuditAction.QUEUE,
    source: params.source,
    recordType: 'compensation_queue',
    queueId: queueItem.id,
    queueNo: queueItem.queueNo,
    newStatus: QueueStatus.PENDING,
    retryCategory: params.retryCategory,
    afterData: queueItem.toJSON(),
    changeReason: '加入补偿队列',
    operatorId: params.createdBy,
    operatorName: params.operatorName,
    operatorRole: params.operatorRole,
    ipAddress: params.ipAddress
  });
  
  await signinQueue.add(
    'process-signin',
    { queueId: queueItem.id },
    {
      jobId: queueItem.queueNo,
      delay: params.retryCategory === RetryCategory.NETWORK_ERROR ? 60000 : 300000
    }
  );
  
  return queueItem;
}

export async function processQueueItem(queueId: number): Promise<void> {
  const queueItem = await CompensationQueue.findByPk(queueId);
  if (!queueItem) {
    throw new Error(`队列项 ${queueId} 不存在`);
  }
  
  if (queueItem.status === QueueStatus.SUCCESS || 
      queueItem.status === QueueStatus.COMPENSATED ||
      queueItem.status === QueueStatus.CLOSED) {
    return;
  }
  
  const oldStatus = queueItem.status;
  
  try {
    await queueItem.update({
      status: QueueStatus.PROCESSING,
      lastRetryTime: new Date(),
      retryCount: queueItem.retryCount + 1
    });
    
    const existingSignin = await SigninRecord.findOne({
      where: {
        employeeId: queueItem.employeeId,
        trainingId: queueItem.trainingId,
        trainingDate: queueItem.trainingDate
      }
    });
    
    if (existingSignin) {
      throw new Error(`该员工在本次培训中已有签到记录，可能存在重复签到`);
    }
    
    const signinNo = `SIG-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    
    const signinRecord = await SigninRecord.create({
      signinNo,
      employeeId: queueItem.employeeId,
      employeeName: queueItem.employeeName,
      department: queueItem.department,
      trainingId: queueItem.trainingId,
      trainingName: queueItem.trainingName,
      trainingDate: queueItem.trainingDate,
      signinTime: queueItem.signinTime || new Date(),
      signinType: queueItem.retryCount > 0 ? SigninType.RETRY : queueItem.signinType,
      source: queueItem.source,
      qrcodeId: queueItem.originalData?.qrcodeId,
      location: queueItem.originalData?.location,
      latitude: queueItem.originalData?.latitude,
      longitude: queueItem.originalData?.longitude,
      isProxy: queueItem.isProxy,
      proxyEmployeeId: queueItem.proxyEmployeeId,
      proxyEmployeeName: queueItem.proxyEmployeeName,
      isCompensated: queueItem.status === QueueStatus.MANUAL_REVIEW,
      compensationSource: queueItem.status === QueueStatus.MANUAL_REVIEW ? 'manual_review' : undefined,
      isValid: true
    });
    
    await queueItem.update({
      status: QueueStatus.SUCCESS,
      compensatedRecordId: signinRecord.id,
      correctedData: signinRecord.toJSON()
    });
    
    await createAuditLog({
      action: AuditAction.COMPENSATE,
      source: queueItem.source,
      recordType: 'signin_record',
      recordId: signinRecord.id,
      recordNo: signinRecord.signinNo,
      queueId: queueItem.id,
      queueNo: queueItem.queueNo,
      oldStatus,
      newStatus: QueueStatus.SUCCESS,
      retryCategory: queueItem.retryCategory,
      beforeData: { oldStatus },
      afterData: signinRecord.toJSON(),
      changeReason: '签到补偿成功'
    });
    
  } catch (error: any) {
    const retryCategory = classifyError(error);
    
    if (queueItem.retryCount >= queueItem.maxRetryCount) {
      await queueItem.update({
        status: QueueStatus.DEAD_LETTER,
        errorMessage: error.message,
        errorStack: error.stack
      });
      
      await createFailedRecord({
        source: queueItem.source,
        recordType: 'compensation_queue',
        queueId: queueItem.id,
        queueNo: queueItem.queueNo,
        retryCategory,
        errorMessage: error.message,
        errorDetail: error.stack,
        originalData: queueItem.originalData,
        affectedReportFields: ['signinCount', 'attendanceRate'],
        createdBy: queueItem.createdBy
      });
      
      await createAuditLog({
        action: AuditAction.CLOSE,
        source: queueItem.source,
        recordType: 'compensation_queue',
        queueId: queueItem.id,
        queueNo: queueItem.queueNo,
        oldStatus,
        newStatus: QueueStatus.DEAD_LETTER,
        retryCategory,
        afterData: queueItem.toJSON(),
        changeReason: `重试${queueItem.maxRetryCount}次失败，进入死信队列`
      });
      
    } else {
      const nextRetryDelay = Math.pow(2, queueItem.retryCount) * 300000;
      const nextRetryTime = new Date(Date.now() + nextRetryDelay);
      
      await queueItem.update({
        status: QueueStatus.RETRYING,
        retryCategory,
        errorMessage: error.message,
        errorStack: error.stack,
        nextRetryTime
      });
      
      await signinQueue.add(
        'process-signin',
        { queueId: queueItem.id },
        {
          jobId: `${queueItem.queueNo}-retry-${queueItem.retryCount}`,
          delay: nextRetryDelay
        }
      );
      
      await createAuditLog({
        action: AuditAction.RETRY,
        source: queueItem.source,
        recordType: 'compensation_queue',
        queueId: queueItem.id,
        queueNo: queueItem.queueNo,
        oldStatus,
        newStatus: QueueStatus.RETRYING,
        retryCategory,
        afterData: queueItem.toJSON(),
        changeReason: `第${queueItem.retryCount}次重试失败，下次重试时间: ${nextRetryTime.toISOString()}`
      });
    }
    
    throw error;
  }
}

export async function manualTakeover(
  queueId: number,
  params: {
    correctedData?: any;
    handleRemark: string;
    handledBy: number;
    handledByName: string;
    handledByRole: string;
    ipAddress?: string;
  }
): Promise<CompensationQueue | null> {
  const queueItem = await CompensationQueue.findByPk(queueId);
  if (!queueItem) return null;
  
  const oldStatus = queueItem.status;
  
  await queueItem.update({
    status: QueueStatus.MANUAL_REVIEW,
    correctedData: params.correctedData,
    handledBy: params.handledBy,
    handledAt: new Date(),
    handleRemark: params.handleRemark
  });
  
  await createAuditLog({
    action: AuditAction.MANUAL_TAKEOVER,
    source: queueItem.source,
    recordType: 'compensation_queue',
    queueId: queueItem.id,
    queueNo: queueItem.queueNo,
    oldStatus,
    newStatus: QueueStatus.MANUAL_REVIEW,
    retryCategory: queueItem.retryCategory,
    beforeData: { oldStatus },
    afterData: queueItem.toJSON(),
    changeReason: params.handleRemark,
    operatorId: params.handledBy,
    operatorName: params.handledByName,
    operatorRole: params.handledByRole,
    ipAddress: params.ipAddress
  });
  
  return queueItem;
}

export async function compensateAndClose(
  queueId: number,
  params: {
    closeReason: string;
    closedBy: number;
    closedByName: string;
    closedByRole: string;
    ipAddress?: string;
  }
): Promise<CompensationQueue | null> {
  const queueItem = await CompensationQueue.findByPk(queueId);
  if (!queueItem) return null;
  
  if (queueItem.status !== QueueStatus.MANUAL_REVIEW) {
    throw new Error('只有人工审核状态的队列项才能补偿入账');
  }
  
  const oldStatus = queueItem.status;
  
  const signinNo = `SIG-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  
  const data = queueItem.correctedData || queueItem.originalData || {};
  
  const signinRecord = await SigninRecord.create({
    signinNo,
    employeeId: queueItem.employeeId,
    employeeName: queueItem.employeeName,
    department: queueItem.department,
    trainingId: queueItem.trainingId,
    trainingName: queueItem.trainingName,
    trainingDate: queueItem.trainingDate,
    signinTime: queueItem.signinTime || data.signinTime || new Date(),
    signinType: SigninType.COMPENSATION,
    source: queueItem.source,
    qrcodeId: data.qrcodeId,
    location: data.location,
    latitude: data.latitude,
    longitude: data.longitude,
    isProxy: queueItem.isProxy,
    proxyEmployeeId: queueItem.proxyEmployeeId,
    proxyEmployeeName: queueItem.proxyEmployeeName,
    isCompensated: true,
    compensationSource: 'manual_compensation',
    isValid: true
  });
  
  await queueItem.update({
    status: QueueStatus.COMPENSATED,
    compensatedRecordId: signinRecord.id,
    closedBy: params.closedBy,
    closedAt: new Date(),
    closeReason: params.closeReason
  });
  
  await createAuditLog({
    action: AuditAction.COMPENSATE,
    source: queueItem.source,
    recordType: 'signin_record',
    recordId: signinRecord.id,
    recordNo: signinRecord.signinNo,
    queueId: queueItem.id,
    queueNo: queueItem.queueNo,
    oldStatus,
    newStatus: QueueStatus.COMPENSATED,
    retryCategory: queueItem.retryCategory,
    beforeData: { oldStatus },
    afterData: signinRecord.toJSON(),
    changeReason: params.closeReason,
    operatorId: params.closedBy,
    operatorName: params.closedByName,
    operatorRole: params.closedByRole,
    ipAddress: params.ipAddress
  });
  
  return queueItem;
}

export async function closeQueueItem(
  queueId: number,
  params: {
    closeReason: string;
    closedBy: number;
    closedByName: string;
    closedByRole: string;
    ipAddress?: string;
  }
): Promise<CompensationQueue | null> {
  const queueItem = await CompensationQueue.findByPk(queueId);
  if (!queueItem) return null;
  
  const oldStatus = queueItem.status;
  
  await queueItem.update({
    status: QueueStatus.CLOSED,
    closedBy: params.closedBy,
    closedAt: new Date(),
    closeReason: params.closeReason
  });
  
  await createAuditLog({
    action: AuditAction.CLOSE,
    source: queueItem.source,
    recordType: 'compensation_queue',
    queueId: queueItem.id,
    queueNo: queueItem.queueNo,
    oldStatus,
    newStatus: QueueStatus.CLOSED,
    retryCategory: queueItem.retryCategory,
    beforeData: { oldStatus },
    afterData: queueItem.toJSON(),
    changeReason: params.closeReason,
    operatorId: params.closedBy,
    operatorName: params.closedByName,
    operatorRole: params.closedByRole,
    ipAddress: params.ipAddress
  });
  
  return queueItem;
}

export async function getQueueStats() {
  const [pending, processing, retrying, success, failed, deadLetter, manualReview, compensated, closed] = await Promise.all([
    CompensationQueue.count({ where: { status: QueueStatus.PENDING } }),
    CompensationQueue.count({ where: { status: QueueStatus.PROCESSING } }),
    CompensationQueue.count({ where: { status: QueueStatus.RETRYING } }),
    CompensationQueue.count({ where: { status: QueueStatus.SUCCESS } }),
    CompensationQueue.count({ where: { status: QueueStatus.FAILED } }),
    CompensationQueue.count({ where: { status: QueueStatus.DEAD_LETTER } }),
    CompensationQueue.count({ where: { status: QueueStatus.MANUAL_REVIEW } }),
    CompensationQueue.count({ where: { status: QueueStatus.COMPENSATED } }),
    CompensationQueue.count({ where: { status: QueueStatus.CLOSED } })
  ]);
  
  const categoryStats = await CompensationQueue.findAll({
    attributes: ['retryCategory', [CompensationQueue.sequelize!.fn('COUNT', CompensationQueue.sequelize!.col('id')), 'count']],
    group: ['retryCategory'],
    where: {
      status: {
        [Op.in]: [QueueStatus.PENDING, QueueStatus.RETRYING, QueueStatus.DEAD_LETTER, QueueStatus.MANUAL_REVIEW]
      }
    }
  });
  
  return {
    byStatus: {
      pending,
      processing,
      retrying,
      success,
      failed,
      deadLetter,
      manualReview,
      compensated,
      closed
    },
    byCategory: categoryStats.map((item: any) => ({
      category: item.retryCategory,
      count: parseInt(item.getDataValue('count'))
    })),
    totalAwaiting: pending + processing + retrying + manualReview
  };
}
