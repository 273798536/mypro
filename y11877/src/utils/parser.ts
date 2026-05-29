import type { MirrorSegment, IncidentRay, ParseResult, ParseError } from './types';

export function parseMirrorSegments(text: string): ParseResult<MirrorSegment> {
  const errors: ParseError[] = [];
  const data: MirrorSegment[] = [];

  if (!text.trim()) return { data, errors };

  let isJson = false;
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      isJson = true;
      parsed.forEach((item: Record<string, unknown>, idx: number) => {
        const nums = ['startX', 'startY', 'endX', 'endY'];
        const missing = nums.filter((k) => typeof item[k] !== 'number');
        if (missing.length > 0) {
          errors.push({ line: idx + 1, message: `缺少字段: ${missing.join(', ')}` });
          return;
        }
        data.push({
          id: `M${data.length + 1}`,
          startX: item.startX as number,
          startY: item.startY as number,
          endX: item.endX as number,
          endY: item.endY as number,
          normalAngle: typeof item.normalAngle === 'number' ? (item.normalAngle as number) : undefined,
        });
      });
    }
  } catch {
    isJson = false;
  }

  if (!isJson) {
    const lines = text.split('\n');
    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) return;

      const parts = trimmed.split(/[\s,;\t]+/).map(Number);
      if (parts.length < 4 || parts.some(isNaN)) {
        errors.push({ line: idx + 1, message: `格式错误: 需要 startX,startY,endX,endY[,normalAngle]` });
        return;
      }
      data.push({
        id: `M${data.length + 1}`,
        startX: parts[0],
        startY: parts[1],
        endX: parts[2],
        endY: parts[3],
        normalAngle: parts.length >= 5 && !isNaN(parts[4]) ? parts[4] : undefined,
      });
    });
  }

  return { data, errors };
}

export function parseIncidentRays(text: string): ParseResult<IncidentRay> {
  const errors: ParseError[] = [];
  const data: IncidentRay[] = [];

  if (!text.trim()) return { data, errors };

  let isJson = false;
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      isJson = true;
      parsed.forEach((item: Record<string, unknown>, idx: number) => {
        if (typeof item.originX !== 'number' || typeof item.originY !== 'number' || typeof item.directionAngle !== 'number') {
          errors.push({ line: idx + 1, message: '缺少字段: originX, originY, directionAngle' });
          return;
        }
        data.push({
          id: `R${data.length + 1}`,
          originX: item.originX as number,
          originY: item.originY as number,
          directionAngle: item.directionAngle as number,
          angleUnit: (item.angleUnit === 'rad' ? 'rad' : 'deg') as 'deg' | 'rad',
        });
      });
    }
  } catch {
    isJson = false;
  }

  if (!isJson) {
    const lines = text.split('\n');
    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) return;

      const parts = trimmed.split(/[\s,;\t]+/);
      const nums = parts.slice(0, 3).map(Number);
      if (nums.length < 3 || nums.some(isNaN)) {
        errors.push({ line: idx + 1, message: `格式错误: 需要 originX,originY,directionAngle[,deg|rad]` });
        return;
      }
      const unit = parts[3] === 'rad' ? 'rad' : 'deg';
      data.push({
        id: `R${data.length + 1}`,
        originX: nums[0],
        originY: nums[1],
        directionAngle: nums[2],
        angleUnit: unit,
      });
    });
  }

  return { data, errors };
}
