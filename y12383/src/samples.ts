import { SoloAnalysis, BeatDrift, Chord, HistoryEntry } from './types';
import { generateId, parseChordProgression } from './analyzer';

function createBeatDrift(bar: number, beat: number, severity: 'minor' | 'moderate' | 'severe'): BeatDrift {
  const driftAmount = severity === 'minor' ? 0.05 : severity === 'moderate' ? 0.2 : 0.4;
  return {
    id: generateId(),
    bar,
    beat,
    driftAmount,
    severity,
    detectedAt: new Date().toISOString(),
    description: `第${bar}小节第${beat}拍检测到${severity === 'minor' ? '轻微' : severity === 'moderate' ? '中等' : '严重'}节拍漂移`,
  };
}

function addHistoryEntry(
  analysis: SoloAnalysis,
  action: HistoryEntry['action'],
  author: string,
  description: string,
  includeChords = false
): void {
  analysis.history.push({
    id: generateId(),
    timestamp: new Date().toISOString(),
    action,
    author,
    description,
    chordProgression: includeChords ? [...analysis.chordProgression] : undefined,
  });
}

export function createSample1(): SoloAnalysis {
  const chords = parseChordProgression('Am7 | D7 | Gmaj7 | Cmaj7 | Am7 | D7 | Gmaj7 | Cmaj7');
  const analysis: SoloAnalysis = {
    id: generateId(),
    audioFile: '20240515_autumn_leaves.wav',
    title: 'Autumn Leaves 即兴练习',
    artist: '',
    dateRecorded: '',
    dateAnalyzed: new Date().toISOString(),
    chordProgression: chords,
    motifs: [],
    beatDrifts: [
      createBeatDrift(3, 2, 'minor'),
      createBeatDrift(6, 4, 'moderate'),
    ],
    harmonyIssues: [],
    segments: [],
    status: 'draft',
    notes: '',
    history: [
      {
        id: generateId(),
        timestamp: new Date().toISOString(),
        action: 'created',
        author: 'system',
        description: '创建分析记录',
      },
    ],
    hasMissingFields: true,
    isLateEntry: false,
  };
  return analysis;
}

export function createSample2(): SoloAnalysis {
  const chords = parseChordProgression('Cmaj7 | Am7 | Dm7 | G7 | Cmaj7 | Am7 | Dm7 | G7 | Cmaj7');
  const analysis: SoloAnalysis = {
    id: generateId(),
    audioFile: '20240510_someday_my_prince.mp3',
    title: 'Someday My Prince Will Come',
    artist: '张三',
    dateRecorded: '2024-05-10',
    dateAnalyzed: new Date(Date.now() - 86400000 * 5).toISOString(),
    chordProgression: chords,
    motifs: [],
    beatDrifts: [
      createBeatDrift(4, 1, 'severe'),
      createBeatDrift(7, 3, 'moderate'),
    ],
    harmonyIssues: [],
    segments: [],
    status: 'corrected',
    notes: '晚补记录：学生临时提交，需要重点检查第4小节的节拍问题',
    history: [
      {
        id: generateId(),
        timestamp: new Date(Date.now() - 86400000 * 5).toISOString(),
        action: 'created',
        author: 'system',
        description: '创建分析记录',
      },
      {
        id: generateId(),
        timestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
        action: 'noted',
        author: '李老师',
        description: '添加备注：晚补记录',
      },
    ],
    hasMissingFields: false,
    isLateEntry: true,
  };
  return analysis;
}

export function createSample3(): SoloAnalysis {
  const chords = parseChordProgression('Dm7 | G7 | Cmaj7 | Fmaj7 | Bdim7 | E7 | Am7 | Dm7 G7');
  const analysis: SoloAnalysis = {
    id: generateId(),
    audioFile: '20240520_blues_for_alice.wav',
    title: 'Blues for Alice',
    artist: '李四',
    dateRecorded: '2024-05-20',
    dateAnalyzed: new Date().toISOString(),
    chordProgression: chords,
    motifs: [],
    beatDrifts: [],
    harmonyIssues: [],
    segments: [],
    status: 'analyzed',
    notes: '',
    history: [
      {
        id: generateId(),
        timestamp: new Date().toISOString(),
        action: 'created',
        author: 'system',
        description: '创建分析记录',
      },
    ],
    hasMissingFields: false,
    isLateEntry: false,
  };
  return analysis;
}

export function createSample4(): SoloAnalysis {
  const chords = parseChordProgression('Fmaj7 | Gm7 | Am7 | Bbmaj7 | C7 | Fmaj7 | Dm7 | G7');
  const analysis: SoloAnalysis = {
    id: generateId(),
    audioFile: '20240512_all_the_things.mp3',
    title: 'All the Things You Are',
    artist: '王五',
    dateRecorded: '2024-05-12',
    dateAnalyzed: new Date(Date.now() - 86400000 * 2).toISOString(),
    chordProgression: chords,
    motifs: [],
    beatDrifts: [
      createBeatDrift(2, 3, 'minor'),
    ],
    harmonyIssues: [],
    segments: [],
    status: 'reviewed',
    notes: '备注已修改：第2小节的动机发展很好，建议保持这个律动。原备注：需要多练习',
    history: [
      {
        id: generateId(),
        timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
        action: 'created',
        author: 'system',
        description: '创建分析记录',
      },
      {
        id: generateId(),
        timestamp: new Date(Date.now() - 86400000 * 1).toISOString(),
        action: 'noted',
        author: '王老师',
        description: '添加备注：需要多练习',
      },
      {
        id: generateId(),
        timestamp: new Date().toISOString(),
        action: 'corrected',
        author: '王老师',
        description: '修改备注为鼓励性评语',
      },
    ],
    hasMissingFields: false,
    isLateEntry: false,
  };
  return analysis;
}

export function createSample5(): SoloAnalysis {
  const chords = parseChordProgression('Bb7 | Eb7 | Abmaj7 | Db7 | Gb7 | Bmaj7 | E7 | A7');
  const analysis: SoloAnalysis = {
    id: generateId(),
    audioFile: '20240518_giant_steps.wav',
    title: 'Giant Steps 片段',
    artist: '',
    dateRecorded: '2024-05-18',
    dateAnalyzed: new Date().toISOString(),
    chordProgression: chords,
    motifs: [],
    beatDrifts: [
      createBeatDrift(1, 1, 'severe'),
      createBeatDrift(4, 2, 'severe'),
      createBeatDrift(6, 3, 'moderate'),
    ],
    harmonyIssues: [],
    segments: [],
    status: 'draft',
    notes: '和弦变化太快，需要逐小节确认',
    history: [
      {
        id: generateId(),
        timestamp: new Date().toISOString(),
        action: 'created',
        author: 'system',
        description: '创建分析记录',
      },
    ],
    hasMissingFields: true,
    isLateEntry: false,
  };
  return analysis;
}

export function getAllSamples(): SoloAnalysis[] {
  return [
    createSample1(),
    createSample2(),
    createSample3(),
    createSample4(),
    createSample5(),
  ];
}
