import { recordRepository } from '../db/repository';
import type { LoadingRecord } from '../../shared/types';
import { randomUUID } from 'crypto';

export interface UpdateScoreRequest {
  recordId: string;
  score: number;
  scoreNote?: string;
  reason: string;
  scorer: string;
}

export function updateScore(request: UpdateScoreRequest): LoadingRecord | null {
  const { recordId, score, scoreNote, reason, scorer } = request;

  if (!reason || reason.trim() === '') {
    throw new Error('修改评分必须填写修正原因');
  }

  const existing = recordRepository.findById(recordId);
  if (!existing) {
    return null;
  }

  const now = Date.now();
  const previousScore = existing.latestScore;

  recordRepository.addHistory({
    recordId,
    score,
    scoreNote,
    reason,
    scorer,
    scoreTime: now,
    previousScore,
  });

  const newStatus = score >= 80 ? 'approved' : score < 60 ? 'rejected' : 'pending';

  return recordRepository.update(recordId, {
    latestScore: score,
    latestScoreNote: scoreNote,
    scorer,
    scoreTime: now,
    status: newStatus,
    anomalyType: undefined,
  });
}

export function getRecordDetail(recordId: string): (LoadingRecord & { history: any[]; notes: any[] }) | null {
  const record = recordRepository.findById(recordId);
  if (!record) return null;

  const history = recordRepository.getHistory(recordId);
  const notes = recordRepository.getNotes(recordId);

  return {
    ...record,
    history,
    notes,
  };
}

export function addNote(recordId: string, content: string, author: string) {
  if (!content || !content.trim()) {
    throw new Error('处理意见不能为空');
  }

  return recordRepository.addNote({
    recordId,
    content,
    author,
    createTime: Date.now(),
  });
}
