import { ChartNote, QualityIssue, TraceNode, AnalysisConfig } from '../../types';
import { generateId } from '../../utils';

const DEFAULT_CONFIG: AnalysisConfig = {
  denseChordThreshold: 50,
  timingOffsetThreshold: 10,
  minHoldDuration: 100,
};

export class QualityEngine {
  private config: AnalysisConfig;
  private traceNodes: TraceNode[] = [];
  private parentTraceId: string;

  constructor(config: Partial<AnalysisConfig> = {}, parentTraceId?: string) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.parentTraceId = parentTraceId || generateId();
  }

  private addTraceNode(
    type: TraceNode['type'],
    name: string,
    status: TraceNode['status'],
    data: Record<string, any> = {}
  ): string {
    const node: TraceNode = {
      id: generateId(),
      type,
      name,
      status,
      data,
      timestamp: Date.now(),
      parentId: this.traceNodes.length > 0 ? this.traceNodes[this.traceNodes.length - 1].id : this.parentTraceId,
    };
    this.traceNodes.push(node);
    return node.id;
  }

  analyze(notes: ChartNote[], difficultyLabel?: string): {
    issues: QualityIssue[];
    timingOffsetIssues: QualityIssue[];
    traceNodes: TraceNode[];
  } {
    this.addTraceNode('analyze', '开始质检分析', 'success', {
      noteCount: notes.length,
      config: this.config,
    });

    const issues: QualityIssue[] = [];
    const timingOffsetIssues: QualityIssue[] = [];

    const denseChordIssues = this.detectDenseChords(notes);
    issues.push(...denseChordIssues);

    const holdMissIssues = this.detectHoldMisses(notes);
    issues.push(...holdMissIssues);

    const timingIssues = this.detectTimingOffsets(notes);
    timingOffsetIssues.push(...timingIssues);

    if (difficultyLabel) {
      const labelIssues = this.validateDifficultyLabel(difficultyLabel, notes);
      issues.push(...labelIssues);
    }

    this.addTraceNode('analyze', '质检分析完成', 'success', {
      totalIssues: issues.length + timingOffsetIssues.length,
      normalIssues: issues.length,
      timingOffsetIssues: timingOffsetIssues.length,
    });

    return {
      issues,
      timingOffsetIssues,
      traceNodes: this.traceNodes,
    };
  }

  private detectDenseChords(notes: ChartNote[]): QualityIssue[] {
    const issues: QualityIssue[] = [];
    const traceId = this.addTraceNode('analyze', '检测双押过密', 'success');

    const timeGroups = new Map<number, ChartNote[]>();

    for (const note of notes) {
      const roundedTime = Math.round(note.time / 10) * 10;
      const existing = timeGroups.get(roundedTime) || [];
      timeGroups.set(roundedTime, [...existing, note]);
    }

    for (const [time, groupNotes] of timeGroups) {
      if (groupNotes.length >= 3) {
        issues.push({
          id: generateId(),
          type: 'dense_chord',
          severity: 'warning',
          time,
          description: `检测到${groupNotes.length}押，可能过密`,
          relatedNotes: groupNotes.map(n => n.id),
          traceId,
          rawData: {
            noteCount: groupNotes.length,
            threshold: this.config.denseChordThreshold,
          },
        });
      }
    }

    for (let i = 0; i < notes.length; i++) {
      for (let j = i + 1; j < notes.length; j++) {
        const timeDiff = Math.abs(notes[j].time - notes[i].time);
        if (timeDiff > 0 && timeDiff < this.config.denseChordThreshold && notes[i].column !== notes[j].column) {
          const existingIssue = issues.find(issue =>
            Math.abs(issue.time - notes[i].time) < this.config.denseChordThreshold
          );
          if (!existingIssue) {
            issues.push({
              id: generateId(),
              type: 'dense_chord',
              severity: 'warning',
              time: notes[i].time,
              description: `相邻note时间间隔仅${timeDiff}ms，可能过密`,
              relatedNotes: [notes[i].id, notes[j].id],
              traceId,
              rawData: {
                timeDiff,
                threshold: this.config.denseChordThreshold,
              },
            });
          }
        }
      }
    }

    return issues;
  }

  private detectHoldMisses(notes: ChartNote[]): QualityIssue[] {
    const issues: QualityIssue[] = [];
    const traceId = this.addTraceNode('analyze', '检测长按漏判', 'success');

    const holdNotes = notes.filter(n => n.type === 'hold');

    for (const note of holdNotes) {
      if (!note.duration || note.duration <= 0) {
        issues.push({
          id: generateId(),
          type: 'hold_miss',
          severity: 'warning',
          time: note.time,
          description: '长按note缺少持续时间',
          relatedNotes: [note.id],
          traceId,
          rawData: {
            duration: note.duration,
            minDuration: this.config.minHoldDuration,
          },
        });
      } else if (note.duration < this.config.minHoldDuration) {
        issues.push({
          id: generateId(),
          type: 'hold_miss',
          severity: 'info',
          time: note.time,
          description: `长按持续时间过短(${note.duration}ms)`,
          relatedNotes: [note.id],
          traceId,
          rawData: {
            duration: note.duration,
            minDuration: this.config.minHoldDuration,
          },
        });
      }
    }

    return issues;
  }

  private detectTimingOffsets(notes: ChartNote[]): QualityIssue[] {
    const issues: QualityIssue[] = [];
    const traceId = this.addTraceNode('analyze', '检测音画偏移', 'warning', {
      note: '此为独立检测路径，结果不混入正常列表',
    });

    const commonBPMMultiples = [500, 250, 125, 62.5, 333, 166];

    for (let i = 0; i < notes.length; i++) {
      const note = notes[i];
      const time = note.time;

      if (time <= 0) continue;

      let minDeviation = Infinity;
      let bestBeat = 0;

      for (const bpmUnit of commonBPMMultiples) {
        const expectedBeat = Math.round(time / bpmUnit) * bpmUnit;
        const deviation = Math.abs(time - expectedBeat);

        if (deviation < minDeviation) {
          minDeviation = deviation;
          bestBeat = expectedBeat;
        }
      }

      if (minDeviation > this.config.timingOffsetThreshold && time < 20000) {
        issues.push({
          id: generateId(),
          type: 'timing_offset',
          severity: 'critical',
          time: note.time,
          description: `音画偏移: 实际${time}ms，理论${bestBeat}ms，偏离${minDeviation.toFixed(1)}ms`,
          relatedNotes: [note.id],
          traceId,
          rawData: {
            actualTime: time,
            expectedTime: bestBeat,
            deviation: minDeviation,
            threshold: this.config.timingOffsetThreshold,
          },
        });
      }
    }

    if (issues.length > 0) {
      this.addTraceNode('analyze', `发现${issues.length}处音画偏移`, 'error', {
        count: issues.length,
      });
    }

    return issues;
  }

  private calculateDeviation(interval: number, multiples: number[]): number {
    let minDeviation = Infinity;

    for (const unit of multiples) {
      const quotient = Math.round(interval / unit);
      if (quotient > 0) {
        const idealInterval = quotient * unit;
        const deviation = Math.abs(interval - idealInterval);
        minDeviation = Math.min(minDeviation, deviation);
      }
    }

    return minDeviation;
  }

  private validateDifficultyLabel(label: string, notes: ChartNote[]): QualityIssue[] {
    const issues: QualityIssue[] = [];
    const traceId = this.addTraceNode('analyze', '校验难度标签', 'success');

    const validLabels = ['EASY', 'NORMAL', 'HARD', 'EXPERT', 'MASTER'];
    const upperLabel = label.toUpperCase();

    if (!validLabels.includes(upperLabel)) {
      issues.push({
        id: generateId(),
        type: 'difficulty_label',
        severity: 'warning',
        time: 0,
        description: `难度标签"${label}"格式不规范，建议使用: ${validLabels.join(', ')}`,
        relatedNotes: [],
        traceId,
        rawData: {
          providedLabel: label,
          validLabels,
        },
      });
    }

    const noteCount = notes.length;
    const expectedRanges: Record<string, [number, number]> = {
      'EASY': [50, 300],
      'NORMAL': [200, 500],
      'HARD': [400, 800],
      'EXPERT': [600, 1200],
      'MASTER': [800, 2000],
    };

    const range = expectedRanges[upperLabel];
    if (range && (noteCount < range[0] || noteCount > range[1])) {
      issues.push({
        id: generateId(),
        type: 'difficulty_label',
        severity: 'info',
        time: 0,
        description: `难度${label}的note数量(${noteCount})不在预期范围(${range[0]}-${range[1]})`,
        relatedNotes: [],
        traceId,
        rawData: {
          noteCount,
          expectedRange: range,
          difficulty: label,
        },
      });
    }

    return issues;
  }

  getTraceNodes(): TraceNode[] {
    return this.traceNodes;
  }

  setConfig(config: Partial<AnalysisConfig>) {
    this.config = { ...this.config, ...config };
  }
}

export const analyzeQuality = (
  notes: ChartNote[],
  difficultyLabel?: string,
  config?: Partial<AnalysisConfig>
) => {
  const engine = new QualityEngine(config);
  return engine.analyze(notes, difficultyLabel);
};
