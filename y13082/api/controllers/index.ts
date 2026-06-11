import type { Request, Response } from 'express';
import {
  BatchService,
  CollisionService,
  HistoryService,
  SavedViewService,
  ExportService,
} from '../services/index.js';
import type { RejudgePayload } from '../../shared/types.js';

function ok(res: Response, data: unknown) {
  res.json({ success: true, data });
}

function fail(res: Response, status: number, message: string) {
  res.status(status).json({ success: false, error: message });
}

export const BatchController = {
  list(req: Request, res: Response) {
    const { status, keyword } = req.query;
    const data = BatchService.list(status as string | undefined, keyword as string | undefined);
    ok(res, data);
  },

  detail(req: Request, res: Response) {
    const data = BatchService.getDetail(req.params.id);
    if (!data) return fail(res, 404, '批次不存在');
    ok(res, data);
  },

  points(req: Request, res: Response) {
    const batch = BatchService.getDetail(req.params.id);
    if (!batch) return fail(res, 404, '批次不存在');
    ok(res, BatchService.getPoints(req.params.id));
  },

  collisions(req: Request, res: Response) {
    const batch = BatchService.getDetail(req.params.id);
    if (!batch) return fail(res, 404, '批次不存在');
    ok(res, BatchService.getCollisions(req.params.id));
  },
};

export const CollisionController = {
  rejudge(req: Request, res: Response) {
    const payload = req.body as RejudgePayload;
    if (!payload.newStatus || !payload.reason || !payload.operator) {
      return fail(res, 400, '缺少改判参数：newStatus, reason, operator');
    }
    const result = CollisionService.rejudge(req.params.id, payload);
    if (!result) return fail(res, 404, '碰撞记录不存在');
    ok(res, result);
  },

  anomalies(req: Request, res: Response) {
    const { types, status, sortBy, sortOrder } = req.query;
    const parsedTypes = types ? (types as string).split(',').filter(Boolean) as any : undefined;
    const parsedStatus = status ? (status as string).split(',').filter(Boolean) as any : undefined;
    const data = CollisionService.listAnomalies({
      types: parsedTypes,
      status: parsedStatus,
      sortBy: sortBy as string | undefined,
      sortOrder: (sortOrder as 'asc' | 'desc' | undefined),
    });
    ok(res, data);
  },
};

export const HistoryController = {
  list(req: Request, res: Response) {
    const { batchId } = req.query;
    ok(res, HistoryService.list(batchId as string | undefined));
  },
};

export const SavedViewController = {
  list(_req: Request, res: Response) {
    ok(res, SavedViewService.list());
  },

  get(req: Request, res: Response) {
    const view = SavedViewService.get(req.params.id);
    if (!view) return fail(res, 404, '视图不存在');
    ok(res, view);
  },

  create(req: Request, res: Response) {
    const body = req.body as any;
    if (!body.name || !body.createdBy) {
      return fail(res, 400, '缺少参数：name, createdBy');
    }
    const created = SavedViewService.create({
      name: body.name,
      anomalyTypes: body.anomalyTypes || [],
      statusFilter: body.statusFilter || [],
      sortBy: body.sortBy || 'detectedAt',
      sortOrder: body.sortOrder || 'desc',
      cameraAngle: body.cameraAngle || 'iso',
      createdBy: body.createdBy,
    });
    ok(res, created);
  },
};

export const ExportController = {
  anomaliesCsv(req: Request, res: Response) {
    const { types, status, sortBy, sortOrder } = req.query;
    const parsedTypes = types ? (types as string).split(',').filter(Boolean) as any : undefined;
    const parsedStatus = status ? (status as string).split(',').filter(Boolean) as any : undefined;
    const csv = ExportService.anomaliesToCsv({
      types: parsedTypes,
      status: parsedStatus,
      sortBy: sortBy as string | undefined,
      sortOrder: (sortOrder as 'asc' | 'desc' | undefined),
    });
    const filename = `wharf_collision_anomalies_${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent('异常队列_' + new Date().toISOString().slice(0, 10) + '.csv')}`);
    res.send('\ufeff' + csv);
  },
};
