import type { ScaleCard, Note, ScaleType } from '../../types';
import { getKeySignature, getScaleNotes, getTonicFromKey, getScaleTypeFromKey, isMinorKey } from '../../data/musicTheory';

export function generateScaleCard(key: string, waveIndex: number, levelDifficulty: string): ScaleCard {
  const tonic = getTonicFromKey(key);
  const scaleType = getScaleTypeFromKey(key);
  const keySignature = getKeySignature(key);
  
  const baseNotes = getScaleNotes(tonic, scaleType);
  
  const accidentals = generateAccidentals(waveIndex, levelDifficulty, key);
  const displayNotes = applyAccidentals([...baseNotes], accidentals);
  
  return {
    id: `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    tonic,
    scaleType,
    keySignature,
    accidentals,
    displayNotes,
    intendedKey: key
  };
}

function generateAccidentals(
  waveIndex: number, 
  levelDifficulty: string, 
  key: string
): { note: Note; type: '#' | 'b' }[] {
  const accidentals: { note: Note; type: '#' | 'b' }[] = [];
  
  if (levelDifficulty === 'easy') {
    if (waveIndex >= 2 && Math.random() > 0.5) {
      const possibleNotes: Note[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
      const randomNote = possibleNotes[Math.floor(Math.random() * possibleNotes.length)];
      const type: '#' | 'b' = Math.random() > 0.5 ? '#' : 'b';
      accidentals.push({ note: randomNote, type });
    }
  } else if (levelDifficulty === 'medium') {
    const count = Math.min(2, Math.floor(waveIndex / 2) + 1);
    const possibleNotes: Note[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    for (let i = 0; i < count; i++) {
      if (Math.random() > 0.3) {
        const randomNote = possibleNotes[Math.floor(Math.random() * possibleNotes.length)];
        const type: '#' | 'b' = isMinorKey(key) ? (Math.random() > 0.5 ? '#' : 'b') : '#';
        accidentals.push({ note: randomNote, type });
      }
    }
  } else {
    const count = Math.min(3, Math.floor(waveIndex / 2) + 1);
    const possibleNotes: Note[] = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
    for (let i = 0; i < count; i++) {
      if (Math.random() > 0.2) {
        const randomNote = possibleNotes[Math.floor(Math.random() * possibleNotes.length)];
        const type: '#' | 'b' = Math.random() > 0.5 ? '#' : 'b';
        accidentals.push({ note: randomNote, type });
      }
    }
  }
  
  return accidentals;
}

function applyAccidentals(notes: Note[], accidentals: { note: Note; type: '#' | 'b' }[]): Note[] {
  return notes.map(note => {
    const accidental = accidentals.find(a => a.note === note);
    if (accidental) {
      if (accidental.type === '#' && !note.includes('#')) {
        return (note + '#') as Note;
      } else if (accidental.type === 'b' && !note.includes('b')) {
        return (note + 'b') as Note;
      }
    }
    return note;
  });
}
