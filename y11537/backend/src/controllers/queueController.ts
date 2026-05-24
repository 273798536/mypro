import { Response } from 'express';
import { CompensationQueue } from '../models';
import { QueueStatus, UserRole, AuditAction } from '../models/types';
import { AuthRequest } from '../middleware/auth';
import {
  manualTakeover,
  compensateAndClose,
  closeQueueItem,
  getQueueStats
} from '../services/compensationQueueService';
import { getAuditLogs } from '../services/auditService';
import { filterFieldsByRole } from '../config/permissions';
import { Op } from 'sequelize';

export async function getQueueList(req: AuthRequest, res: Response) {
  try {
    const user = req.user!;
    const {
      status,
      retryCategory,
      source,
      employeeId,
      trainingId,
      startDate,
      endDate,
      page = 1,
      pageSize = 20
    } = req.query;
    
    const where: any = {};
    
    if (status) where.status = status;
    if (retryCategory) where.retryCategory = retryCategory;
    if (source) where.source = source;
    if (employeeId) where.employeeId = employeeId;
    if (trainingId) where.trainingId = trainingId;
    if (startDate && endDate) {
      where.createdAt = {
        [Op.between]: [new Date(startDate as string), new Date(endDate as string)]
      };
    }
    
    const { count, rows } = await CompensationQueue.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(pageSize as string),
      offset: (parseInt(page as string) - 1) * parseInt(pageSize as string)
    });
    
    const filteredRows = rows.map(row => filterFieldsByRole(row.toJSON(), user.role));
    
    res.json({
      success: true,
      total: count,
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string),
      data: filteredRows
    });
  } catch (error: any) {
    console.error('获取队列列表错误:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

export async function getQueueDetail(req: AuthRequest, res: Response) {
  try {
    const user = req.user!;
    const { id } = req.params;
    
    const queueItem = await CompensationQueue.findByPk(id);
    if (!queueItem) {
      return res.status(404).json({
        success: false,
        error: '队列项不存在'
      });
    }
    
    const auditLogs = await getAuditLogs({ queueId: parseInt(id) });
    
    res.json({
      success: true,
      data: filterFieldsByRole(queueItem.toJSON(), user.role),
      auditLogs
    });
  } catch (error: any) {
    console.error('获取队列详情错误:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

export async function handleManualTakeover(req: AuthRequest, res: Response) {
  try {
    const user = req.user!;
    
    if (user.role !== UserRole.SUPERVISOR && user.role !== UserRole.REVIEWER) {
      return res.status(403).json({
        success: false,
        error: '只有主管或复核权限才能人工接管'
      });
    }
    
    const { id } = req.params;
    const { correctedData, handleRemark } = req.body;
    
    const result = await manualTakeover(parseInt(id), {
      correctedData,
      handleRemark,
      handledBy: user.id,
      handledByName: user.realName,
      handledByRole: user.role,
      ipAddress: req.ip
    });
    
    if (!result) {
      return res.status(404).json({
        success: false,
        error: '队列项不存在'
      });
    }
    
    res.json({
      success: true,
      data: filterFieldsByRole(result.toJSON(), user.role)
    });
  } catch (error: any) {
    console.error('人工接管错误:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

export async function handleCompensateAndClose(req: AuthRequest, res: Response) {
  try {
    const user = req.user!;
    
    if (user.role !== UserRole.SUPERVISOR) {
      return res.status(403).json({
        success: false,
        error: '只有主管权限才能补偿入账'
      });
    }
    
    const { id } = req.params;
    const { closeReason } = req.body;
    
    const result = await compensateAndClose(parseInt(id), {
      closeReason,
      closedBy: user.id,
      closedByName: user.realName,
      closedByRole: user.role,
      ipAddress: req.ip
    });
    
    if (!result) {
      return res.status(404).json({
        success: false,
        error: '队列项不存在'
      });
    }
    
    res.json({
      success: true,
      data: filterFieldsByRole(result.toJSON(), user.role)
    });
  } catch (error: any) {
    console.error('补偿入账错误:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

export async function handleCloseQueue(req: AuthRequest, res: Response) {
  try {
    const user = req.user!;
    
    if (user.role !== UserRole.SUPERVISOR) {
      return res.status(403).json({
        success: false,
        error: '只有主管权限才能关闭队列项'
      });
    }
    
    const { id } = req.params;
    const { closeReason } = req.body;
    
    const result = await closeQueueItem(parseInt(id), {
      closeReason,
      closedBy: user.id,
      closedByName: user.realName,
      closedByRole: user.role,
      ipAddress: req.ip
    });
    
    if (!result) {
      return res.status(404).json({
        success: false,
        error: '队列项不存在'
      });
    }
    
    res.json({
      success: true,
      data: filterFieldsByRole(result.toJSON(), user.role)
    });
  } catch (error: any) {
    console.error('关闭队列项错误:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

export async function handleRetry(req: AuthRequest, res: Response) {
  try {
    const user = req.user!;
    const { id } = req.params;
    
    const queueItem = await CompensationQueue.findByPk(id);
    if (!queueItem) {
      return res.status(404).json({
        success: false,
        error: '队列项不存在'
      });
    }
    
    if (queueItem.status === QueueStatus.SUCCESS || 
        queueItem.status === QueueStatus.COMPENSATED ||
        queueItem.status === QueueStatus.CLOSED) {
      return res.status(400).json({
        success: false,
        error: '该队列项已处理完成，无法重试'
      });
    }
    
    await queueItem.update({
      status: QueueStatus.PENDING,
      retryCount: 0,
      nextRetryTime: new Date()
    });
    
    const { signinQueue } = await import('../config/queue');
    await signinQueue.add(
      'process-signin',
      { queueId: queueItem.id },
      {
        jobId: `${queueItem.queueNo}-manual-retry`,
        delay: 0
      }
    );
    
    res.json({
      success: true,
      message: '已加入重试队列',
      data: filterFieldsByRole(queueItem.toJSON(), user.role)
    });
  } catch (error: any) {
    console.error('手动重试错误:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

export async function getQueueStatistics(req: AuthRequest, res: Response) {
  try {
    const stats = await getQueueStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('获取队列统计错误:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
