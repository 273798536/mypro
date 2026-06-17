import { Router, Request, Response } from 'express';
import * as reportService from '../services/report';
import { successResponse, errorResponse } from '../utils/response';
import { ReportStatus } from '../types';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const status = req.query.status as ReportStatus | undefined;
    const result = reportService.listReports(page, pageSize, status);
    successResponse(res, result);
  } catch (e) {
    errorResponse(res, (e as Error).message, 500);
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const report = reportService.getReportById(id);
    if (!report) {
      errorResponse(res, '报告不存在', 404);
      return;
    }
    successResponse(res, report);
  } catch (e: any) {
    errorResponse(res, e.message, e.statusCode || 500);
  }
});

router.get('/:id/summary', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const summary = reportService.getReportSummary(id);
    successResponse(res, summary);
  } catch (e: any) {
    errorResponse(res, e.message, e.statusCode || 500);
  }
});

router.post('/', (req: Request, res: Response) => {
  try {
    const { name, evaluation_set_id, vocabulary_id, created_by } = req.body;
    if (!name || !evaluation_set_id || !vocabulary_id) {
      errorResponse(res, '报告名称、评测集ID、词表ID都不能为空', 400);
      return;
    }
    const id = reportService.createReport(
      name,
      parseInt(evaluation_set_id),
      parseInt(vocabulary_id),
      created_by
    );
    successResponse(res, { id }, '创建成功');
  } catch (e: any) {
    errorResponse(res, e.message, e.statusCode || 400, e.details);
  }
});

router.post('/:id/generate', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    reportService.generateReport(id);
    const report = reportService.getReportById(id);
    successResponse(res, report, '报告生成成功');
  } catch (e: any) {
    errorResponse(res, e.message, e.statusCode || 400, e.details);
  }
});

router.put('/:id/status', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { status, operator } = req.body;
    if (!status) {
      errorResponse(res, '目标状态不能为空', 400);
      return;
    }
    const report = reportService.transitionStatus(id, status as ReportStatus, operator);
    successResponse(res, report, '状态更新成功');
  } catch (e: any) {
    errorResponse(res, e.message, e.statusCode || 400, e.details);
  }
});

router.get('/:id/items', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const isCovered = req.query.isCovered !== undefined
      ? parseInt(req.query.isCovered as string)
      : undefined;
    const annotationStatus = req.query.annotationStatus as string | undefined;
    const reviewed = req.query.reviewed !== undefined
      ? req.query.reviewed === 'true'
      : undefined;

    const result = reportService.listReportItems(id, page, pageSize, {
      isCovered,
      annotationStatus,
      reviewed,
    });
    successResponse(res, result);
  } catch (e: any) {
    errorResponse(res, e.message, e.statusCode || 500);
  }
});

router.put('/:id/items/:itemId/annotation', (req: Request, res: Response) => {
  try {
    const reportId = parseInt(req.params.id);
    const itemId = parseInt(req.params.itemId);
    const { annotation_status, annotation_note, reviewer } = req.body;

    if (!annotation_status) {
      errorResponse(res, '标注状态不能为空', 400);
      return;
    }

    reportService.updateReportItemAnnotation(
      reportId,
      itemId,
      annotation_status,
      annotation_note,
      reviewer
    );
    successResponse(res, null, '标注更新成功');
  } catch (e: any) {
    errorResponse(res, e.message, e.statusCode || 400, e.details);
  }
});

router.post('/:id/items/:itemId/review', (req: Request, res: Response) => {
  try {
    const reportId = parseInt(req.params.id);
    const itemId = parseInt(req.params.itemId);
    const { action, comment, reviewer, annotation_data } = req.body;

    if (!action || !['confirm', 'reject', 'supplement'].includes(action)) {
      errorResponse(res, '操作类型不合法，可选值：confirm、reject、supplement', 400);
      return;
    }

    reportService.reviewReportItem(
      reportId,
      itemId,
      action as any,
      comment,
      reviewer,
      annotation_data
    );
    successResponse(res, null, '复核成功');
  } catch (e: any) {
    errorResponse(res, e.message, e.statusCode || 400, e.details);
  }
});

router.get('/:id/review-records', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const result = reportService.listReviewRecords(id, page, pageSize);
    successResponse(res, result);
  } catch (e: any) {
    errorResponse(res, e.message, e.statusCode || 500);
  }
});

export default router;
