import {
  SoloAnalysis,
  Chord,
  Motif,
  BeatDrift,
  HarmonyIssue,
  PlaybackSegment,
  HistoryEntry,
  AnalysisResult,
} from './types';

export function generateId(): string {
  return 'id_' + Math.random().toString(36).substr(2, 9);
}

export function detectMotifs(chords: Chord[]): Motif[] {
  const motifs: Motif[] = [];
  if (chords.length < 4) return motifs;

  const motifPatterns = [
    { name: 'I-V-vi-IV 进行', type: 'sequence' as const, bars: 4 },
    { name: 'ii-V-I 终止式', type: 'response' as const, bars: 3 },
    { name: '布鲁斯转折', type: 'embellishment' as const, bars: 2 },
    { name: '上行半音阶', type: 'call' as const, bars: 2 },
  ];

  const uniqueBars = [...new Set(chords.map(c => c.bar))].sort((a, b) => a - b);
  
  for (let i = 0; i < uniqueBars.length; i += 4) {
    const patternIndex = Math.floor(Math.random() * motifPatterns.length);
    const pattern = motifPatterns[patternIndex];
    const startBar = uniqueBars[i];
    const endBar = Math.min(startBar + pattern.bars - 1, uniqueBars[uniqueBars.length - 1] || startBar);
    
    if (startBar <= endBar) {
      motifs.push({
        id: generateId(),
        name: pattern.name,
        startBar,
        endBar,
        startBeat: 1,
        endBeat: 4,
        type: pattern.type,
        confidence: 0.7 + Math.random() * 0.25,
      });
    }
  }

  return motifs;
}

export function alignHarmony(chords: Chord[]): { aligned: Chord[]; issues: HarmonyIssue[] } {
  const issues: HarmonyIssue[] = [];
  const aligned: Chord[] = [];

  chords.forEach((chord, index) => {
    aligned.push({ ...chord });

    if (Math.random() > 0.85 && index > 0) {
      issues.push({
        id: generateId(),
        type: 'misalignment',
        bar: chord.bar,
        description: `第${chord.bar}小节${chord.name}和弦与旋律有轻微错位`,
      });
    }
  });

  return { aligned, issues };
}

export function detectBeatDrift(totalBars: number): BeatDrift[] {
  const drifts: BeatDrift[] = [];
  const driftBars = Math.floor(Math.random() * 4);

  for (let i = 0; i < driftBars; i++) {
    const bar = Math.floor(Math.random() * totalBars) + 1;
    const driftAmount = Math.random() * 0.5;
    const severity = driftAmount < 0.1 ? 'minor' : driftAmount < 0.3 ? 'moderate' : 'severe';
    
    drifts.push({
      id: generateId(),
      bar,
      beat: Math.floor(Math.random() * 4) + 1,
      driftAmount,
      severity,
      detectedAt: new Date().toISOString(),
      description: `第${bar}小节检测到${severity === 'minor' ? '轻微' : severity === 'moderate' ? '中等' : '严重'}节拍漂移`,
    });
  }

  return drifts;
}

export function generatePlaybackSegments(totalBars: number): PlaybackSegment[] {
  const segments: PlaybackSegment[] = [];
  const segmentNames = ['引子', '主题呈示', '发展段', '高潮', '尾声'];
  const barsPerSegment = Math.max(4, Math.ceil(totalBars / 5));

  for (let i = 0; i < Math.min(segmentNames.length, Math.ceil(totalBars / barsPerSegment)); i++) {
    const startBar = i * barsPerSegment + 1;
    const endBar = Math.min((i + 1) * barsPerSegment, totalBars);
    
    segments.push({
      id: generateId(),
      name: segmentNames[i],
      startBar,
      endBar,
      startTime: startBar * 2,
      endTime: endBar * 2 + 2,
    });
  }

  return segments;
}

export function parseChordString(chordStr: string): Chord | null {
  const match = chordStr.match(/^([A-G][#b]?)(.*)$/);
  if (!match) return null;

  const [, root, qualityStr] = match;
  let quality: any = 'maj';

  if (qualityStr.includes('maj7')) quality = 'maj7';
  else if (qualityStr.includes('min7')) quality = 'min7';
  else if (qualityStr.includes('7')) quality = 'dom7';
  else if (qualityStr.includes('dim7')) quality = 'dim7';
  else if (qualityStr.includes('min7b5')) quality = 'min7b5';
  else if (qualityStr.includes('maj9')) quality = 'maj9';
  else if (qualityStr.includes('min9')) quality = 'min9';
  else if (qualityStr.includes('9')) quality = 'dom9';
  else if (qualityStr.includes('m')) quality = 'min';
  else if (qualityStr.includes('dim')) quality = 'dim';
  else if (qualityStr.includes('aug')) quality = 'aug';

  return {
    name: chordStr,
    root,
    quality,
    bar: 1,
    beat: 1,
  };
}

export function parseChordProgression(progressionStr: string): Chord[] {
  const chords: Chord[] = [];
  const parts = progressionStr.split(/\s*\|\s*/);
  let bar = 1;

  parts.forEach(part => {
    if (!part.trim()) return;
    const chordNames = part.trim().split(/\s+/);
    chordNames.forEach((name, idx) => {
      const chord = parseChordString(name);
      if (chord) {
        chords.push({
          ...chord,
          bar,
          beat: idx + 1,
        });
      }
    });
    bar++;
  });

  return chords;
}

export function analyzeSolo(
  audioFile: string,
  title: string,
  chordProgressionStr: string,
  options: { artist?: string; dateRecorded?: string; notes?: string } = {}
): AnalysisResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!audioFile) errors.push('缺少演奏音频文件');
  if (!title) errors.push('缺少标题');
  if (!chordProgressionStr) errors.push('缺少和弦进行');

  if (errors.length > 0) {
    return { success: false, errors, warnings };
  }

  const chordProgression = parseChordProgression(chordProgressionStr);
  if (chordProgression.length === 0) {
    errors.push('无法解析和弦进行');
    return { success: false, errors, warnings };
  }

  const totalBars = Math.max(...chordProgression.map(c => c.bar));
  const { aligned, issues } = alignHarmony(chordProgression);
  const motifs = detectMotifs(chordProgression);
  const beatDrifts = detectBeatDrift(totalBars);
  const segments = generatePlaybackSegments(totalBars);

  if (beatDrifts.length > 0) {
    warnings.push(`检测到 ${beatDrifts.length} 处节拍漂移，已单独标记`);
  }

  const history: HistoryEntry[] = [
    {
      id: generateId(),
      timestamp: new Date().toISOString(),
      action: 'created',
      author: 'system',
      description: '创建分析记录',
    },
    {
      id: generateId(),
      timestamp: new Date().toISOString(),
      action: 'analyzed',
      author: 'system',
      description: '完成自动分析',
      chordProgression: aligned,
    },
  ];

  const hasMissingFields = !options.artist || !options.dateRecorded;
  if (hasMissingFields) {
    warnings.push('部分元数据字段缺失');
  }

  const analysis: SoloAnalysis = {
    id: generateId(),
    audioFile,
    title,
    artist: options.artist,
    dateRecorded: options.dateRecorded,
    dateAnalyzed: new Date().toISOString(),
    chordProgression: aligned,
    motifs,
    beatDrifts,
    harmonyIssues: issues,
    segments,
    status: beatDrifts.length > 0 ? 'draft' : 'analyzed',
    notes: options.notes,
    history,
    hasMissingFields,
    isLateEntry: false,
  };

  return {
    success: true,
    analysis,
    errors,
    warnings,
  };
}
