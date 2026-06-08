import type { Request, Response } from 'express';
import { TaskRepository } from '../repositories/task.js';
import { CollisionDetectionService } from '../services/collision.js';
import { ReportService } from '../services/report.js';
import type { TaskStatus, ParamUpdatePayload } from '../../shared/types.js';

function ok<T>(res: Response, data: T, message?: string) {
  res.json({ code: 0, data, message });
}

function fail(res: Response, message: string, code = 400) {
  res.status(code).json({ code, data: null, message });
}

export const TaskController = {
  listTasks(req: Request, res: Response) {
    const { status, keyword } = req.query as { status?: TaskStatus; keyword?: string };
    const tasks = TaskRepository.list({ status, keyword });
    ok(res, tasks);
  },

  getTaskDetail(req: Request, res: Response) {
    const { id } = req.params;
    const detail = ReportService.buildTaskDetail(id);
    if (!detail) return fail(res, '任务不存在', 404);
    ok(res, detail);
  },

  updateTaskStatus(req: Request, res: Response) {
    const { id } = req.params;
    const { status } = req.body as { status: TaskStatus };
    const task = TaskRepository.get(id);
    if (!task) return fail(res, '任务不存在', 404);
    TaskRepository.updateStatus(id, status);
    TaskRepository.addHistory({
      taskId: id,
      fieldName: 'status',
      oldValue: task.status,
      newValue: status,
      operator: req.body.operator || '展馆讲解员',
      operatedAt: new Date().toISOString(),
      reason: req.body.reason || '状态变更',
      collisionChanged: false,
    });
    ok(res, { status });
  },

  updateParams(req: Request, res: Response) {
    const { id } = req.params;
    const payload = req.body as ParamUpdatePayload & { crackId: string };
    const task = TaskRepository.get(id);
    if (!task) return fail(res, '任务不存在', 404);
    if (!payload.crackId) return fail(res, '缺少 crackId');
    if (!payload.reason) return fail(res, '请填写变更原因');

    const crack = TaskRepository.getParamsByCrack(id, payload.crackId);
    if (!crack) return fail(res, '裂缝参数不存在', 404);

    TaskRepository.updateCrackField(id, payload.crackId, payload.fieldName, payload.newValue);

    const materials = TaskRepository.getMaterials(id);
    const updatedCrack = TaskRepository.getParamsByCrack(id, payload.crackId)!;
    const collision = CollisionDetectionService.detect(updatedCrack, materials);
    const collisionChanged = collision.detected !== crack.collisionDetected;

    if (collisionChanged || collision.detected) {
      TaskRepository.updateCollision(id, payload.crackId, collision.detected, collision.overlapMaterialId);
    }

    const newConclusion = CollisionDetectionService.buildConclusion(collision, payload.crackId);
    TaskRepository.updateCrackField(id, payload.crackId, 'conclusion', newConclusion);
    const reviewTime = new Date().toISOString();
    TaskRepository.updateCrackField(id, payload.crackId, 'reviewTime', reviewTime);

    TaskRepository.addHistory({
      taskId: id,
      fieldName: payload.fieldName,
      oldValue: payload.oldValue,
      newValue: payload.newValue,
      operator: payload.operator || '展馆讲解员',
      operatedAt: new Date().toISOString(),
      reason: payload.reason,
      collisionChanged,
    });

    const finalCrack = TaskRepository.getParamsByCrack(id, payload.crackId);
    ok(res, { crack: finalCrack, collision, collisionChanged, newConclusion });
  },

  recalculateCollision(req: Request, res: Response) {
    const { id } = req.params;
    const { crackId } = req.body as { crackId?: string };
    const task = TaskRepository.get(id);
    if (!task) return fail(res, '任务不存在', 404);

    const materials = TaskRepository.getMaterials(id);
    const cracks = crackId
      ? [TaskRepository.getParamsByCrack(id, crackId)].filter(Boolean)
      : TaskRepository.getParams(id);

    const results = cracks.map((crack) => {
      if (!crack) return null;
      const collision = CollisionDetectionService.detect(crack, materials);
      const collisionChanged = collision.detected !== crack.collisionDetected;
      TaskRepository.updateCollision(id, crack.crackId, collision.detected, collision.overlapMaterialId);
      const conclusion = CollisionDetectionService.buildConclusion(collision, crack.crackId);
      TaskRepository.updateCrackField(id, crack.crackId, 'conclusion', conclusion);
      if (collisionChanged) {
        TaskRepository.addHistory({
          taskId: id,
          fieldName: 'collisionDetected',
          oldValue: String(crack.collisionDetected),
          newValue: String(collision.detected),
          operator: req.body.operator || '展馆讲解员',
          operatedAt: new Date().toISOString(),
          reason: '碰撞检测重新计算',
          collisionChanged: true,
        });
      }
      return { crackId: crack.crackId, collision, collisionChanged, conclusion };
    });

    ok(res, results);
  },

  getHistory(req: Request, res: Response) {
    const { id } = req.params;
    const task = TaskRepository.get(id);
    if (!task) return fail(res, '任务不存在', 404);
    ok(res, TaskRepository.getHistory(id));
  },

  getMaterials(req: Request, res: Response) {
    const { id } = req.params;
    const task = TaskRepository.get(id);
    if (!task) return fail(res, '任务不存在', 404);
    ok(res, TaskRepository.getMaterials(id));
  },
};

export const ExportController = {
  getReport(req: Request, res: Response) {
    const { id } = req.params;
    const report = ReportService.buildReviewReport(id);
    if (!report) return fail(res, '任务不存在', 404);
    ok(res, report);
  },

  getMaterialPackage(req: Request, res: Response) {
    const { id } = req.params;
    const detail = ReportService.buildTaskDetail(id);
    if (!detail) return fail(res, '任务不存在', 404);
    ok(res, {
      taskNo: detail.taskNo,
      bridgeName: detail.bridgeName,
      materials: detail.materials,
      timeTable: detail.params.map((p) => ({
        crackId: p.crackId,
        collectionTime: p.collectionTime,
        processTime: p.processTime,
        reviewTime: p.reviewTime,
      })),
    });
  },
};
