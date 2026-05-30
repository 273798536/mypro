import type { IterationRule, InitialShape, ValidationResult } from "@/types";
import { getIterationExplosionThreshold, getColorOverlapThreshold } from "@/data/paramGuards";
import { estimatePrimitiveCount } from "@/engine/fractal";

const uid = () => crypto.randomUUID();

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.match(/^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/);
  if (!m) return [0, 0, 0];
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

function colorDistance(c1: string, c2: string): number {
  const [r1, g1, b1] = hexToRgb(c1);
  const [r2, g2, b2] = hexToRgb(c2);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

export function validateIterationExplosion(
  rule: IterationRule,
  shape: InitialShape
): ValidationResult[] {
  const results: ValidationResult[] = [];
  const { maxPrimitives, maxDepth } = getIterationExplosionThreshold();
  const primitiveCount = estimatePrimitiveCount(rule, shape);

  if (primitiveCount > maxPrimitives) {
    results.push({
      id: uid(),
      type: "iteration_explosion",
      severity: "error",
      message: `图元数量预估 ${primitiveCount.toLocaleString()} 超过阈值 ${maxPrimitives.toLocaleString()}，可能导致浏览器卡死`,
      sourceRecordId: rule.id,
      sourceFieldName: "maxIterations",
      details: { primitiveCount, threshold: maxPrimitives, transformCount: rule.transforms.length },
      detectedAt: Date.now(),
    });
  }

  if (rule.maxIterations > maxDepth) {
    results.push({
      id: uid(),
      type: "iteration_explosion",
      severity: "warning",
      message: `迭代深度 ${rule.maxIterations} 超过推荐上限 ${maxDepth}`,
      sourceRecordId: rule.id,
      sourceFieldName: "maxIterations",
      details: { currentDepth: rule.maxIterations, maxDepth },
      detectedAt: Date.now(),
    });
  }

  return results;
}

export function validateRuleIllegal(rule: IterationRule): ValidationResult[] {
  const results: ValidationResult[] = [];

  rule.transforms.forEach((t, idx) => {
    const det = t.a * t.d - t.b * t.c;
    if (Math.abs(det) < 1e-10) {
      results.push({
        id: uid(),
        type: "rule_illegal",
        severity: "error",
        message: `变换 #${idx + 1} 矩阵行列式为0（或接近0），变换不可逆`,
        sourceRecordId: rule.id,
        sourceFieldName: `transforms[${idx}]`,
        details: { index: idx, determinant: det, transform: t },
        detectedAt: Date.now(),
      });
    }

    const scaleFactor = Math.sqrt(Math.abs(det));
    if (scaleFactor > 1) {
      results.push({
        id: uid(),
        type: "rule_illegal",
        severity: "warning",
        message: `变换 #${idx + 1} 缩放因子 ${scaleFactor.toFixed(3)} > 1，分形可能不收敛`,
        sourceRecordId: rule.id,
        sourceFieldName: `transforms[${idx}]`,
        details: { index: idx, scaleFactor, transform: t },
        detectedAt: Date.now(),
      });
    }

    if (t.probability <= 0 || t.probability > 1) {
      results.push({
        id: uid(),
        type: "rule_illegal",
        severity: "error",
        message: `变换 #${idx + 1} 概率 ${t.probability} 不在(0,1]区间`,
        sourceRecordId: rule.id,
        sourceFieldName: `transforms[${idx}].probability`,
        details: { index: idx, probability: t.probability },
        detectedAt: Date.now(),
      });
    }
  });

  const probSum = rule.transforms.reduce((s, t) => s + t.probability, 0);
  if (Math.abs(probSum - 1) > 0.01 && rule.transforms.length > 1) {
    results.push({
      id: uid(),
      type: "rule_illegal",
      severity: "warning",
      message: `所有变换概率之和为 ${probSum.toFixed(3)}，建议调整为1`,
      sourceRecordId: rule.id,
      sourceFieldName: "transforms[].probability",
      details: { sum: probSum },
      detectedAt: Date.now(),
    });
  }

  return results;
}

export function validateColorOverlap(rule: IterationRule): ValidationResult[] {
  const results: ValidationResult[] = [];
  const { sameLayer, crossLayer } = getColorOverlapThreshold();
  const colors = rule.colorScheme.colors;

  for (let i = 0; i < colors.length; i++) {
    for (let j = i + 1; j < colors.length; j++) {
      const dist = colorDistance(colors[i], colors[j]);
      if (dist < sameLayer) {
        results.push({
          id: uid(),
          type: "color_overlap",
          severity: dist < crossLayer ? "error" : "warning",
          message: `颜色 ${colors[i]} 与 ${colors[j]} RGB差值 ${dist.toFixed(1)} < ${sameLayer}，视觉上难以区分`,
          sourceRecordId: rule.id,
          sourceFieldName: `colorScheme.colors[${i}],colorScheme.colors[${j}]`,
          details: { color1: colors[i], color2: colors[j], distance: dist, threshold: sameLayer, indices: [i, j] },
          detectedAt: Date.now(),
        });
      }
    }
  }

  return results;
}

export function runAllValidations(
  rule: IterationRule,
  shape: InitialShape
): ValidationResult[] {
  return [
    ...validateIterationExplosion(rule, shape),
    ...validateRuleIllegal(rule),
    ...validateColorOverlap(rule),
  ];
}
