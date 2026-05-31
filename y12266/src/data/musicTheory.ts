import type { Note, ScaleType } from '../types';

export const NOTE_ORDER: Note[] = ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'E#', 'F', 'F#', 'F##', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'C##', 'Bb', 'Bbb', 'B', 'B#', 'Cb', 'Fb'];

export const NOTE_SEMITONE: Record<Note, number> = {
  'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'E#': 5,
  'F': 5, 'F#': 6, 'F##': 7, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9,
  'A#': 10, 'C##': 10, 'Bb': 10, 'Bbb': 9, 'B': 11, 'B#': 0, 'Cb': 11, 'Fb': 4
};

export const SCALE_INTERVALS: Record<ScaleType, number[]> = {
  major: [2, 2, 1, 2, 2, 2, 1],
  natural_minor: [2, 1, 2, 2, 1, 2, 2],
  harmonic_minor: [2, 1, 2, 2, 1, 3, 1],
  melodic_minor: [2, 1, 2, 2, 2, 2, 1]
};

export const KEY_SIGNATURES: Record<string, Note[]> = {
  'C': [],
  'G': ['F#'],
  'D': ['F#', 'C#'],
  'A': ['F#', 'C#', 'G#'],
  'E': ['F#', 'C#', 'G#', 'D#'],
  'B': ['F#', 'C#', 'G#', 'D#', 'A#'],
  'F#': ['F#', 'C#', 'G#', 'D#', 'A#', 'E#'],
  'C#': ['F#', 'C#', 'G#', 'D#', 'A#', 'E#', 'B#'],
  'F': ['Bb'],
  'Bb': ['Bb', 'Eb'],
  'Eb': ['Bb', 'Eb', 'Ab'],
  'Ab': ['Bb', 'Eb', 'Ab', 'Db'],
  'Db': ['Bb', 'Eb', 'Ab', 'Db', 'Gb'],
  'Gb': ['Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'],
  'Cb': ['Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb', 'Fb'],
  'Am': [],
  'Em': ['F#'],
  'Bm': ['F#', 'C#'],
  'F#m': ['F#', 'C#', 'G#'],
  'C#m': ['F#', 'C#', 'G#', 'D#'],
  'G#m': ['F#', 'C#', 'G#', 'D#', 'A#'],
  'D#m': ['F#', 'C#', 'G#', 'D#', 'A#', 'E#'],
  'A#m': ['F#', 'C#', 'G#', 'D#', 'A#', 'E#', 'B#'],
  'Dm': ['Bb'],
  'Gm': ['Bb', 'Eb'],
  'Cm': ['Bb', 'Eb', 'Ab'],
  'Fm': ['Bb', 'Eb', 'Ab', 'Db'],
  'Bbm': ['Bb', 'Eb', 'Ab', 'Db', 'Gb'],
  'Ebm': ['Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'],
  'Abm': ['Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb', 'Fb']
};

export const ENHARMONIC_EQUIVALENTS: Record<string, string[]> = {
  'C#': ['Db'],
  'Db': ['C#'],
  'D#': ['Eb'],
  'Eb': ['D#'],
  'F#': ['Gb'],
  'Gb': ['F#'],
  'G#': ['Ab'],
  'Ab': ['G#'],
  'A#': ['Bb'],
  'Bb': ['A#'],
  'B': ['Cb'],
  'Cb': ['B'],
  'E': ['Fb'],
  'Fb': ['E'],
  'C': ['B#'],
  'B#': ['C'],
  'F': ['E#'],
  'E#': ['F'],
  'F##': ['G'],
  'G': ['F##'],
  'C##': ['D'],
  'D': ['C##'],
  'Bbb': ['A'],
  'A': ['Bbb']
};

export const KEY_ENHARMONIC_PAIRS: Array<[string, string]> = [
  ['C#', 'Db'], ['F#', 'Gb'], ['B', 'Cb'],
  ['C#m', 'Dbm'], ['F#m', 'Gbm'], ['Bm', 'Cm']
];

export const MAJOR_CHORD: Record<string, Note[]> = {
  'C': ['C', 'E', 'G'],
  'C#': ['C#', 'E#', 'G#'],
  'Db': ['Db', 'F', 'Ab'],
  'D': ['D', 'F#', 'A'],
  'D#': ['D#', 'F##', 'A#'],
  'Eb': ['Eb', 'G', 'Bb'],
  'E': ['E', 'G#', 'B'],
  'F': ['F', 'A', 'C'],
  'F#': ['F#', 'A#', 'C#'],
  'Gb': ['Gb', 'Bb', 'Db'],
  'G': ['G', 'B', 'D'],
  'G#': ['G#', 'B#', 'D#'],
  'Ab': ['Ab', 'C', 'Eb'],
  'A': ['A', 'C#', 'E'],
  'A#': ['A#', 'C##', 'F'],
  'Bb': ['Bb', 'D', 'F'],
  'B': ['B', 'D#', 'F#']
};

export const MINOR_CHORD: Record<string, Note[]> = {
  'Cm': ['C', 'Eb', 'G'],
  'C#m': ['C#', 'E', 'G#'],
  'Dbm': ['Db', 'Fb', 'Ab'],
  'Dm': ['D', 'F', 'A'],
  'D#m': ['D#', 'F#', 'A#'],
  'Ebm': ['Eb', 'Gb', 'Bb'],
  'Em': ['E', 'G', 'B'],
  'Fm': ['F', 'Ab', 'C'],
  'F#m': ['F#', 'A', 'C#'],
  'Gbm': ['Gb', 'Bbb', 'Db'],
  'Gm': ['G', 'Bb', 'D'],
  'G#m': ['G#', 'B', 'D#'],
  'Abm': ['Ab', 'B', 'Eb'],
  'Am': ['A', 'C', 'E'],
  'A#m': ['A#', 'C#', 'F'],
  'Bbm': ['Bb', 'Db', 'F'],
  'Bm': ['B', 'D', 'F#']
};

export const DIATONIC_CHORDS_MAJOR: Record<string, string[]> = {
  'C': ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim'],
  'G': ['G', 'Am', 'Bm', 'C', 'D', 'Em', 'F#dim'],
  'D': ['D', 'Em', 'F#m', 'G', 'A', 'Bm', 'C#dim'],
  'A': ['A', 'Bm', 'C#m', 'D', 'E', 'F#m', 'G#dim'],
  'E': ['E', 'F#m', 'G#m', 'A', 'B', 'C#m', 'D#dim'],
  'B': ['B', 'C#m', 'D#m', 'E', 'F#', 'G#m', 'A#dim'],
  'F#': ['F#', 'G#m', 'A#m', 'B', 'C#', 'D#m', 'E#dim'],
  'F': ['F', 'Gm', 'Am', 'Bb', 'C', 'Dm', 'Edim'],
  'Bb': ['Bb', 'Cm', 'Dm', 'Eb', 'F', 'Gm', 'Adim'],
  'Eb': ['Eb', 'Fm', 'Gm', 'Ab', 'Bb', 'Cm', 'Ddim'],
  'Ab': ['Ab', 'Bbm', 'Cm', 'Db', 'Eb', 'Fm', 'Gdim'],
  'Db': ['Db', 'Ebm', 'Fm', 'Gb', 'Ab', 'Bbm', 'Cdim'],
  'Gb': ['Gb', 'Abm', 'Bbm', 'B', 'Db', 'Ebm', 'Fdim'],
  'Cb': ['Cb', 'Dbm', 'Ebm', 'Fb', 'Gb', 'Abm', 'Bbdim']
};

export const DIATONIC_CHORDS_MINOR: Record<string, string[]> = {
  'Am': ['Am', 'Bdim', 'C', 'Dm', 'Em', 'F', 'G'],
  'Em': ['Em', 'F#dim', 'G', 'Am', 'Bm', 'C', 'D'],
  'Bm': ['Bm', 'C#dim', 'D', 'Em', 'F#m', 'G', 'A'],
  'F#m': ['F#m', 'G#dim', 'A', 'Bm', 'C#m', 'D', 'E'],
  'C#m': ['C#m', 'D#dim', 'E', 'F#m', 'G#m', 'A', 'B'],
  'G#m': ['G#m', 'A#dim', 'B', 'C#m', 'D#m', 'E', 'F#'],
  'D#m': ['D#m', 'E#dim', 'F#', 'G#m', 'A#m', 'B', 'C#'],
  'Dm': ['Dm', 'Edim', 'F', 'Gm', 'Am', 'Bb', 'C'],
  'Gm': ['Gm', 'Adim', 'Bb', 'Cm', 'Dm', 'Eb', 'F'],
  'Cm': ['Cm', 'Ddim', 'Eb', 'Fm', 'Gm', 'Ab', 'Bb'],
  'Fm': ['Fm', 'Gdim', 'Ab', 'Bbm', 'Cm', 'Db', 'Eb'],
  'Bbm': ['Bbm', 'Cdim', 'Db', 'Ebm', 'Fm', 'Gb', 'Ab'],
  'Ebm': ['Ebm', 'Fdim', 'Gb', 'Abm', 'Bbm', 'B', 'Db'],
  'Abm': ['Abm', 'Bbdim', 'B', 'Dbm', 'Ebm', 'E', 'Gb']
};

export const SCALE_NAMES: Record<ScaleType, string> = {
  major: '大调',
  natural_minor: '自然小调',
  harmonic_minor: '和声小调',
  melodic_minor: '旋律小调'
};

export const ERROR_TYPE_NAMES: Record<string, string> = {
  accidental_miss: '升降号漏判',
  enharmonic_confusion: '同名调混淆',
  chord_misattribution: '和弦归属错',
  tower_late: '调式塔晚到'
};

export function getScaleNotes(tonic: Note, scaleType: ScaleType): Note[] {
  const intervals = SCALE_INTERVALS[scaleType];
  const startIndex = NOTE_SEMITONE[tonic];
  const notes: Note[] = [tonic];
  
  let currentIndex = startIndex;
  for (const interval of intervals) {
    currentIndex = (currentIndex + interval) % 12;
    const note = NOTE_ORDER.find(n => NOTE_SEMITONE[n] === currentIndex);
    if (note) notes.push(note);
  }
  
  return notes;
}

export function getKeySignature(key: string): Note[] {
  return KEY_SIGNATURES[key] || [];
}

export function isEnharmonic(note1: string, note2: string): boolean {
  if (note1 === note2) return true;
  return ENHARMONIC_EQUIVALENTS[note1]?.includes(note2) || false;
}

export function isEnharmonicKey(key1: string, key2: string): boolean {
  if (key1 === key2) return true;
  return KEY_ENHARMONIC_PAIRS.some(([a, b]) => 
    (a === key1 && b === key2) || (a === key2 && b === key1)
  );
}

export function getChordNotes(chord: string): Note[] {
  return MAJOR_CHORD[chord] || MINOR_CHORD[chord] || [];
}

export function isChordInKey(chordNotes: Note[], key: string): boolean {
  const scaleNotes = isMinorKey(key) 
    ? DIATONIC_CHORDS_MINOR[key]?.flatMap(c => getChordNotes(c)) || []
    : DIATONIC_CHORDS_MAJOR[key]?.flatMap(c => getChordNotes(c)) || [];
  
  return chordNotes.every(note => 
    scaleNotes.some(scaleNote => isEnharmonic(note, scaleNote))
  );
}

export function isMinorKey(key: string): boolean {
  return key.endsWith('m');
}

export function getTonicFromKey(key: string): Note {
  const tonic = isMinorKey(key) ? key.slice(0, -1) : key;
  return tonic as Note;
}

export function getScaleTypeFromKey(key: string): ScaleType {
  return isMinorKey(key) ? 'natural_minor' : 'major';
}
