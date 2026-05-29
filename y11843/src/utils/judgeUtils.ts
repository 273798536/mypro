import { JudgeResult, JudgeRecord, VolumeRecord, GameResult, Note, VoicePart } from '../types';

export const PERFECT_WINDOW = 50;
export const GOOD_WINDOW = 150;

export function judgeTiming(actualTime: number, expectedTime: number): JudgeResult {
  const offset = actualTime - expectedTime;
  const absOffset = Math.abs(offset);
  
  if (absOffset <= PERFECT_WINDOW) return 'perfect';
  if (absOffset <= GOOD_WINDOW) return offset < 0 ? 'early' : 'late';
  return 'missed';
}

export function calculateScore(result: JudgeResult, offset: number): number {
  switch (result) {
    case 'perfect':
      return 100;
    case 'early':
    case 'late':
      return Math.max(60, 100 - Math.abs(offset));
    case 'missed':
      return 0;
    default:
      return 0;
  }
}

export function checkVolumeBalance(
  partVolume: number,
  isMainPart: boolean,
  mainVolume: number
): { isBalanced: boolean; isOverpowering: boolean } {
  const mainTargetMin = 70;
  const mainTargetMax = 85;
  const harmonyTargetMin = 50;
  const harmonyTargetMax = 70;
  
  if (isMainPart) {
    return {
      isBalanced: partVolume >= mainTargetMin && partVolume <= mainTargetMax,
      isOverpowering: false
    };
  }
  
  const isOverpowering = partVolume > mainVolume * 1.2;
  const isBalanced = partVolume >= harmonyTargetMin && partVolume <= harmonyTargetMax && !isOverpowering;
  
  return { isBalanced, isOverpowering };
}

export function calculateGameResult(
  judgeRecords: JudgeRecord[],
  volumeRecords: VolumeRecord[]
): GameResult {
  let totalScore = 0;
  let perfectCount = 0;
  let earlyCount = 0;
  let lateCount = 0;
  let missedCount = 0;
  let overpowerCount = 0;
  
  judgeRecords.forEach(record => {
    totalScore += calculateScore(record.result, record.offset);
    switch (record.result) {
      case 'perfect': perfectCount++; break;
      case 'early': earlyCount++; break;
      case 'late': lateCount++; break;
      case 'missed': missedCount++; break;
    }
  });
  
  volumeRecords.forEach(record => {
    if (record.isOverpowering) overpowerCount++;
  });
  
  const totalNotes = judgeRecords.length;
  const accuracy = totalNotes > 0 ? Math.round(((perfectCount + earlyCount + lateCount) / totalNotes) * 100) : 0;
  
  return {
    totalScore: Math.round(totalScore),
    accuracy,
    perfectCount,
    earlyCount,
    lateCount,
    missedCount,
    overpowerCount,
    judgeRecords,
    volumeRecords,
  };
}

export function getJudgeResultColor(result: JudgeResult): string {
  switch (result) {
    case 'perfect': return '#fbbf24';
    case 'early': return '#f87171';
    case 'late': return '#fbbf24';
    case 'missed': return '#6b7280';
    default: return '#6b7280';
  }
}

export function getJudgeResultLabel(result: JudgeResult): string {
  switch (result) {
    case 'perfect': return '完美!';
    case 'early': return '抢拍';
    case 'late': return '延迟';
    case 'missed': return '错过';
    default: return '';
  }
}

export function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const milliseconds = Math.floor((ms % 1000) / 10);
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
}

export function getMissedNotes(
  notes: Note[],
  currentTime: number,
  judgedNoteIds: Set<string>
): Note[] {
  return notes.filter(note => {
    if (judgedNoteIds.has(note.id)) return false;
    return currentTime - note.time > GOOD_WINDOW;
  });
}
