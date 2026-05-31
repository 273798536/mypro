import type { ChordMonster, Note, ChordType, Position } from '../../types';
import { getChordNotes, isMinorKey, DIATONIC_CHORDS_MAJOR, DIATONIC_CHORDS_MINOR, NOTE_ORDER, NOTE_SEMITONE, isEnharmonic } from '../../data/musicTheory';

export function generateChordMonster(
  key: string,
  waveIndex: number,
  levelDifficulty: string,
  startPosition: Position,
  cardAccidentals: { note: Note; type: '#' | 'b' }[] = []
): ChordMonster {
  const isMinor = isMinorKey(key);
  const diatonicChords = isMinor ? DIATONIC_CHORDS_MINOR[key] : DIATONIC_CHORDS_MAJOR[key];
  
  let chord: string;
  let chordNotes: Note[];
  let intendedKey = key;
  let createMisattribution = false;
  let createAccidentalMiss = false;
  
  if (levelDifficulty === 'easy' && waveIndex >= 2 && cardAccidentals.length > 0 && Math.random() > 0.5) {
    createAccidentalMiss = true;
  }
  
  if (levelDifficulty === 'hard' && waveIndex >= 2 && Math.random() > 0.6) {
    createMisattribution = true;
  }
  
  if (createMisattribution) {
    const wrongKeys = Object.keys(isMinor ? DIATONIC_CHORDS_MINOR : DIATONIC_CHORDS_MAJOR)
      .filter(k => k !== key);
    const wrongKey = wrongKeys[Math.floor(Math.random() * wrongKeys.length)];
    const wrongChords = isMinor ? DIATONIC_CHORDS_MINOR[wrongKey] : DIATONIC_CHORDS_MAJOR[wrongKey];
    chord = wrongChords[Math.floor(Math.random() * wrongChords.length)];
    chordNotes = getChordNotes(chord) || ['C', 'E', 'G'];
    intendedKey = wrongKey;
  } else {
    chord = diatonicChords?.[Math.floor(Math.random() * diatonicChords.length)] || 'C';
    chordNotes = getChordNotes(chord) || ['C', 'E', 'G'];
  }
  
  if (createAccidentalMiss && cardAccidentals.length > 0) {
    chordNotes = chordNotes.map(note => {
      const accidentalMatch = cardAccidentals.find(a => 
        isEnharmonic(a.note, note) || 
        (a.type === '#' && isEnharmonic((a.note + '#') as Note, note)) ||
        (a.type === 'b' && isEnharmonic((a.note + 'b') as Note, note))
      );
      if (accidentalMatch) {
        return accidentalMatch.note;
      }
      return note;
    });
  }
  
  let chordType: ChordType = 'major';
  if (chord.endsWith('m')) chordType = 'minor';
  if (chord.endsWith('dim')) chordType = 'diminished';
  if (chord.endsWith('aug')) chordType = 'augmented';
  if (chord.endsWith('7')) chordType = 'seventh';
  
  const baseHp = 100;
  const hpMultiplier = 1 + (waveIndex * 0.2);
  const maxHp = Math.floor(baseHp * hpMultiplier);
  
  const baseSpeed = 0.8;
  const speedMultiplier = 1 + (waveIndex * 0.1);
  const speed = baseSpeed * speedMultiplier;
  
  if (levelDifficulty === 'medium' && Math.random() > 0.7) {
    const enharmonicEquivalent = getEnharmonicEquivalentKey(key);
    if (enharmonicEquivalent) {
      intendedKey = enharmonicEquivalent;
    }
  }
  
  return {
    id: `monster_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    chordNotes,
    chordType,
    intendedKey,
    hp: maxHp,
    maxHp,
    speed,
    pathIndex: 0,
    position: { ...startPosition },
    arrivalTime: null
  };
}

function getEnharmonicEquivalentKey(key: string): string | null {
  const enharmonicPairs: Array<[string, string]> = [
    ['C#', 'Db'], ['F#', 'Gb'], ['B', 'Cb'],
    ['C#m', 'Dbm'], ['F#m', 'Gbm'], ['Bm', 'Cm']
  ];
  
  for (const [a, b] of enharmonicPairs) {
    if (a === key) return b;
    if (b === key) return a;
  }
  
  return null;
}
