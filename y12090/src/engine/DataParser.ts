import Papa from 'papaparse';
import type {
  Seat,
  BadRow,
  CommentRow,
  ParsedData,
  Point3D,
  SubtitleScreenConfig,
  AuditoriumBounds,
} from '../types/seat';

const REQUIRED_COLUMNS = ['row', 'number', 'x', 'y', 'z', 'target_x', 'target_y', 'target_z'];

export class DataParser {
  private lineNumber = 0;

  async parseCSV(file: File): Promise<ParsedData> {
    return new Promise((resolve, reject) => {
      const seats: Seat[] = [];
      const badRows: BadRow[] = [];
      const comments: CommentRow[] = [];
      let subtitleScreen: SubtitleScreenConfig | undefined;
      let auditoriumBounds: AuditoriumBounds | undefined;

      this.lineNumber = 0;

      Papa.parse(file, {
        skipEmptyLines: false,
        step: (results) => {
          this.lineNumber++;
          const row = results.data as string[];
          const rawContent = row.join(',');

          if (this.isEmptyRow(row)) {
            badRows.push({
              id: `bad-${this.lineNumber}`,
              lineNumber: this.lineNumber,
              rawContent,
              reason: '空行',
            });
            return;
          }

          if (this.isCommentRow(row)) {
            comments.push({
              lineNumber: this.lineNumber,
              content: row.join(',').replace(/^#\s*/, ''),
            });

            const config = this.tryParseConfig(row);
            if (config.subtitleScreen) subtitleScreen = config.subtitleScreen;
            if (config.auditoriumBounds) auditoriumBounds = config.auditoriumBounds;
            return;
          }

          if (this.isHeaderRow(row)) {
            return;
          }

          try {
            const seat = this.parseSeatRow(row, rawContent);
            if (seat) {
              seats.push(seat);
            }
          } catch (error) {
            badRows.push({
              id: `bad-${this.lineNumber}`,
              lineNumber: this.lineNumber,
              rawContent,
              reason: error instanceof Error ? error.message : '未知解析错误',
            });
          }
        },
        complete: () => {
          if (!auditoriumBounds && seats.length > 0) {
            auditoriumBounds = this.calculateBounds(seats);
          }
          resolve({ seats, badRows, comments, subtitleScreen, auditoriumBounds });
        },
        error: (error) => reject(error),
      });
    });
  }

  parseText(content: string): ParsedData {
    const seats: Seat[] = [];
    const badRows: BadRow[] = [];
    const comments: CommentRow[] = [];
    let subtitleScreen: SubtitleScreenConfig | undefined;
    let auditoriumBounds: AuditoriumBounds | undefined;

    const lines = content.split('\n');
    this.lineNumber = 0;

    for (const line of lines) {
      this.lineNumber++;
      const row = line.split(',');
      const rawContent = line;

      if (this.isEmptyRow(row)) {
        badRows.push({
          id: `bad-${this.lineNumber}`,
          lineNumber: this.lineNumber,
          rawContent,
          reason: '空行',
        });
        continue;
      }

      if (this.isCommentRow(row)) {
        comments.push({
          lineNumber: this.lineNumber,
          content: row.join(',').replace(/^#\s*/, ''),
        });

        const config = this.tryParseConfig(row);
        if (config.subtitleScreen) subtitleScreen = config.subtitleScreen;
        if (config.auditoriumBounds) auditoriumBounds = config.auditoriumBounds;
        continue;
      }

      if (this.isHeaderRow(row)) {
        continue;
      }

      try {
        const seat = this.parseSeatRow(row, rawContent);
        if (seat) {
          seats.push(seat);
        }
      } catch (error) {
        badRows.push({
          id: `bad-${this.lineNumber}`,
          lineNumber: this.lineNumber,
          rawContent,
          reason: error instanceof Error ? error.message : '未知解析错误',
        });
      }
    }

    if (!auditoriumBounds && seats.length > 0) {
      auditoriumBounds = this.calculateBounds(seats);
    }

    return { seats, badRows, comments, subtitleScreen, auditoriumBounds };
  }

  private isEmptyRow(row: string[]): boolean {
    return row.every((cell) => !cell || cell.trim() === '');
  }

  private isCommentRow(row: string[]): boolean {
    return row[0]?.trim().startsWith('#');
  }

  private isHeaderRow(row: string[]): boolean {
    const firstCell = row[0]?.toLowerCase().trim();
    return (
      firstCell === 'row' ||
      firstCell === '排' ||
      firstCell === '排号' ||
      firstCell === '行'
    );
  }

  private tryParseConfig(row: string[]): {
    subtitleScreen?: SubtitleScreenConfig;
    auditoriumBounds?: AuditoriumBounds;
  } {
    const content = row.join(',').toLowerCase();
    const result: {
      subtitleScreen?: SubtitleScreenConfig;
      auditoriumBounds?: AuditoriumBounds;
    } = {};

    if (content.includes('字幕屏') || content.includes('subtitle')) {
      result.subtitleScreen = this.parseSubtitleScreen(row);
    }

    if (content.includes('边界') || content.includes('bounds')) {
      result.auditoriumBounds = this.parseAuditoriumBounds(row);
    }

    return result;
  }

  private parseSubtitleScreen(row: string[]): SubtitleScreenConfig | undefined {
    const content = row.join(',');
    const numbers = content.match(/-?\d+\.?\d*/g)?.map(Number) || [];

    if (numbers.length >= 7) {
      return {
        position: { x: numbers[0] || 0, y: numbers[1] || 0, z: numbers[2] || 0 },
        width: numbers[3] || 10,
        height: numbers[4] || 2,
        rotation: { x: numbers[5] || 0, y: numbers[6] || 0, z: 0 },
        validHeightRange: { min: 1.5, max: 4 },
      };
    }

    return {
      position: { x: 0, y: 3, z: -12 },
      width: 12,
      height: 2,
      rotation: { x: 0, y: 0, z: 0 },
      validHeightRange: { min: 1.5, max: 4 },
    };
  }

  private parseAuditoriumBounds(row: string[]): AuditoriumBounds | undefined {
    const content = row.join(',');
    const numbers = content.match(/-?\d+\.?\d*/g)?.map(Number) || [];

    if (numbers.length >= 6) {
      return {
        min: { x: numbers[0], y: numbers[1], z: numbers[2] },
        max: { x: numbers[3], y: numbers[4], z: numbers[5] },
      };
    }
    return undefined;
  }

  private parseSeatRow(row: string[], rawContent: string): Seat | null {
    const cleanRow = row.map((cell) => cell.trim());

    if (cleanRow.length < 8) {
      throw new Error(`缺列：需要至少8列，实际只有${cleanRow.length}列`);
    }

    const rowName = cleanRow[0] || '';
    const seatNumber = parseInt(cleanRow[1] || '0', 10);
    const section = cleanRow[2] || '主区';

    const x = parseFloat(cleanRow[3] || '');
    const y = parseFloat(cleanRow[4] || '');
    const z = parseFloat(cleanRow[5] || '');
    const targetX = parseFloat(cleanRow[6] || '');
    const targetY = parseFloat(cleanRow[7] || '');
    const targetZ = parseFloat(cleanRow[8] || '0');
    const eyeHeight = parseFloat(cleanRow[9] || '1.2');

    const errors: string[] = [];

    if (!rowName) errors.push('排号为空');
    if (isNaN(seatNumber)) errors.push('座号无效');
    if (isNaN(x)) errors.push('X坐标无效');
    if (isNaN(y)) errors.push('Y坐标无效');
    if (isNaN(z)) errors.push('Z坐标无效');
    if (isNaN(targetX)) errors.push('目标X坐标无效');
    if (isNaN(targetY)) errors.push('目标Y坐标无效');
    if (isNaN(targetZ)) errors.push('目标Z坐标无效');

    if (errors.length > 0) {
      throw new Error(errors.join('; '));
    }

    return {
      id: `seat-${rowName}-${seatNumber}-${this.lineNumber}`,
      row: rowName,
      number: seatNumber,
      section,
      position: { x, y, z },
      eyeHeight: isNaN(eyeHeight) ? 1.2 : eyeHeight,
      targetPoint: { x: targetX, y: targetY, z: targetZ },
      originalLineNumber: this.lineNumber,
      rawData: rawContent,
    };
  }

  private calculateBounds(seats: Seat[]): AuditoriumBounds {
    let minX = Infinity,
      minY = Infinity,
      minZ = Infinity;
    let maxX = -Infinity,
      maxY = -Infinity,
      maxZ = -Infinity;

    for (const seat of seats) {
      minX = Math.min(minX, seat.position.x, seat.targetPoint.x);
      minY = Math.min(minY, seat.position.y, seat.targetPoint.y);
      minZ = Math.min(minZ, seat.position.z, seat.targetPoint.z);
      maxX = Math.max(maxX, seat.position.x, seat.targetPoint.x);
      maxY = Math.max(maxY, seat.position.y, seat.targetPoint.y);
      maxZ = Math.max(maxZ, seat.position.z, seat.targetPoint.z);
    }

    const padding = 3;
    return {
      min: { x: minX - padding, y: 0, z: minZ - padding },
      max: { x: maxX + padding, y: maxY + 2, z: maxZ + padding },
    };
  }
}

export function pointInsideBounds(point: Point3D, bounds: AuditoriumBounds): boolean {
  return (
    point.x >= bounds.min.x &&
    point.x <= bounds.max.x &&
    point.y >= bounds.min.y &&
    point.y <= bounds.max.y &&
    point.z >= bounds.min.z &&
    point.z <= bounds.max.z
  );
}
