
import {
  VoiceState,
  GestureType,
  VoicePart,
  ErrorEvent,
  DecisionStep,
  VOICE_PARTS,
  ERROR_TYPES,
} from '../types';

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export function initializeVoiceStates(): VoiceState[] {
  return VOICE_PARTS.map((vp) => ({
    part: vp.part,
    name: vp.name,
    volume: 50 + Math.random() * 30,
    rhythmOffset: (Math.random() - 0.5) * 40,
    syncLevel: 60 + Math.random() * 20,
  }));
}

export function calculateVariance(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
  const squaredDiffs = numbers.map((n) => Math.pow(n - mean, 2));
  return squaredDiffs.reduce((a, b) => a + b, 0) / numbers.length;
}

export function calculateVolumeDeviation(voices: VoiceState[]): number {
  const volumes = voices.map((v) => v.volume);
  const mean = volumes.reduce((a, b) => a + b, 0) / volumes.length;
  return volumes.reduce((acc, v) => acc + Math.abs(v - mean), 0) / volumes.length;
}

export function calculateSyncLevel(voices: VoiceState[]): number {
  const rhythmOffsets = voices.map((v) => v.rhythmOffset);
  const variance = calculateVariance(rhythmOffsets);
  const volumeDeviation = calculateVolumeDeviation(voices);
  return Math.max(0, 100 - variance * 2 - volumeDeviation * 0.5);
}

export function applyGesture(
  voices: VoiceState[],
  gesture: GestureType,
  target: VoicePart | 'all'
): VoiceState[] {
  return voices.map((voice) => {
    const shouldApply = target === 'all' || voice.part === target;
    if (!shouldApply) return voice;

    let newVolume = voice.volume;
    let newRhythmOffset = voice.rhythmOffset;
    let newSyncLevel = voice.syncLevel;

    switch (gesture) {
      case 'volume_up':
        newVolume = Math.min(100, voice.volume + 15);
        break;
      case 'volume_down':
        newVolume = Math.max(0, voice.volume - 15);
        break;
      case 'emphasize':
        newVolume = Math.min(100, voice.volume + 10);
        newSyncLevel = Math.min(100, voice.syncLevel + 10);
        break;
      case 'sync':
        newRhythmOffset = voice.rhythmOffset * 0.5;
        newSyncLevel = Math.min(100, voice.syncLevel + 15);
        break;
      case 'rest':
        newVolume = Math.max(0, voice.volume - 25);
        break;
      case 'hold':
        break;
    }

    return {
      ...voice,
      volume: newVolume,
      rhythmOffset: newRhythmOffset,
      syncLevel: newSyncLevel,
    };
  });
}

export function addRandomNoise(voices: VoiceState[]): VoiceState[] {
  return voices.map((voice) => ({
    ...voice,
    volume: Math.max(0, Math.min(100, voice.volume + (Math.random() - 0.5) * 10)),
    rhythmOffset: Math.max(-50, Math.min(50, voice.rhythmOffset + (Math.random() - 0.5) * 10)),
    syncLevel: Math.max(0, Math.min(100, voice.syncLevel + (Math.random() - 0.5) * 5)),
  }));
}

export function detectErrors(voices: VoiceState[], round: number): ErrorEvent[] {
  const errors: ErrorEvent[] = [];
  const avgVolume = voices.reduce((a, b) => a + b.volume, 0) / voices.length;

  voices.forEach((voice) => {
    if (Math.abs(voice.rhythmOffset) > 30 && Math.random() > 0.5) {
      errors.push({
        id: generateId(),
        type: 'delayed_entry',
        voicePart: voice.part,
        round,
        description: `${voice.name}声部进入时机偏差${Math.abs(voice.rhythmOffset).toFixed(1)}单位`,
        severity: Math.abs(voice.rhythmOffset) > 40 ? 'high' : 'medium',
        pointsLost: Math.abs(voice.rhythmOffset) > 40 ? 8 : 4,
      });
    }

    if (Math.abs(voice.volume - avgVolume) > 25 && Math.random() > 0.6) {
      errors.push({
        id: generateId(),
        type: 'volume_imbalance',
        voicePart: voice.part,
        round,
        description: `${voice.name}声部音量${voice.volume.toFixed(0)}与平均值偏差${Math.abs(voice.volume - avgVolume).toFixed(1)}`,
        severity: Math.abs(voice.volume - avgVolume) > 35 ? 'high' : 'medium',
        pointsLost: Math.abs(voice.volume - avgVolume) > 35 ? 6 : 3,
      });
    }

    if (voice.volume < 15 && Math.random() > 0.7) {
      errors.push({
        id: generateId(),
        type: 'rest_misjudgment',
        voicePart: voice.part,
        round,
        description: `${voice.name}声部音量过低，可能误判了休止符`,
        severity: voice.volume < 10 ? 'high' : 'low',
        pointsLost: voice.volume < 10 ? 5 : 2,
      });
    }
  });

  return errors;
}

export function calculateScoreImpact(
  gesture: GestureType,
  target: VoicePart | 'all',
  voices: VoiceState[]
): { impact: number; description: string; triggeredSync: boolean } {
  const beforeSync = calculateSyncLevel(voices);
  const afterVoices = applyGesture(voices, gesture, target);
  const afterSync = calculateSyncLevel(afterVoices);
  const syncChange = afterSync - beforeSync;

  const gestureScores: Record<GestureType, number> = {
    volume_up: 1,
    volume_down: 1,
    emphasize: 2,
    sync: 3,
    rest: 0,
    hold: 1,
  };

  const baseScore = gestureScores[gesture];
  const syncBonus = syncChange > 5 ? Math.floor(syncChange / 5) : 0;
  const triggeredSync = syncChange > 10;

  const totalImpact = baseScore + syncBonus;
  const descriptions: Record<GestureType, string> = {
    volume_up: '提高音量',
    volume_down: '降低音量',
    emphasize: '强调声部',
    sync: '同步节奏',
    rest: '指示休止',
    hold: '保持稳定',
  };

  const targetName = target === 'all' ? '全体' : VOICE_PARTS.find((v) => v.part === target)?.name || target;
  let description = `${descriptions[gesture]} - ${targetName}`;
  
  if (triggeredSync) {
    description += ' ✨ 触发声部同步';
  } else if (syncBonus > 0) {
    description += ` (同步度+${syncChange.toFixed(1)})`;
  }

  return {
    impact: totalImpact,
    description,
    triggeredSync,
  };
}

export function createDecisionStep(
  round: number,
  gesture: GestureType,
  target: VoicePart | 'all',
  voices: VoiceState[]
): DecisionStep {
  const { impact, description, triggeredSync } = calculateScoreImpact(gesture, target, voices);
  return {
    id: generateId(),
    round,
    gesture,
    targetVoice: target,
    scoreImpact: impact,
    description,
    timestamp: Date.now(),
    triggeredSync,
  };
}

export function calculateFinalScore(
  baseScore: number,
  syncLevel: number,
  errors: ErrorEvent[],
  decisions: DecisionStep[]
): number {
  let score = baseScore + syncLevel * 0.5;
  errors.forEach((e) => (score -= e.pointsLost));
  decisions.forEach((d) => (score += d.scoreImpact));
  return Math.max(0, Math.min(100, score));
}

export function calculateGrade(score: number): 'S' | 'A' | 'B' | 'C' | 'D' {
  if (score >= 90) return 'S';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  return 'D';
}

export function getErrorTypeName(type: string): string {
  const found = ERROR_TYPES.find((e) => e.type === type);
  return found?.name || type;
}

export function getVoicePartName(part: string): string {
  const found = VOICE_PARTS.find((v) => v.part === part);
  return found?.name || part;
}

