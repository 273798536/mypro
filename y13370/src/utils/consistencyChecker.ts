import type { TimelineEvent, ConsistencyStatus, ConsistencyReport } from '@/types';
import { hashObject, hashString } from './hash';

export type { ConsistencyReport };

export function checkEventConsistency(event: TimelineEvent): ConsistencyStatus {
  if (event.fileStatusHash === '' || event.pageStatusHash === '') return 'pending';
  return event.fileStatusHash === event.pageStatusHash ? 'consistent' : 'inconsistent';
}

export function runFullConsistencyCheck(events: TimelineEvent[]): {
  events: TimelineEvent[];
  report: ConsistencyReport;
} {
  let consistent = 0;
  let inconsistent = 0;
  let pending = 0;
  const inconsistentIds: string[] = [];

  const updated = events.map(ev => {
    const simulatedFileRecord = {
      id: ev.id,
      type: ev.eventType,
      ref: ev.refId,
      title: ev.title,
      desc: ev.description,
      time: ev.eventTime,
      meta: ev.metadata
    };
    const fileHash = hashObject(simulatedFileRecord);
    const pageHash = ev.isConsistent === 'consistent'
      ? fileHash
      : ev.isConsistent === 'inconsistent'
        ? hashString(fileHash + '_drifted_' + ev.id)
        : '';

    const status = checkEventConsistency({
      ...ev,
      fileStatusHash: fileHash,
      pageStatusHash: pageHash
    });

    if (status === 'consistent') consistent++;
    else if (status === 'inconsistent') {
      inconsistent++;
      inconsistentIds.push(ev.id);
    } else pending++;

    return {
      ...ev,
      fileStatusHash: fileHash,
      pageStatusHash: pageHash,
      isConsistent: status
    };
  });

  const total = updated.length;
  const report: ConsistencyReport = {
    total,
    consistent,
    inconsistent,
    pending,
    inconsistentIds,
    summary: `共校验 ${total} 条记录：一致 ${consistent}，不一致 ${inconsistent}，待校验 ${pending}`
  };

  return { events: updated, report };
}
