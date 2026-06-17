import { Router, type Request, type Response } from 'express';
import { listRamps } from '../repositories/rampRepo.js';
import {
  applyChange,
  getDetail,
  recordFeedback,
  supplementPhoto,
} from '../services/rampService.js';
import {
  SOURCE_LABELS,
  STATUS_LABELS,
  type RampStatus,
  type Source,
} from '../../shared/types.js';

const router = Router();

const VALID_SOURCES: Source[] = [
  'normal',
  'old_plan_override',
  'resident_feedback',
  'on_site_photo',
  'manual_override',
];
const VALID_STATUSES: RampStatus[] = ['processed', 'pending', 'overridden'];

function isSource(v: unknown): v is Source {
  return typeof v === 'string' && (VALID_SOURCES as string[]).includes(v);
}
function isStatus(v: unknown): v is RampStatus {
  return typeof v === 'string' && (VALID_STATUSES as string[]).includes(v);
}
function parseBool(v: unknown): boolean | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  return v === 'true' || v === '1' || v === 1;
}

function sendError(res: Response, err: unknown): void {
  const status = (err as { status?: number })?.status ?? 400;
  const message = err instanceof Error ? err.message : '请求处理失败';
  res.status(status).json({ ok: false, message });
}

/** GET /api/ramps — 清单（含筛选：source / status / overriding） */
router.get('/', (req: Request, res: Response) => {
  const source = isSource(req.query.source) ? req.query.source : undefined;
  const status = isStatus(req.query.status) ? req.query.status : undefined;
  const overriding = parseBool(req.query.overriding);
  res.json({ ok: true, data: listRamps({ source, status, overriding }) });
});

/** GET /api/ramps/:id — 详情（材料 + 改判时间线 + 居民反馈备注 + 点位） */
router.get('/:id', (req: Request, res: Response) => {
  const detail = getDetail(req.params.id);
  if (!detail) return sendError(res, Object.assign(new Error('坡道不存在'), { status: 404 }));
  res.json({ ok: true, data: detail });
});

/** POST /api/ramps/:id/changes — 写改判记录并更新当前状态 */
router.post('/:id/changes', (req: Request, res: Response) => {
  try {
    const { source, newStatus, note, affectedSummary, operator, itemId } = req.body ?? {};
    if (!isSource(source)) return sendError(res, Object.assign(new Error('来源 source 非法'), { status: 422 }));
    if (!isStatus(newStatus)) return sendError(res, Object.assign(new Error('状态 newStatus 非法'), { status: 422 }));
    const result = applyChange({
      rampId: req.params.id,
      source,
      newStatus,
      note: note ?? '',
      affectedSummary: affectedSummary ?? '',
      operator: operator ?? '社区运营',
      itemId: itemId ?? null,
    });
    res.json({ ok: true, data: result });
  } catch (err) {
    sendError(res, err);
  }
});

/** POST /api/ramps/:id/feedback — 居民反馈备注（灰度），写改判记录 */
router.post('/:id/feedback', (req: Request, res: Response) => {
  try {
    const { content, isGrayscale, affectsRamps, note, affectedSummary, operator, newStatus } = req.body ?? {};
    if (!content || typeof content !== 'string')
      return sendError(res, Object.assign(new Error('反馈内容 content 必填'), { status: 422 }));
    const result = recordFeedback({
      rampId: req.params.id,
      content,
      isGrayscale: Boolean(isGrayscale),
      affectsRamps: Array.isArray(affectsRamps) ? affectsRamps : [req.params.id],
      note: note ?? content,
      affectedSummary: affectedSummary ?? `居民反馈改判为「待补材料」，需复核 ${STATUS_LABELS[newStatus as RampStatus] ?? '待补材料'}`,
      operator: operator ?? '社区运营',
      newStatus: isStatus(newStatus) ? newStatus : undefined,
    });
    res.json({ ok: true, data: result });
  } catch (err) {
    sendError(res, err);
  }
});

/** POST /api/ramps/:id/photos — 现场照片补录，写改判记录（说明改了什么） */
router.post('/:id/photos', (req: Request, res: Response) => {
  try {
    const { title, content, photoUrl, note, affectedSummary, operator, newStatus } = req.body ?? {};
    if (!title) return sendError(res, Object.assign(new Error('照片标题 title 必填'), { status: 422 }));
    const result = supplementPhoto({
      rampId: req.params.id,
      title,
      content: content ?? '',
      photoUrl: photoUrl ?? '',
      note: note ?? '现场照片补录',
      affectedSummary: affectedSummary ?? '现场照片补录，坡道状态需据此复核',
      operator: operator ?? '社区运营',
      newStatus: isStatus(newStatus) ? newStatus : undefined,
    });
    res.json({ ok: true, data: result });
  } catch (err) {
    sendError(res, err);
  }
});

// 占位：避免 next 未使用告警

export default router;
