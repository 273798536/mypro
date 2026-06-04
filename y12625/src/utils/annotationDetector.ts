import { Annotation, AnnotationIssue, Point } from '@/types';
import { isPointInPolygon } from './mathParser';

export function detectAnnotationIssues(annotation: Annotation): AnnotationIssue[] {
  const issues: AnnotationIssue[] = [];

  if (!annotation.note || annotation.note.trim() === '') {
    issues.push({
      type: 'empty_value',
      description: '备注为空，请补充说明该标注的含义',
      sourceReference: `标注 ${annotation.id} 备注字段`
    });
  }

  if (hasMixedContent(annotation.note)) {
    issues.push({
      type: 'mixed_note',
      description: '备注中混入了非文字内容，请检查并清理',
      sourceReference: `标注 ${annotation.id} 备注内容`
    });
  }

  if (annotation.points.length < 2) {
    issues.push({
      type: 'empty_value',
      description: '坐标点数量不足，无法构成有效标注',
      sourceReference: `标注 ${annotation.id} 坐标数据`
    });
  }

  return issues;
}

export function detectDuplicateAnnotations(
  annotations: Annotation[]
): AnnotationIssue[] {
  const issues: AnnotationIssue[] = [];
  const seen = new Map<string, Annotation[]>();

  annotations.forEach(anno => {
    const key = `${anno.type}-${JSON.stringify(anno.points)}`;
    if (seen.has(key)) {
      const existing = seen.get(key)!;
      existing.forEach(other => {
        issues.push({
          type: 'duplicate',
          description: `发现重复标注（ID: ${other.id}）`,
          sourceReference: `标注 ${anno.id} 与标注 ${other.id} 重复`
        });
      });
      existing.push(anno);
    } else {
      seen.set(key, [anno]);
    }
  });

  return issues;
}

export function detectOutOfBoundary(
  annotation: Annotation,
  boundary: { x: number; y: number }
): AnnotationIssue[] {
  const issues: AnnotationIssue[] = [];
  const outOfBoundsPoints: Point[] = [];

  annotation.points.forEach(point => {
    if (Math.abs(point.x) > boundary.x || Math.abs(point.y) > boundary.y) {
      outOfBoundsPoints.push(point);
    }
  });

  if (outOfBoundsPoints.length > 0) {
    issues.push({
      type: 'out_of_boundary',
      description: `有 ${outOfBoundsPoints.length} 个点超出边界范围 [±${boundary.x}, ±${boundary.y}]`,
      sourceReference: `标注 ${annotation.id} 边界检测`
    });
  }

  return issues;
}

export function detectRegionOverlap(
  annotations: Annotation[]
): AnnotationIssue[] {
  const issues: AnnotationIssue[] = [];
  const regions = annotations.filter(a => a.type === 'region');

  for (let i = 0; i < regions.length; i++) {
    for (let j = i + 1; j < regions.length; j++) {
      if (hasOverlap(regions[i].points, regions[j].points)) {
        issues.push({
          type: 'duplicate',
          description: `区域标注存在重叠`,
          sourceReference: `标注 ${regions[i].id} 与 ${regions[j].id} 重叠`
        });
      }
    }
  }

  return issues;
}

export function validateAllAnnotations(
  annotations: Annotation[],
  boundary: { x: number; y: number }
): { valid: Annotation[]; pending: Annotation[]; allIssues: AnnotationIssue[] } {
  const allIssues: AnnotationIssue[] = [];
  
  const validated = annotations.map(anno => {
    const issues = [
      ...detectAnnotationIssues(anno),
      ...detectOutOfBoundary(anno, boundary)
    ];
    
    const updatedAnno = { ...anno, issues };
    allIssues.push(...issues);
    
    return issues.length === 0
      ? { ...updatedAnno, status: 'valid' as const }
      : { ...updatedAnno, status: 'pending_review' as const };
  });

  const dupIssues = detectDuplicateAnnotations(validated);
  const overlapIssues = detectRegionOverlap(validated);
  allIssues.push(...dupIssues, ...overlapIssues);

  return {
    valid: validated.filter(a => a.status === 'valid'),
    pending: validated.filter(a => a.status === 'pending_review' || a.issues.length > 0),
    allIssues
  };
}

function hasMixedContent(note: string): boolean {
  if (!note) return false;
  const controlChars = note.match(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g);
  return controlChars !== null && controlChars.length > 0;
}

function hasOverlap(poly1: Point[], poly2: Point[]): boolean {
  for (const point of poly1) {
    if (isPointInPolygon(point, poly2)) return true;
  }
  for (const point of poly2) {
    if (isPointInPolygon(point, poly1)) return true;
  }
  return false;
}
