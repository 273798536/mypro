import type { BeatNote, ConflictDetail, BeatTrackInfo, TrainInfo, PlatformInfo } from '@/types';

export interface ArbitrationResult {
  effectiveTrack: number;
  effectiveTime: number;
  hasConflict: boolean;
  conflicts: ConflictDetail[];
  basis: string;
}

export function arbitrate(
  beatTrack: BeatTrackInfo,
  train: TrainInfo,
  platform: PlatformInfo
): ArbitrationResult {
  const conflicts: ConflictDetail[] = [];
  let hasConflict = false;

  if (train.actualTrack !== beatTrack.expectedTrack) {
    hasConflict = true;
    conflicts.push({
      id: `arb_c_${beatTrack.noteId}_t`,
      timestamp: beatTrack.expectedTime,
      sourceA: '节拍轨',
      sourceB: '列车',
      field: '轨道',
      valueA: `${beatTrack.expectedTrack}`,
      valueB: `${train.actualTrack}`,
      resolution: '以节拍轨为准',
      relatedNoteId: beatTrack.noteId,
    });
  }

  if (platform.designatedTrack !== beatTrack.expectedTrack) {
    hasConflict = true;
    conflicts.push({
      id: `arb_c_${beatTrack.noteId}_p`,
      timestamp: beatTrack.expectedTime,
      sourceA: '节拍轨',
      sourceB: '站台',
      field: '轨道',
      valueA: `${beatTrack.expectedTrack}`,
      valueB: `${platform.designatedTrack}`,
      resolution: '以节拍轨为准',
      relatedNoteId: beatTrack.noteId,
    });
  }

  if (
    train.actualTrack !== beatTrack.expectedTrack &&
    platform.designatedTrack !== beatTrack.expectedTrack
  ) {
    conflicts.push({
      id: `arb_c_${beatTrack.noteId}_tp`,
      timestamp: beatTrack.expectedTime,
      sourceA: '列车',
      sourceB: '站台',
      field: '轨道',
      valueA: `${train.actualTrack}`,
      valueB: `${platform.designatedTrack}`,
      resolution: '双重冲突，以节拍轨为准',
      relatedNoteId: beatTrack.noteId,
    });
  }

  return {
    effectiveTrack: beatTrack.expectedTrack,
    effectiveTime: beatTrack.expectedTime,
    hasConflict,
    conflicts,
    basis: hasConflict
      ? `节拍轨为主，冲突已留痕(${conflicts.length}处)`
      : '三源一致，直接判定',
  };
}

export function getNoteSourceStatus(
  note: BeatNote
): { beatTrack: 'normal' | 'conflict'; train: 'normal' | 'conflict'; platform: 'normal' | 'conflict' } {
  const result = {
    beatTrack: 'normal' as 'normal' | 'conflict',
    train: 'normal' as 'normal' | 'conflict',
    platform: 'normal' as 'normal' | 'conflict',
  };

  if (note.sourceTrain.actualTrack !== note.sourceBeat.expectedTrack) {
    result.train = 'conflict';
  }
  if (note.sourcePlatform.designatedTrack !== note.sourceBeat.expectedTrack) {
    result.platform = 'conflict';
  }
  if (result.train === 'conflict' || result.platform === 'conflict') {
    result.beatTrack = 'conflict';
  }

  return result;
}
