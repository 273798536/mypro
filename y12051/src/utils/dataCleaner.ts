import { Note, Track } from '../types';

export function cleanNoteData(note: Partial<Note>): Note {
  const cleanedNote: Note = {
    id: note.id || `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    time: note.time ?? 0,
    type: note.type || 'normal',
    track: note.track ?? 1,
    isSyncopated: note.isSyncopated ?? false,
    ...note
  };

  if (note.delayed && note.delayAmount) {
    cleanedNote.time += note.delayAmount;
  }

  return cleanedNote;
}

export function cleanTrackData(track: Partial<Track>): Track {
  return {
    id: track.id || `track-${Date.now()}`,
    name: track.name || '未命名曲目',
    bpm: track.bpm ?? 120,
    difficulty: track.difficulty ?? 3,
    notes: (track.notes || []).map(note => cleanNoteData(note)),
    hasDirtyData: track.hasDirtyData ?? false,
    description: track.description
  };
}

export function hasDirtyDataNotes(notes: Note[]): boolean {
  return notes.some(note => 
    note.missingField || 
    note.delayed || 
    note.remark !== undefined
  );
}

export function validateNote(note: Note): string[] {
  const errors: string[] = [];
  
  if (note.time < 0) {
    errors.push('时间不能为负数');
  }
  if (note.track < 1 || note.track > 4) {
    errors.push('轨道编号必须在1-4之间');
  }
  
  return errors;
}

export function validateTrack(track: Track): string[] {
  const errors: string[] = [];
  
  if (!track.name.trim()) {
    errors.push('曲目名称不能为空');
  }
  if (track.bpm < 40 || track.bpm > 240) {
    errors.push('BPM应在40-240之间');
  }
  if (track.notes.length === 0) {
    errors.push('曲目至少包含一个音符');
  }
  
  track.notes.forEach((note, index) => {
    const noteErrors = validateNote(note);
    noteErrors.forEach(err => {
      errors.push(`音符${index + 1}: ${err}`);
    });
  });
  
  return errors;
}
