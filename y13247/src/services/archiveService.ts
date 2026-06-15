import {
  StageChannelRecord,
  TrackItem,
  ArchiveItem,
  MatchStatus,
  HistoryLogEntry,
  ChangeSource,
  RejudgeRequest,
  AuthorizationRequest,
  AuthorizationNote,
  Timecode,
} from '../types';
import {
  calculateTimecodeDeviation,
  formatDeviation,
  isDeviationHalfFrame,
} from '../utils/timecode';
import {
  getStageRecords,
  getTrackItems,
  getArchiveItems,
  getArchiveItemById,
  addArchiveItem,
  updateArchiveItem,
  addHistoryLog,
  addAuthorizationNote,
  getStageRecordById,
  getTrackItemById,
} from '../store/dataStore';

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function detectMatchStatus(
  stage: StageChannelRecord,
  track: TrackItem
): { status: MatchStatus; issues: string[]; deviation: number } {
  const issues: string[] = [];
  const filenameMatch = stage.originalFilename.trim().toLowerCase() ===
    track.expectedFilename.trim().toLowerCase();

  let deviation = calculateTimecodeDeviation(
    stage.timecodeStart,
    track.expectedTimecodeStart
  );

  if (deviation === 0) {
    const rawDeviation = stage.timecodeDeviationMs;
    if (rawDeviation !== undefined && rawDeviation !== 0) {
      deviation = rawDeviation;
    } else {
      const halfFrameMatch = stage.rawDescription.match(/约(\d+)ms|半拍|半帧/);
      if (halfFrameMatch) {
        deviation = halfFrameMatch[1] ? parseInt(halfFrameMatch[1]) : 20;
      }
    }
  }

  if (stage.isLateArrival) {
    issues.push(`文件晚到，实际接收时间: ${stage.receivedAt}`);
    return { status: 'late_arrival', issues, deviation };
  }

  if (!filenameMatch && deviation !== 0) {
    issues.push(`文件名不匹配: 舞台="${stage.originalFilename}", 曲目表="${track.expectedFilename}"`);
    issues.push(`时码偏差: ${formatDeviation(deviation)}`);
    if (isDeviationHalfFrame(deviation)) {
      issues.push(`原始记录备注: ${stage.rawDescription}`);
    }
    return { status: 'mismatch_both', issues, deviation };
  }

  if (!filenameMatch) {
    issues.push(`文件名不匹配: 舞台="${stage.originalFilename}", 曲目表="${track.expectedFilename}"`);
    return { status: 'mismatch_filename', issues, deviation };
  }

  if (deviation !== 0) {
    issues.push(`时码偏差: ${formatDeviation(deviation)}`);
    if (isDeviationHalfFrame(deviation)) {
      issues.push(`舞台通道原始描述: "${stage.rawDescription}"`);
      issues.push(`录音师备注: ${stage.engineerNote || '无'}`);
    }
    return { status: 'mismatch_timecode', issues, deviation };
  }

  return { status: 'matched', issues: [], deviation };
}

export function createHistoryLog(
  archiveItemId: string,
  source: ChangeSource,
  operator: string,
  previousStatus: MatchStatus,
  newStatus: MatchStatus,
  previousValue: Record<string, unknown>,
  newValue: Record<string, unknown>,
  reason: string
): HistoryLogEntry {
  return {
    id: generateId('log'),
    archiveItemId,
    timestamp: new Date().toISOString(),
    source,
    operator,
    previousStatus,
    newStatus,
    previousValue,
    newValue,
    reason,
  };
}

export function runAutoAlign(): ArchiveItem[] {
  const stages = getStageRecords();
  const tracks = getTrackItems();

  const result: ArchiveItem[] = [];
  const sortedStages = [...stages].sort((a, b) => a.channelNo - b.channelNo);
  const sortedTracks = [...tracks].sort((a, b) => a.trackNo - b.trackNo);

  for (let i = 0; i < Math.min(sortedStages.length, sortedTracks.length); i++) {
    const stage = sortedStages[i];
    const track = sortedTracks[i];

    const { status, issues, deviation } = detectMatchStatus(stage, track);

    const previousValue = {
      stageFilename: stage.originalFilename,
      trackFilename: track.expectedFilename,
      stageTimecode: stage.timecodeStart,
      trackTimecode: track.expectedTimecodeStart,
    };

    const newValue = {
      finalFilename: track.expectedFilename,
      finalTimecode: track.expectedTimecodeStart,
      finalTitle: track.expectedTitle,
      status,
      issues,
    };

    const log = createHistoryLog(
      '',
      'auto_align',
      'system',
      'pending',
      status,
      previousValue,
      newValue,
      `自动对齐: 通道${stage.channelNo} <-> 曲目${track.trackNo}`
    );

    const archiveItem: ArchiveItem = {
      id: generateId('arc'),
      stageRecordId: stage.id,
      trackItemId: track.id,
      finalTitle: track.expectedTitle,
      finalFilename: track.expectedFilename,
      finalTimecodeStart: track.expectedTimecodeStart,
      finalDuration: stage.durationSeconds,
      status,
      timecodeDeviationMs: deviation,
      alignmentIssues: issues,
      originalStageNote: stage.engineerNote,
      history: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    log.archiveItemId = archiveItem.id;
    archiveItem.history.push(log);

    addArchiveItem(archiveItem);
    result.push(archiveItem);
  }

  return result;
}

export function rejudgeItem(request: RejudgeRequest): ArchiveItem | null {
  const item = getArchiveItemById(request.archiveItemId);
  if (!item) return null;

  const stage = request.newStageRecordId
    ? getStageRecordById(request.newStageRecordId) || item.stageRecord
    : item.stageRecord;
  const track = request.newTrackItemId
    ? getTrackItemById(request.newTrackItemId) || item.trackItem
    : item.trackItem;

  if (!stage || !track) return null;

  const previousValue = {
    finalTitle: item.finalTitle,
    finalFilename: item.finalFilename,
    finalTimecodeStart: item.finalTimecodeStart,
    stageRecordId: item.stageRecordId,
    trackItemId: item.trackItemId,
    status: item.status,
  };

  const newFinalTimecode = request.overrideTimecode || item.finalTimecodeStart;
  const newFinalTitle = request.overrideTitle || track.expectedTitle;

  const newValue = {
    finalTitle: newFinalTitle,
    finalFilename: track.expectedFilename,
    finalTimecodeStart: newFinalTimecode,
    stageRecordId: stage.id,
    trackItemId: track.id,
    status: 'rejudged' as MatchStatus,
  };

  const log = createHistoryLog(
    item.id,
    'manual_rejudge',
    request.operator,
    item.status,
    'rejudged',
    previousValue,
    newValue,
    request.reason
  );

  const updated: ArchiveItem = {
    ...item,
    stageRecordId: stage.id,
    trackItemId: track.id,
    finalTitle: newFinalTitle,
    finalFilename: track.expectedFilename,
    finalTimecodeStart: newFinalTimecode,
    status: 'rejudged',
    alignmentIssues: item.alignmentIssues.filter(i => !i.includes('时码') && !i.includes('文件名')),
    history: [...item.history, log],
    updatedAt: new Date().toISOString(),
  };

  if (request.overrideTimecode || request.overrideTitle) {
    updated.alignmentIssues.push(`人工改判覆盖: ${request.reason}`);
  }

  updateArchiveItem(updated);

  return {
    ...updated,
    stageRecord: getStageRecordById(updated.stageRecordId),
    trackItem: getTrackItemById(updated.trackItemId),
  };
}

export function authorizeItem(request: AuthorizationRequest): ArchiveItem | null {
  const item = getArchiveItemById(request.archiveItemId);
  if (!item) return null;

  const stage = getStageRecordById(request.alignmentDecision.useStageFile);
  const track = getTrackItemById(request.alignmentDecision.useTrackItem);

  if (!stage || !track) return null;

  const authNote: AuthorizationNote = {
    id: generateId('auth'),
    archiveItemId: item.id,
    authorizer: request.authorizer,
    note: request.note,
    createdAt: new Date().toISOString(),
    alignmentDecision: request.alignmentDecision,
  };

  const previousValue = {
    finalTitle: item.finalTitle,
    finalFilename: item.finalFilename,
    finalTimecodeStart: item.finalTimecodeStart,
    status: item.status,
  };

  const newFinalTimecode = request.alignmentDecision.overrideTimecode || track.expectedTimecodeStart;
  const newFinalTitle = request.alignmentDecision.overrideTitle || track.expectedTitle;

  const newValue = {
    finalTitle: newFinalTitle,
    finalFilename: track.expectedFilename,
    finalTimecodeStart: newFinalTimecode,
    stageRecordId: stage.id,
    trackItemId: track.id,
    status: 'authorized' as MatchStatus,
    authorizationNote: authNote,
  };

  const log = createHistoryLog(
    item.id,
    'authorization',
    request.authorizer,
    item.status,
    'authorized',
    previousValue,
    newValue,
    `授权对齐: ${request.note}`
  );

  const updated: ArchiveItem = {
    ...item,
    stageRecordId: stage.id,
    trackItemId: track.id,
    finalTitle: newFinalTitle,
    finalFilename: track.expectedFilename,
    finalTimecodeStart: newFinalTimecode,
    status: 'authorized',
    authorizationNote: authNote,
    alignmentIssues: [`已授权对齐: ${request.note}`],
    history: [...item.history, log],
    updatedAt: new Date().toISOString(),
  };

  addAuthorizationNote(authNote);
  updateArchiveItem(updated);

  return {
    ...updated,
    stageRecord: getStageRecordById(updated.stageRecordId),
    trackItem: getTrackItemById(updated.trackItemId),
  };
}

export function archiveItem(itemId: string, operator: string): ArchiveItem | null {
  const item = getArchiveItemById(itemId);
  if (!item) return null;

  if (item.status !== 'authorized' && item.status !== 'matched' && item.status !== 'rejudged') {
    throw new Error('仅已授权/已匹配/已改判的条目可归档');
  }

  const previousValue = { status: item.status };
  const newValue = { status: 'archived' as MatchStatus };

  const log = createHistoryLog(
    item.id,
    'system_detect',
    operator,
    item.status,
    'archived',
    previousValue,
    newValue,
    '清单归档完成'
  );

  const updated: ArchiveItem = {
    ...item,
    status: 'archived',
    history: [...item.history, log],
    updatedAt: new Date().toISOString(),
  };

  updateArchiveItem(updated);

  return {
    ...updated,
    stageRecord: getStageRecordById(updated.stageRecordId),
    trackItem: getTrackItemById(updated.trackItemId),
  };
}

export function getItemHistory(itemId: string): HistoryLogEntry[] | null {
  const item = getArchiveItemById(itemId);
  return item ? item.history : null;
}

export function getIssueSummary(): {
  total: number;
  matched: number;
  mismatched: number;
  lateArrival: number;
  needReview: number;
  authorized: number;
  archived: number;
} {
  const items = getArchiveItems();
  return {
    total: items.length,
    matched: items.filter(i => i.status === 'matched').length,
    mismatched: items.filter(i => i.status.startsWith('mismatch')).length,
    lateArrival: items.filter(i => i.status === 'late_arrival').length,
    needReview: items.filter(i => ['mismatch_filename', 'mismatch_timecode', 'mismatch_both', 'late_arrival', 'rejudged'].includes(i.status)).length,
    authorized: items.filter(i => i.status === 'authorized').length,
    archived: items.filter(i => i.status === 'archived').length,
  };
}
