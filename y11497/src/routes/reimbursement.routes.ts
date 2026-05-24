import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';
import dataStore from '../database/store';
import { authenticate, requireRole, filterFields } from '../middleware/auth';
import { StateMachineService } from '../services/stateMachine.service';
import { RetryQueueService } from '../services/retryQueue.service';
import { DuplicateDetectionService } from '../services/duplicateDetection.service';
import { UserRole, ReimbursementStatus, MaterialSource, RetryCategory } from '../types';
import logger from '../utils/logger';

const router = Router();

const createReimbursementSchema = Joi.object({
  applicationNo: Joi.string().required(),
  applicantId: Joi.string().required(),
  applicantName: Joi.string().required(),
  department: Joi.string().required(),
  travelApplicationId: Joi.string().optional(),
  totalAmount: Joi.number().positive().required(),
  currency: Joi.string().default('CNY'),
  items: Joi.array().items(Joi.object({
    type: Joi.string().valid('accommodation', 'transportation', 'meal', 'other').required(),
    amount: Joi.number().positive().required(),
    currency: Joi.string().default('CNY'),
    date: Joi.string().isoDate().required(),
    description: Joi.string().required(),
    receiptNumber: Joi.string().optional(),
    relatedTravelId: Joi.string().optional()
  })).min(1).required()
});

const addMaterialSchema = Joi.object({
  source: Joi.string().valid(...Object.values(MaterialSource)).required(),
  sourceId: Joi.string().required(),
  fileName: Joi.string().optional(),
  fileUrl: Joi.string().optional(),
  parsedData: Joi.object().required()
});

router.use(authenticate);

router.post('/', requireRole(UserRole.DATA_ENTRY, UserRole.REVIEWER, UserRole.SUPERVISOR), async (req: Request, res: Response) => {
  try {
    const { error, value } = createReimbursementSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const itemsWithIds = value.items.map((item: any) => ({
      ...item,
      id: uuidv4()
    }));

    const reimbursement = dataStore.createReimbursement({
      ...value,
      items: itemsWithIds,
      status: ReimbursementStatus.SUBMITTED,
      submittedBy: req.user!.id
    });

    dataStore.addStatusLog(reimbursement.id, {
      reimbursementId: reimbursement.id,
      fromStatus: null,
      toStatus: ReimbursementStatus.SUBMITTED,
      operatorId: req.user!.id,
      operatorName: req.user!.name,
      reason: '创建并提交报销单'
    });

    logger.info(`报销单创建成功: ${reimbursement.id} by ${req.user!.name}`);

    res.status(201).json({
      success: true,
      data: filterFields(reimbursement, req.user!.role)
    });
  } catch (err) {
    logger.error('创建报销单失败', err);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, department, page = 1, pageSize = 20 } = req.query;
    
    const filters: any = {};
    if (status) filters.status = status as ReimbursementStatus;
    if (department) filters.department = department as string;

    const allReimbursements = dataStore.listReimbursements(filters);
    const start = (Number(page) - 1) * Number(pageSize);
    const paginatedItems = allReimbursements.slice(start, start + Number(pageSize));

    const filteredItems = paginatedItems.map(r => filterFields(r, req.user!.role));

    res.json({
      success: true,
      data: {
        items: filteredItems,
        total: allReimbursements.length,
        page: Number(page),
        pageSize: Number(pageSize)
      }
    });
  } catch (err) {
    logger.error('查询报销单失败', err);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const reimbursement = dataStore.getReimbursement(req.params.id);
    if (!reimbursement) {
      return res.status(404).json({
        success: false,
        error: '报销单不存在'
      });
    }

    res.json({
      success: true,
      data: filterFields(reimbursement, req.user!.role)
    });
  } catch (err) {
    logger.error('查询报销单详情失败', err);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

router.post('/:id/materials', requireRole(UserRole.DATA_ENTRY, UserRole.REVIEWER, UserRole.SUPERVISOR), async (req: Request, res: Response) => {
  try {
    const { error, value } = addMaterialSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const material = dataStore.addMaterial(req.params.id, {
      ...value,
      reimbursementId: req.params.id,
      uploadedBy: req.user!.id,
      verified: false
    });

    if (!material) {
      return res.status(404).json({
        success: false,
        error: '报销单不存在'
      });
    }

    logger.info(`材料上传成功: ${material.id} for reimbursement ${req.params.id}`);

    res.status(201).json({
      success: true,
      data: material
    });
  } catch (err) {
    logger.error('上传材料失败', err);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

router.post('/:id/queue', requireRole(UserRole.REVIEWER, UserRole.SUPERVISOR), async (req: Request, res: Response) => {
  try {
    const updated = StateMachineService.queue(req.params.id, req.user!);
    if (!updated) {
      return res.status(404).json({
        success: false,
        error: '报销单不存在'
      });
    }

    res.json({
      success: true,
      data: filterFields(updated, req.user!.role)
    });
  } catch (err: any) {
    logger.error('排入队列失败', err);
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

router.post('/:id/review', requireRole(UserRole.REVIEWER, UserRole.SUPERVISOR), async (req: Request, res: Response) => {
  try {
    const { reason } = req.body;
    const updated = StateMachineService.requestReview(req.params.id, req.user!, reason || '复核通过');
    if (!updated) {
      return res.status(404).json({
        success: false,
        error: '报销单不存在'
      });
    }

    res.json({
      success: true,
      data: filterFields(updated, req.user!.role)
    });
  } catch (err: any) {
    logger.error('提交复核失败', err);
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

router.post('/:id/manual', requireRole(UserRole.REVIEWER, UserRole.SUPERVISOR), async (req: Request, res: Response) => {
  try {
    const { reason } = req.body;
    const updated = StateMachineService.requestManualIntervention(req.params.id, req.user!, reason);
    if (!updated) {
      return res.status(404).json({
        success: false,
        error: '报销单不存在'
      });
    }

    res.json({
      success: true,
      data: filterFields(updated, req.user!.role)
    });
  } catch (err: any) {
    logger.error('请求人工干预失败', err);
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

router.post('/:id/compensate', requireRole(UserRole.SUPERVISOR), async (req: Request, res: Response) => {
  try {
    const { remarks } = req.body;
    const updated = StateMachineService.compensate(req.params.id, req.user!, remarks);
    if (!updated) {
      return res.status(404).json({
        success: false,
        error: '报销单不存在'
      });
    }

    res.json({
      success: true,
      data: filterFields(updated, req.user!.role)
    });
  } catch (err: any) {
    logger.error('补偿入账失败', err);
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

router.post('/:id/close', requireRole(UserRole.SUPERVISOR), async (req: Request, res: Response) => {
  try {
    const { reason } = req.body;
    const updated = StateMachineService.close(req.params.id, req.user!, reason || '正常关闭');
    if (!updated) {
      return res.status(404).json({
        success: false,
        error: '报销单不存在'
      });
    }

    res.json({
      success: true,
      data: filterFields(updated, req.user!.role)
    });
  } catch (err: any) {
    logger.error('关闭报销单失败', err);
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

router.post('/:id/retry', requireRole(UserRole.REVIEWER, UserRole.SUPERVISOR), async (req: Request, res: Response) => {
  try {
    const { category } = req.body;
    const retryCategory = category || RetryCategory.SYSTEM_ERROR;
    
    const queueItem = RetryQueueService.enqueueForRetry(
      req.params.id,
      retryCategory,
      req.user!
    );

    res.json({
      success: true,
      data: queueItem,
      message: '已加入重试队列'
    });
  } catch (err: any) {
    logger.error('加入重试队列失败', err);
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

router.post('/:id/detect-duplicates', requireRole(UserRole.REVIEWER, UserRole.SUPERVISOR), async (req: Request, res: Response) => {
  try {
    const result = DuplicateDetectionService.markDuplicates(req.params.id);
    
    res.json({
      success: true,
      data: result
    });
  } catch (err: any) {
    logger.error('重复检测失败', err);
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

router.post('/:id/items/:itemId/resolve-duplicate', requireRole(UserRole.REVIEWER, UserRole.SUPERVISOR), async (req: Request, res: Response) => {
  try {
    const { keepOriginal } = req.body;
    const result = DuplicateDetectionService.resolveDuplicate(
      req.params.id,
      req.params.itemId,
      keepOriginal,
      req.user!.id
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        error: '报销单或项目不存在'
      });
    }

    res.json({
      success: true,
      message: keepOriginal ? '已移除重复项' : '已标记为非重复'
    });
  } catch (err: any) {
    logger.error('解决重复项失败', err);
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

export default router;
