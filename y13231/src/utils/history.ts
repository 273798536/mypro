import type { ConflictRecord, HistoryVersion, ChangeType } from '@/types';
import { CHANGE_TYPE_LABELS } from '@/types';

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function createHistoryVersion(
  record: ConflictRecord,
  changeType: ChangeType,
  operator: string,
  snapshot: Partial<ConflictRecord>
): HistoryVersion {
  const version = record.historyVersions.length + 1;
  const description = buildChangeDescription(changeType, snapshot);

  return {
    id: generateId(),
    conflictId: record.id,
    version,
    snapshot: { ...snapshot },
    changeType,
    operator,
    changeDescription: description,
    createdAt: new Date().toISOString(),
  };
}

function buildChangeDescription(changeType: ChangeType, snapshot: Partial<ConflictRecord>): string {
  const base = CHANGE_TYPE_LABELS[changeType];
  
  switch (changeType) {
    case 'status_change':
      return `${base}: ${snapshot.status ? getStatusText(snapshot.status) : ''}`;
    case 'note_change':
      return `${base}: "${snapshot.currentNote?.substring(0, 30)}${snapshot.currentNote && snapshot.currentNote.length > 30 ? '...' : ''}"`;
    case 'scan_add':
      return `${base}: ${snapshot.contractScans?.[snapshot.contractScans.length - 1]?.fileName || ''}`;
    case 'timecode_toggle':
      return `${base}: ${snapshot.isTimecodeOffset ? '标记为' : '取消'}时码偏半拍`;
    case 'create':
      return `${base}: ${snapshot.trackName || ''}`;
    default:
      return base;
  }
}

function getStatusText(status: string): string {
  const map: Record<string, string> = {
    pending: '待处理',
    processing: '处理中',
    resolved: '已解决',
    closed: '已关闭',
  };
  return map[status] || status;
}

export function compareVersions(
  v1: Partial<ConflictRecord>,
  v2: Partial<ConflictRecord>
): Array<{ field: string; oldValue: unknown; newValue: unknown }> {
  const changes: Array<{ field: string; oldValue: unknown; newValue: unknown }> = [];
  const fields = ['trackName', 'fileName', 'status', 'isTimecodeOffset', 'currentNote'];

  for (const field of fields) {
    const oldVal = v1[field as keyof ConflictRecord];
    const newVal = v2[field as keyof ConflictRecord];
    
    if (oldVal !== newVal) {
      changes.push({ field, oldValue: oldVal, newValue: newVal });
    }
  }

  return changes;
}
