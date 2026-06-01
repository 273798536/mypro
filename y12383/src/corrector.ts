import { SoloAnalysis, Chord, HistoryEntry } from './types';
import { generateId, parseChordProgression } from './analyzer';

export function formatChordsForDisplay(chords: Chord[]): string {
  const bars: { [key: number]: string[] } = {};
  chords.forEach(chord => {
    if (!bars[chord.bar]) bars[chord.bar] = [];
    bars[chord.bar].push(chord.name);
  });
  
  const maxBar = Math.max(...Object.keys(bars).map(Number));
  const result: string[] = [];
  for (let i = 1; i <= maxBar; i++) {
    if (bars[i]) {
      result.push(`[${i}] ${bars[i].join(' ')}`);
    }
  }
  return result.join(' | ');
}

export function createSideBySideComparison(
  oldChords: Chord[],
  newChords: Chord[],
  width = 40
): string {
  const oldStr = formatChordsForDisplay(oldChords);
  const newStr = formatChordsForDisplay(newChords);
  
  const oldLines = oldStr.split(' | ');
  const newLines = newStr.split(' | ');
  const maxLines = Math.max(oldLines.length, newLines.length);
  
  let output = '\n';
  output += '┌' + '─'.repeat(width) + '┬' + '─'.repeat(width) + '┐\n';
  output += '│' + ' 旧和弦进行'.padEnd(width - 1) + '│' + ' 新和弦进行'.padEnd(width - 1) + '│\n';
  output += '├' + '─'.repeat(width) + '┼' + '─'.repeat(width) + '┤\n';
  
  for (let i = 0; i < maxLines; i++) {
    const oldLine = oldLines[i] || '';
    const newLine = newLines[i] || '';
    const changed = oldLine !== newLine;
    const marker = changed ? '*' : ' ';
    
    output += '│' + marker + ' ' + oldLine.padEnd(width - 3) + '│' + marker + ' ' + newLine.padEnd(width - 3) + '│\n';
  }
  
  output += '└' + '─'.repeat(width) + '┴' + '─'.repeat(width) + '┘\n';
  output += '\n* = 有变更的行\n';
  
  return output;
}

export function updateChordProgression(
  analysis: SoloAnalysis,
  newProgressionStr: string,
  author: string
): SoloAnalysis {
  const newChords = parseChordProgression(newProgressionStr);
  const oldChords = [...analysis.chordProgression];
  
  const updated: SoloAnalysis = {
    ...analysis,
    chordProgression: newChords,
    status: 'corrected',
    history: [
      ...analysis.history,
      {
        id: generateId(),
        timestamp: new Date().toISOString(),
        action: 'corrected',
        author,
        description: '手动修正和弦进行',
        chordProgression: oldChords,
      },
    ],
  };
  
  return updated;
}

export function updateNotes(
  analysis: SoloAnalysis,
  newNotes: string,
  author: string
): SoloAnalysis {
  const updated: SoloAnalysis = {
    ...analysis,
    notes: newNotes,
    history: [
      ...analysis.history,
      {
        id: generateId(),
        timestamp: new Date().toISOString(),
        action: 'noted',
        author,
        description: '更新备注',
      },
    ],
  };
  
  return updated;
}

export function updateMetaData(
  analysis: SoloAnalysis,
  updates: { artist?: string; dateRecorded?: string; title?: string },
  author: string
): SoloAnalysis {
  const updated: SoloAnalysis = {
    ...analysis,
    ...updates,
    hasMissingFields: !(updates.artist && updates.dateRecorded),
    history: [
      ...analysis.history,
      {
        id: generateId(),
        timestamp: new Date().toISOString(),
        action: 'corrected',
        author,
        description: '更新元数据',
      },
    ],
  };
  
  return updated;
}

export function markAsReviewed(
  analysis: SoloAnalysis,
  author: string
): SoloAnalysis {
  return {
    ...analysis,
    status: 'reviewed',
    history: [
      ...analysis.history,
      {
        id: generateId(),
        timestamp: new Date().toISOString(),
        action: 'corrected',
        author,
        description: '标记为已审核',
      },
    ],
  };
}

export function getChordHistory(analysis: SoloAnalysis): { version: number; timestamp: string; author: string; chords: Chord[] }[] {
  const history: { version: number; timestamp: string; author: string; chords: Chord[] }[] = [];
  let version = 1;
  
  analysis.history.forEach(entry => {
    if (entry.chordProgression) {
      history.push({
        version,
        timestamp: entry.timestamp,
        author: entry.author,
        chords: entry.chordProgression,
      });
      version++;
    }
  });
  
  history.push({
    version,
    timestamp: analysis.dateAnalyzed,
    author: 'current',
    chords: analysis.chordProgression,
  });
  
  return history;
}
