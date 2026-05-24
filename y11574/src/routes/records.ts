import { Router, Request, Response } from 'express';
import { liabilityRecordModel } from '../models/liabilityRecord';
import { historyRecordModel } from '../models/historyRecord';
import { dirtyRecordLogModel } from '../models/dirtyRecordLog';
import { liabilityService } from '../services/liabilityService';
import { filterFieldsByRole, filterListByRole, requirePermission } from '../middleware/auth';
import { WorkflowStatus, DuplicateStrategy, DataSource } from '../types';
import { generateIdempotencyKey } from '../utils/idempotency';

const router = Router();

router.get(
  '/',
  requirePermission('view_list'),
  async (req: Request, res: Response) => {
    const user = req.user!;
    const {
      status,
      startDate,
      endDate,
      department,
      agentId,
      isDirty,
      limit = '50',
      offset = '0'
    } = req.query;

    const records = await liabilityRecordModel.list({
      status: status as WorkflowStatus | undefined,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      department: department as string | undefined,
      agentId: agentId as string | undefined,
      isDirty: isDirty !== undefined ? isDirty === 'true' : undefined,
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10)
    });

    const filteredRecords = filterListByRole(records, user.role);
    
    res.json({
      success: true,
      data: filteredRecords,
      total: records.length
    });
  }
);

router.get(
  '/:id',
  requirePermission('view_detail'),
  async (req: Request, res: Response) => {
    const user = req.user!;
    const record = await liabilityRecordModel.findById(req.params.id);
    
    if (!record) {
      return res.status(404).json({ success: false, error: 'Record not found' });
    }

    const filteredRecord = filterFieldsByRole(record, user.role);
    
    res.json({
      success: true,
      data: filteredRecord
    });
  }
);

router.get(
  '/:id/history',
  requirePermission('view_history'),
  async (req: Request, res: Response) => {
    const history = await historyRecordModel.findByRecordId(req.params.id);
    
    res.json({
      success: true,
      data: history
    });
  }
);

router.get(
  '/:id/dirty-logs',
  requirePermission('view_detail'),
  async (req: Request, res: Response) => {
    const dirtyLogs = await dirtyRecordLogModel.findByRecordId(req.params.id);
    
    res.json({
      success: true,
      data: dirtyLogs
    });
  }
);

router.post(
  '/',
  requirePermission('create_draft'),
  async (req: Request, res: Response) => {
    const user = req.user!;
    const {
      ticketId,
      ticketNumber,
      customerName,
      customerPhone,
      agentName,
      agentId,
      department,
      slaBreachType,
      slaBreachDuration,
      compensationAmount,
      compensationType,
      escalationLevel,
      transferCount,
      responsibleParty,
      liabilityReason,
      dataSources,
      sourceSessionSummaryId,
      sourceSlaRuleId,
      sourceCompensationApprovalId,
      sourceSupplierStatementId,
      sourceApprovalEmailId,
      occurrenceDate,
      idempotencyKey,
      duplicateStrategy,
      changeReason
    } = req.body;

    const finalIdempotencyKey = idempotencyKey || generateIdempotencyKey(
      ticketId,
      dataSources || [],
      {
        sessionSummaryId: sourceSessionSummaryId,
        slaRuleId: sourceSlaRuleId,
        compensationApprovalId: sourceCompensationApprovalId,
        supplierStatementId: sourceSupplierStatementId,
        approvalEmailId: sourceApprovalEmailId
      }
    );

    try {
      const result = await liabilityService.createRecord(
        {
          ticketId,
          ticketNumber,
          customerName,
          customerPhone,
          agentName,
          agentId,
          department,
          slaBreachType,
          slaBreachDuration,
          compensationAmount,
          compensationType,
          escalationLevel,
          transferCount,
          responsibleParty,
          liabilityReason,
          dataSources: dataSources || [DataSource.SESSION_SUMMARY],
          sourceSessionSummaryId,
          sourceSlaRuleId,
          sourceCompensationApprovalId,
          sourceSupplierStatementId,
          sourceApprovalEmailId,
          occurrenceDate: occurrenceDate || new Date().toISOString().split('T')[0],
          idempotencyKey: finalIdempotencyKey,
          duplicateStrategy: duplicateStrategy as DuplicateStrategy | undefined,
          changeReason
        },
        user,
        req.ip
      );

      const filteredRecord = filterFieldsByRole(result.record, user.role);

      res.json({
        success: true,
        data: filteredRecord,
        isDuplicate: result.isDuplicate,
        duplicateStrategy: result.duplicateStrategy,
        idempotencyKey: finalIdempotencyKey
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }
);

router.put(
  '/:id',
  requirePermission('update_draft'),
  async (req: Request, res: Response) => {
    const user = req.user!;
    const { changeReason, ...updates } = req.body;

    const existing = await liabilityRecordModel.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Record not found' });
    }

    if (existing.status !== WorkflowStatus.DRAFT && existing.status !== WorkflowStatus.REJECTED) {
      return res.status(400).json({ 
        success: false, 
        error: 'Only draft or rejected records can be updated' 
      });
    }

    const updated = await liabilityService.updateRecord(
      req.params.id,
      updates,
      user,
      changeReason || '更新记录',
      req.ip
    );

    const filteredRecord = filterFieldsByRole(updated!, user.role);

    res.json({
      success: true,
      data: filteredRecord
    });
  }
);

router.post(
  '/:id/submit',
  requirePermission('submit'),
  async (req: Request, res: Response) => {
    const user = req.user!;

    try {
      const updated = await liabilityService.submitRecord(req.params.id, user, req.ip);
      
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Record not found' });
      }

      const filteredRecord = filterFieldsByRole(updated, user.role);

      res.json({
        success: true,
        data: filteredRecord
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }
);

router.post(
  '/:id/approve',
  requirePermission('approve'),
  async (req: Request, res: Response) => {
    const user = req.user!;
    const { requestSecondConfirmation } = req.body;

    try {
      const updated = await liabilityService.approveRecord(
        req.params.id,
        user,
        requestSecondConfirmation,
        req.ip
      );
      
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Record not found' });
      }

      const filteredRecord = filterFieldsByRole(updated, user.role);

      res.json({
        success: true,
        data: filteredRecord
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }
);

router.post(
  '/:id/reject',
  requirePermission('reject'),
  async (req: Request, res: Response) => {
    const user = req.user!;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ success: false, error: 'Rejection reason is required' });
    }

    try {
      const updated = await liabilityService.rejectRecord(req.params.id, user, reason, req.ip);
      
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Record not found' });
      }

      const filteredRecord = filterFieldsByRole(updated, user.role);

      res.json({
        success: true,
        data: filteredRecord
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }
);

router.post(
  '/:id/second-confirm',
  requirePermission('second_confirm'),
  async (req: Request, res: Response) => {
    const user = req.user!;

    try {
      const updated = await liabilityService.secondConfirmRecord(req.params.id, user, req.ip);
      
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Record not found' });
      }

      const filteredRecord = filterFieldsByRole(updated, user.role);

      res.json({
        success: true,
        data: filteredRecord
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }
);

router.post(
  '/:id/handling-opinion',
  requirePermission('add_handling_opinion'),
  async (req: Request, res: Response) => {
    const user = req.user!;
    const { opinion } = req.body;

    if (!opinion) {
      return res.status(400).json({ success: false, error: 'Opinion is required' });
    }

    const updated = await liabilityService.addHandlingOpinion(req.params.id, user, opinion);
    
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Record not found' });
    }

    const filteredRecord = filterFieldsByRole(updated, user.role);

    res.json({
      success: true,
      data: filteredRecord
    });
  }
);

router.post(
  '/:id/resolve-dirty/:dirtyLogId',
  requirePermission('mark_dirty_resolved'),
  async (req: Request, res: Response) => {
    const user = req.user!;
    const { resolution, corrections } = req.body;

    if (!resolution) {
      return res.status(400).json({ success: false, error: 'Resolution is required' });
    }

    const updated = await liabilityService.resolveDirtyRecord(
      req.params.id,
      req.params.dirtyLogId,
      user,
      resolution,
      corrections
    );
    
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Record not found' });
    }

    const filteredRecord = filterFieldsByRole(updated, user.role);

    res.json({
      success: true,
      data: filteredRecord
    });
  }
);

export default router;
