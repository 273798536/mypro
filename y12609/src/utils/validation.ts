import type { HotzoneAnnotation, ColorRule, ValidationResult, Point } from '@/types';
import { calculateOverlapPercentage } from './geometry';

const DUPLICATE_THRESHOLD = 30;

export const validateAnnotation = (
  annotation: HotzoneAnnotation,
  allAnnotations: HotzoneAnnotation[],
  colorRules: ColorRule[],
  canvasWidth: number,
  canvasHeight: number
): ValidationResult[] => {
  const results: ValidationResult[] = [];

  results.push(...checkDuplicate(annotation, allAnnotations));
  results.push(...checkColorRule(annotation, colorRules));
  results.push(...checkBounds(annotation, canvasWidth, canvasHeight));
  results.push(...checkLevel(annotation));

  return results;
};

export const checkDuplicate = (
  annotation: HotzoneAnnotation,
  allAnnotations: HotzoneAnnotation[]
): ValidationResult[] => {
  const results: ValidationResult[] = [];
  const duplicates: string[] = [];

  for (const other of allAnnotations) {
    if (other.id === annotation.id) continue;
    const overlap = calculateOverlapPercentage(annotation.points, other.points);
    if (overlap >= DUPLICATE_THRESHOLD) {
      duplicates.push(other.id);
    }
  }

  if (duplicates.length > 0) {
    results.push({
      annotationId: annotation.id,
      type: 'duplicate',
      severity: 'error',
      message: `与 ${duplicates.length} 个标注重叠，重叠率均超过 ${DUPLICATE_THRESHOLD}%，属于重复标注`,
      blocked: true
    });
  }

  return results;
};

export const checkColorRule = (
  annotation: HotzoneAnnotation,
  colorRules: ColorRule[]
): ValidationResult[] => {
  const results: ValidationResult[] = [];
  const hasMatchingRule = colorRules.some(
    rule => rule.level === annotation.level && rule.color === annotation.color
  );

  if (!hasMatchingRule) {
    results.push({
      annotationId: annotation.id,
      type: 'invalid_color',
      severity: 'error',
      message: `颜色 ${annotation.color} 或等级 ${annotation.level} 未在当前颜色规则中定义`,
      blocked: true
    });
  }

  return results;
};

export const checkBounds = (
  annotation: HotzoneAnnotation,
  canvasWidth: number,
  canvasHeight: number
): ValidationResult[] => {
  const results: ValidationResult[] = [];
  let outOfBounds = false;

  for (const point of annotation.points) {
    if (point.x < 0 || point.x > canvasWidth || point.y < 0 || point.y > canvasHeight) {
      outOfBounds = true;
      break;
    }
  }

  if (outOfBounds) {
    results.push({
      annotationId: annotation.id,
      type: 'out_of_bounds',
      severity: 'warning',
      message: '标注部分区域超出画布边界',
      blocked: false
    });
  }

  return results;
};

export const checkLevel = (annotation: HotzoneAnnotation): ValidationResult[] => {
  const results: ValidationResult[] = [];

  if (annotation.level < 1 || annotation.level > 5) {
    results.push({
      annotationId: annotation.id,
      type: 'missing_level',
      severity: 'error',
      message: `热区等级 ${annotation.level} 无效，有效范围为 1-5`,
      blocked: true
    });
  }

  return results;
};

export const validateAllAnnotations = (
  annotations: HotzoneAnnotation[],
  colorRules: ColorRule[],
  canvasWidth: number,
  canvasHeight: number
): Map<string, ValidationResult[]> => {
  const resultsMap = new Map<string, ValidationResult[]>();

  for (const annotation of annotations) {
    const results = validateAnnotation(annotation, annotations, colorRules, canvasWidth, canvasHeight);
    resultsMap.set(annotation.id, results);
  }

  return resultsMap;
};

export const updateAnnotationsAfterRuleChange = (
  annotations: HotzoneAnnotation[],
  newColorRules: ColorRule[]
): HotzoneAnnotation[] => {
  return annotations.map(ann => {
    const matchingRule = newColorRules.find(r => r.level === ann.level);
    const results = validateAnnotation(ann, annotations, newColorRules, 9999, 9999);
    const hasBlockers = results.some(r => r.blocked);
    const duplicateResult = results.find(r => r.type === 'duplicate');
    const duplicates = annotations
      .filter(other => other.id !== ann.id)
      .filter(other => calculateOverlapPercentage(ann.points, other.points) >= 30)
      .map(o => o.id);

    return {
      ...ann,
      color: matchingRule ? matchingRule.color : ann.color,
      isValid: !hasBlockers,
      isDuplicate: !!duplicateResult,
      duplicateWith: duplicates.length > 0 ? duplicates : undefined,
      blockReason: hasBlockers ? results.filter(r => r.blocked).map(r => r.message).join('；') : undefined,
      updatedAt: Date.now()
    };
  });
};

export const generateBlockReasonsRecord = (
  annotations: HotzoneAnnotation[],
  colorRules: ColorRule[],
  canvasWidth: number,
  canvasHeight: number
): Record<string, string[]> => {
  const record: Record<string, string[]> = {};
  const resultsMap = validateAllAnnotations(annotations, colorRules, canvasWidth, canvasHeight);

  for (const [annotationId, results] of resultsMap) {
    const blockedReasons = results.filter(r => r.blocked).map(r => r.message);
    if (blockedReasons.length > 0) {
      record[annotationId] = blockedReasons;
    }
  }

  return record;
};

export const checkConsistency = (
  annotations: HotzoneAnnotation[],
  colorRules: ColorRule[],
  canvasWidth: number,
  canvasHeight: number
): boolean => {
  const resultsMap = validateAllAnnotations(annotations, colorRules, canvasWidth, canvasHeight);
  
  for (const annotation of annotations) {
    const results = resultsMap.get(annotation.id) || [];
    const hasBlockers = results.some(r => r.blocked);
    const isDuplicate = results.some(r => r.type === 'duplicate');
    
    if (annotation.isValid !== !hasBlockers) return false;
    if (annotation.isDuplicate !== isDuplicate) return false;
  }
  
  return true;
};
