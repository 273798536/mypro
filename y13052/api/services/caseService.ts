import type {
  PreReviewCase,
  CaseStatus,
  CaseListQuery,
  RejudgeRequest,
  SupplementRequest,
  HistoryRecord,
  TimelineEvent,
} from '../../shared/types.js';
import {
  getAllCases,
  getCaseById,
  updateCase,
  appendTimelineEvent,
  updateAttachments,
  appendPhoto,
  appendAttachment,
} from '../store/dataStore.js';
import { addHistoryRecord } from '../store/dataStore.js';

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function listCases(query: CaseListQuery): PreReviewCase[] {
  let all = getAllCases();
  if (query.status) {
    all = all.filter((c) => c.status === query.status);
  }
  if (query.objectType) {
    all = all.filter((c) => c.objectType === query.objectType);
  }
  if (query.keyword) {
    const kw = query.keyword.toLowerCase();
    all = all.filter(
      (c) =>
        c.caseNumber.toLowerCase().includes(kw) ||
        c.location.toLowerCase().includes(kw) ||
        c.collisionSummary.toLowerCase().includes(kw),
    );
  }
  return all.map((c) => ({
    ...c,
    photos: [],
    timeline: [],
    attachments: [],
    collisionObjects: [],
  }));
}

export function getCaseDetail(id: string): PreReviewCase | undefined {
  return getCaseById(id);
}

export interface RejudgeResult {
  updatedCase: PreReviewCase;
  historyRecord: HistoryRecord;
  linkedAttachmentIds: string[];
}

export function rejudgeCase(caseId: string, req: RejudgeRequest): RejudgeResult | null {
  const current = getCaseById(caseId);
  if (!current) return null;

  const now = new Date().toISOString();
  const fromStatus = current.status;
  const toStatus = req.toStatus;

  const finalStatus: CaseStatus = req.markAbnormal ? 'abnormal' : toStatus;

  const linkedAttachmentIds: string[] = [];
  const requestedIds = new Set(req.linkedAttachmentIds || []);
  if (requestedIds.size > 0) {
    updateAttachments(caseId, (atts) =>
      atts.map((a) => {
        if (requestedIds.has(a.id)) {
          linkedAttachmentIds.push(a.id);
          return { ...a, linkedToConclusion: true, conclusionId: `hist-${caseId}-${Date.now().toString(36)}` };
        }
        return a;
      }),
    );
  }

  updateCase(caseId, {
    status: finalStatus,
    lastOperator: req.operator,
    rejudgeCount: current.rejudgeCount + 1,
  });

  const action = req.markAbnormal ? 'mark_abnormal' : 'rejudge';
  const tlEvent: TimelineEvent = {
    id: uid('tl'),
    caseId,
    timestamp: now,
    type: req.markAbnormal ? 'abnormal' : 'rejudge',
    title: `${action === 'rejudge' ? '改判' : '改判并标记异常'}：${fromStatus} → ${finalStatus}`,
    description:
      (req.reason || '无改判原因') +
      (req.abnormalNote ? ` | 异常说明：${req.abnormalNote}` : '') +
      (linkedAttachmentIds.length > 0 ? ` | 已关联晚到附件 ${linkedAttachmentIds.length} 个` : ''),
  };
  appendTimelineEvent(caseId, tlEvent);

  const historyRecord: HistoryRecord = {
    id: uid('hist'),
    caseId,
    caseNumber: current.caseNumber,
    action,
    operator: req.operator,
    operatedAt: now,
    fromStatus,
    toStatus: finalStatus,
    reason: req.reason,
    linkedPhotoIds: req.linkedPhotoIds,
    linkedObjectIds: req.linkedObjectIds,
    linkedAttachmentIds,
    isSupplement: false,
    abnormalNote: req.abnormalNote,
  };
  addHistoryRecord(historyRecord);

  const updatedCase = getCaseById(caseId)!;
  return { updatedCase, historyRecord, linkedAttachmentIds };
}

export interface SupplementResult {
  updatedCase: PreReviewCase;
  historyRecord: HistoryRecord;
  addedPhotos: number;
  addedAttachments: number;
}

export async function supplementRecord(caseId: string, req: SupplementRequest): Promise<SupplementResult | null> {
  const current = getCaseById(caseId);
  if (!current) return null;

  const now = new Date().toISOString();
  const addedPhotos: PreReviewCase['photos'] = [];
  const addedAttachments: PreReviewCase['attachments'] = [];

  if (req.extraPhotos && req.extraPhotos.length > 0) {
    for (const p of req.extraPhotos) {
      const np = appendPhoto(caseId, p);
      if (np) addedPhotos.push(np);
    }
  }
  if (req.extraAttachments && req.extraAttachments.length > 0) {
    for (const a of req.extraAttachments) {
      const na = await appendAttachment(caseId, a);
      if (na) addedAttachments.push(na);
    }
  }
  if (req.extraTimeline && req.extraTimeline.length > 0) {
    for (const t of req.extraTimeline) {
      appendTimelineEvent(caseId, {
        id: uid('tl'),
        caseId,
        timestamp: t.timestamp || now,
        title: t.title,
        description: t.description,
        photoId: t.photoId,
        objectId: t.objectId,
        type: 'inspection',
      });
    }
  }

  if (req.linkedAttachmentIds && req.linkedAttachmentIds.length > 0) {
    const ids = new Set(req.linkedAttachmentIds);
    updateAttachments(caseId, (atts) =>
      atts.map((a) => (ids.has(a.id) ? { ...a, linkedToConclusion: true, conclusionId: `supp-${caseId}-${now}` } : a)),
    );
  }

  const totalAdded = addedPhotos.length + addedAttachments.length;
  appendTimelineEvent(caseId, {
    id: uid('tl'),
    caseId,
    timestamp: now,
    type: 'inspection',
    title: `补录记录：新增 ${totalAdded} 项资料`,
    description:
      (req.reason || '补录原因未填') +
      (addedPhotos.length > 0 ? ` | 补录照片 ${addedPhotos.length} 张` : '') +
      (addedAttachments.length > 0 ? ` | 补录附件 ${addedAttachments.length} 个` : ''),
  });

  updateCase(caseId, {
    lastOperator: req.operator,
  });

  const historyRecord: HistoryRecord = {
    id: uid('hist'),
    caseId,
    caseNumber: current.caseNumber,
    action: 'supplement',
    operator: req.operator,
    operatedAt: now,
    reason: req.reason,
    linkedPhotoIds: addedPhotos.map((p) => p.id),
    linkedObjectIds: [],
    linkedAttachmentIds: addedAttachments.map((a) => a.id),
    isSupplement: true,
  };
  addHistoryRecord(historyRecord);

  const updatedCase = getCaseById(caseId)!;
  return {
    updatedCase,
    historyRecord,
    addedPhotos: addedPhotos.length,
    addedAttachments: addedAttachments.length,
  };
}
