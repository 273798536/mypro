import { ChartNote, BadLine, TraceNode, ParseResult } from '../../types';
import { generateId } from '../../utils';

export class ChartParser {
  private traceNodes: TraceNode[] = [];
  private parentTraceId: string;

  constructor(parentTraceId?: string) {
    this.parentTraceId = parentTraceId || generateId();
  }

  private addTraceNode(type: TraceNode['type'], name: string, status: TraceNode['status'], data: Record<string, any> = {}): string {
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

  parse(content: string): ParseResult {
    const notes: ChartNote[] = [];
    const badLines: BadLine[] = [];
    const lines = content.split('\n');

    this.addTraceNode('parse', '开始解析谱面文件', 'success', { totalLines: lines.length });

    let inNotesSection = false;
    let difficulty = 'NORMAL';

    for (let i = 0; i < lines.length; i++) {
      const lineNumber = i + 1;
      const line = lines[i];
      const trimmedLine = line.trim();

      if (trimmedLine === '') {
        badLines.push({
          lineNumber,
          content: line,
          type: 'empty',
          reason: '空行',
        });
        continue;
      }

      if (trimmedLine.startsWith('//') || trimmedLine.startsWith('#') || trimmedLine.startsWith(';')) {
        badLines.push({
          lineNumber,
          content: line,
          type: 'comment',
          reason: '注释行',
        });

        if (trimmedLine.includes('DIFFICULTY') || trimmedLine.includes('难度')) {
          const match = trimmedLine.match(/(?:DIFFICULTY|难度)[:：]\s*(\w+)/i);
          if (match) difficulty = match[1].toUpperCase();
        }
        continue;
      }

      if (trimmedLine === '[NOTES]' || trimmedLine === '---NOTES---') {
        inNotesSection = true;
        this.addTraceNode('parse', '识别到Notes开始标记', 'success', { lineNumber });
        continue;
      }

      if (!inNotesSection) {
        if (trimmedLine.includes(':')) {
          continue;
        }
      }

      const parts = line.split(/[,|\t]/).map(p => p.trim());

      if (parts.length < 3) {
        badLines.push({
          lineNumber,
          content: line,
          type: 'missing_column',
          reason: `列数不足: 需要至少3列, 实际${parts.length}列`,
        });
        continue;
      }

      try {
        const time = parseInt(parts[0], 10);
        const type = this.parseNoteType(parts[1]);
        const column = parseInt(parts[2], 10);

        if (isNaN(time) || time < 0) {
          badLines.push({
            lineNumber,
            content: line,
            type: 'invalid_format',
            reason: '无效的时间值',
          });
          continue;
        }

        if (isNaN(column) || column < 1 || column > 8) {
          badLines.push({
            lineNumber,
            content: line,
            type: 'invalid_format',
            reason: `无效的轨道位置: ${column}`,
          });
          continue;
        }

        const note: ChartNote = {
          id: generateId(),
          time,
          type,
          position: column,
          column,
          rawLine: line,
        };

        if (type === 'hold' && parts.length >= 4) {
          const duration = parseInt(parts[3], 10);
          if (!isNaN(duration) && duration > 0) {
            note.duration = duration;
          }
        }

        notes.push(note);
      } catch (error) {
        badLines.push({
          lineNumber,
          content: line,
          type: 'invalid_format',
          reason: `解析错误: ${error instanceof Error ? error.message : '未知错误'}`,
        });
      }
    }

    notes.sort((a, b) => a.time - b.time);

    this.addTraceNode('parse', '谱面解析完成', 'success', {
      totalNotes: notes.length,
      badLines: badLines.length,
      difficulty,
    });

    return {
      notes,
      badLines,
      traceNodes: this.traceNodes,
      difficulty,
    };
  }

  private parseNoteType(typeStr: string): ChartNote['type'] {
    const lower = typeStr.toLowerCase();
    if (lower.includes('hold') || lower === 'h' || lower === '2') return 'hold';
    if (lower.includes('slide') || lower === 's' || lower === '3') return 'slide';
    if (lower.includes('touch') || lower === 't' || lower === '4') return 'touch';
    return 'tap';
  }

  fixBadLine(badLine: BadLine, newContent: string, operator: string = '制作人'): BadLine {
    const fixRecord = {
      id: generateId(),
      timestamp: Date.now(),
      operator,
      originalContent: badLine.content,
      newContent,
      reason: '人工修正',
    };

    this.addTraceNode('parse', '人工修正坏行', 'warning', {
      lineNumber: badLine.lineNumber,
      originalType: badLine.type,
      operator,
    });

    return {
      ...badLine,
      content: newContent,
      fixed: true,
      fixHistory: [...(badLine.fixHistory || []), fixRecord],
    };
  }

  getTraceNodes(): TraceNode[] {
    return this.traceNodes;
  }
}

export const parseChart = (content: string): ParseResult => {
  const parser = new ChartParser();
  return parser.parse(content);
};
