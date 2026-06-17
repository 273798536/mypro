import { randomUUID } from 'crypto';
import {
  getRampListItem,
  getRampRow,
  insertItem,
  listItems,
  updateRampStatus,
  bumpRamp,
} from '../repositories/rampRepo.js';
import {
  insertChangeLog,
  listChangeLogs,
  listFeedback,
  insertFeedback,
} from '../repositories/auditRepo.js';
import type {
  ChangeLog,
  ChangeResult,
  FeedbackNote,
  Item,
  RampDetail,
  RampStatus,
  Source,
} from '../../shared/types.js';

export interface ApplyChangeParams {
  rampId: string;
  source: Source;
  newStatus: RampStatus;
  note: string;
  affectedSummary: string;
  operator: string;
  itemId?: string | null;
}

function now(): string {
  return new Date().toISOString();
}

export function applyChange(params: ApplyChangeParams): ChangeResult {
  const ramp = getRampRow(params.rampId);
  if (!ramp) {
    throw Object.assign(new Error('坡道不存在'), { status: 404 });
  }
  const previousStatus = ramp.current_status;
  const id = randomUUID();
  const createdAt = now();

  insertChangeLog({
    id,
    rampId: params.rampId,
    itemId: params.itemId ?? null,
    source: params.source,
    previousStatus,
    newStatus: params.newStatus,
    note: params.note,
    affectedSummary: params.affectedSummary,
    operator: params.operator,
    createdAt,
  });

  // 旧方案覆盖新意见：留下覆盖标记
  updateRampStatus(
    params.rampId,
    params.newStatus,
    params.source === 'old_plan_override',
  );
  bumpRamp(params.rampId);

  const changeLog: ChangeLog = {
    id,
    rampId: params.rampId,
    itemId: params.itemId ?? null,
    source: params.source,
    previousStatus,
    newStatus: params.newStatus,
    note: params.note,
    affectedSummary: params.affectedSummary,
    operator: params.operator,
    createdAt,
  };

  return {
    ok: true,
    message: `已记录改判：来源「${params.source}」，状态 ${previousStatus ?? '—'} → ${params.newStatus}`,
    rampId: params.rampId,
    previousStatus,
    newStatus: params.newStatus,
    source: params.source,
    affectedSummary: params.affectedSummary,
    changeLog,
  };
}

export function supplementPhoto(params: {
  rampId: string;
  title: string;
  content: string;
  photoUrl: string;
  note: string;
  affectedSummary: string;
  operator: string;
  newStatus?: RampStatus;
}): { itemId: string } & ChangeResult {
  const ramp = getRampRow(params.rampId);
  if (!ramp) throw Object.assign(new Error('坡道不存在'), { status: 404 });
  const itemId = randomUUID();
  const submittedAt = now();
  insertItem({
    id: itemId,
    rampId: params.rampId,
    title: params.title,
    source: 'on_site_photo',
    content: params.content,
    photoUrl: params.photoUrl,
    isOverriding: false,
    submittedAt,
  });
  const result = applyChange({
    rampId: params.rampId,
    source: 'on_site_photo',
    newStatus: params.newStatus ?? 'pending',
    note: params.note,
    affectedSummary: params.affectedSummary,
    operator: params.operator,
    itemId,
  });
  return { itemId, ...result };
}

export function recordFeedback(params: {
  rampId: string;
  content: string;
  isGrayscale: boolean;
  affectsRamps: string[];
  note: string;
  affectedSummary: string;
  operator: string;
  newStatus?: RampStatus;
}): ChangeResult {
  const ramp = getRampRow(params.rampId);
  if (!ramp) throw Object.assign(new Error('坡道不存在'), { status: 404 });
  const noteId = randomUUID();
  insertFeedback({
    id: noteId,
    content: params.content,
    isGrayscale: params.isGrayscale,
    affectsRamps: params.affectsRamps,
    createdAt: now(),
  });
  return applyChange({
    rampId: params.rampId,
    source: 'resident_feedback',
    newStatus: params.newStatus ?? 'pending',
    note: params.note,
    affectedSummary: params.affectedSummary,
    operator: params.operator,
  });
}

export function getDetail(rampId: string): RampDetail | undefined {
  const ramp = getRampListItem(rampId);
  if (!ramp) return undefined;
  const items: Item[] = listItems(rampId);
  const changeLogs: ChangeLog[] = listChangeLogs(rampId);
  const feedbackNotes: FeedbackNote[] = listFeedback(rampId);
  return { ramp, items, changeLogs, feedbackNotes };
}
