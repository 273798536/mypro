import type { ScaleCard, ChordMonster, ModeTower, TimingRecord, JudgmentResult, ErrorType, Note } from '../../types';
import { isEnharmonicKey, isChordInKey, isEnharmonic, getKeySignature, ERROR_TYPE_NAMES, getScaleNotes, getTonicFromKey } from '../../data/musicTheory';

const PRIORITY = {
  card: 3,
  monster: 2,
  tower: 1,
};

export function extractAnswer(record: TimingRecord): string {
  if (record.source === 'card') {
    return (record.data as ScaleCard).intendedKey;
  } else if (record.source === 'monster') {
    return (record.data as ChordMonster).intendedKey;
  } else {
    const tower = record.data as ModeTower;
    return tower.type === 'major' ? 'C' : tower.type === 'minor' ? 'Am' : 'modal';
  }
}

export function extractTowerAnswer(tower: ModeTower, card: ScaleCard): string {
  const characteristicNotes = tower.characteristicNotes;
  const cardNotes = card.displayNotes;
  
  const matches = characteristicNotes.filter(cn => 
    cardNotes.some(n => isEnharmonic(n, cn))
  ).length;
  
  if (tower.type === 'major') {
    if (matches >= 2) return card.intendedKey;
    if (card.keySignature.length === 0) return 'C';
    if (card.keySignature.includes('F#')) return 'G';
    if (card.keySignature.includes('Bb')) return 'F';
  } else if (tower.type === 'minor') {
    if (matches >= 2) return card.intendedKey;
    if (card.keySignature.length === 0) return 'Am';
    if (card.keySignature.includes('F#')) return 'Em';
    if (card.keySignature.includes('Bb')) return 'Dm';
  }
  
  return card.intendedKey;
}

export function resolveConflict(records: TimingRecord[]): { result: string; conflicts: string[] } {
  const sortedByPriority = [...records].sort(
    (a, b) => PRIORITY[b.source] - PRIORITY[a.source]
  );
  
  const answers = records.map(r => ({
    source: r.source,
    answer: extractAnswer(r),
    priority: PRIORITY[r.source],
  }));
  
  const uniqueAnswers = [...new Set(answers.map(a => a.answer))];
  const conflicts: string[] = [];
  
  if (uniqueAnswers.length > 1) {
    const primary = answers[0];
    answers.forEach(a => {
      if (a.answer !== primary.answer) {
        conflicts.push(
          `冲突: ${a.source}判定为${a.answer}，但${primary.source}判定为${primary.answer}`
        );
      }
    });
  }
  
  return {
    result: sortedByPriority[0] ? extractAnswer(sortedByPriority[0]) : '',
    conflicts,
  };
}

export function detectErrorType(
  card: ScaleCard,
  monster: ChordMonster,
  tower: ModeTower | null,
  timing: TimingRecord[]
): ErrorType[] {
  const errors: ErrorType[] = [];
  const monsterTiming = timing.find(t => t.source === 'monster');
  const towerTiming = timing.find(t => t.source === 'tower');
  
  const hasAccidentalMiss = detectAccidentalMiss(card, monster);
  if (hasAccidentalMiss) {
    errors.push('accidental_miss');
  }
  
  const hasEnharmonicConfusion = detectEnharmonicConfusion(card, monster);
  if (hasEnharmonicConfusion) {
    errors.push('enharmonic_confusion');
  }
  
  const hasChordMisattribution = detectChordMisattribution(card, monster);
  if (hasChordMisattribution) {
    errors.push('chord_misattribution');
  }
  
  const hasTowerLate = detectTowerLate(towerTiming, monsterTiming);
  if (hasTowerLate) {
    errors.push('tower_late');
  }
  
  return errors;
}

export function detectAccidentalMiss(card: ScaleCard, monster: ChordMonster): boolean {
  if (card.accidentals.length === 0) return false;
  
  const alteredNotes: Note[] = card.accidentals.map(a => {
    if (a.type === '#' && !a.note.includes('#')) {
      return (a.note + '#') as Note;
    } else if (a.type === 'b' && !a.note.includes('b')) {
      return (a.note + 'b') as Note;
    }
    return a.note;
  });
  
  const alteredNotesInMonster = alteredNotes.filter(alteredNote =>
    monster.chordNotes.some(n => isEnharmonic(n, alteredNote))
  );
  
  return alteredNotesInMonster.length < alteredNotes.length;
}

export function detectEnharmonicConfusion(card: ScaleCard, monster: ChordMonster): boolean {
  return isEnharmonicKey(card.intendedKey, monster.intendedKey);
}

export function detectChordMisattribution(card: ScaleCard, monster: ChordMonster): boolean {
  return !isChordInKey(monster.chordNotes, card.intendedKey);
}

export function detectTowerLate(
  towerTiming: TimingRecord | undefined,
  monsterTiming: TimingRecord | undefined
): boolean {
  if (!towerTiming || !monsterTiming) return false;
  return towerTiming.timestamp > monsterTiming.timestamp + 1000;
}

export function generateExplanation(
  card: ScaleCard,
  monster: ChordMonster,
  tower: ModeTower | null,
  errors: ErrorType[],
  timing: TimingRecord[],
  correctAnswer: string,
  userAnswer: string
): string {
  const explanations: string[] = [];
  
  if (errors.includes('accidental_miss')) {
    const missingAccidentals = card.accidentals
      .map(a => `${a.note}${a.type}`)
      .join(', ');
    explanations.push(`升降号漏判: 音阶卡显示临时升降号 ${missingAccidentals}，但和弦怪的和弦音(${monster.chordNotes.join(', ')})中没有包含这些升降音`);
  }
  
  if (errors.includes('enharmonic_confusion')) {
    explanations.push(`同名调混淆: 容易混淆 ${card.intendedKey} 和 ${monster.intendedKey}，它们是等音调但记谱不同`);
  }
  
  if (errors.includes('chord_misattribution')) {
    explanations.push(`和弦归属错: 和弦 ${monster.chordNotes.join('-')} 不属于 ${card.intendedKey} 调`);
  }
  
  if (errors.includes('tower_late')) {
    const towerTiming = timing.find(t => t.source === 'tower');
    const monsterTiming = timing.find(t => t.source === 'monster');
    if (towerTiming && monsterTiming) {
      const delay = towerTiming.timestamp - monsterTiming.timestamp;
      explanations.push(`调式塔晚到: 调式塔攻击时间比和弦怪到达时间晚 ${delay}ms`);
    }
  }
  
  if (explanations.length === 0) {
    explanations.push(`正确判定: ${correctAnswer} 调，音阶为 ${card.displayNotes.join(' - ')}`);
  }
  
  const timingInfo = timing
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((t, i) => `${i + 1}. ${t.source}(${t.timestamp}ms)`)
    .join(' → ');
  
  explanations.push(`判定时序: ${timingInfo}`);
  
  return explanations.join('；');
}

export function performJudgment(
  card: ScaleCard,
  monster: ChordMonster,
  tower: ModeTower | null,
  timingRecords: TimingRecord[]
): JudgmentResult {
  const relevantTiming = timingRecords.filter(t => 
    t.id === card.id || t.id === monster.id || (tower && t.id === tower.id)
  );
  
  const towerAnswer = tower ? extractTowerAnswer(tower, card) : card.intendedKey;
  const towerTiming: TimingRecord | null = tower ? {
    source: 'tower',
    id: tower.id,
    timestamp: tower.attackTime || Date.now(),
    data: { ...tower, modeName: towerAnswer } as any
  } : null;
  
  const allRecords = [...relevantTiming];
  if (towerTiming) allRecords.push(towerTiming);
  
  const { result, conflicts } = resolveConflict(allRecords);
  const errors = detectErrorType(card, monster, tower, allRecords);
  const isCorrect = errors.length === 0 && conflicts.length === 0;
  
  const correctAnswer = card.intendedKey;
  const userAnswer = conflicts.length > 0 ? result : (isCorrect ? correctAnswer : monster.intendedKey);
  
  const explanation = generateExplanation(
    card, monster, tower, errors, allRecords, correctAnswer, userAnswer
  );
  
  return {
    id: `judge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    isCorrect,
    errorTypes: errors,
    conflictDetected: conflicts.length > 0,
    conflictDetails: conflicts,
    timingSequence: allRecords.sort((a, b) => a.timestamp - b.timestamp),
    correctAnswer,
    userAnswer,
    explanation,
    cardData: card,
    monsterData: monster,
    towerData: tower
  };
}
