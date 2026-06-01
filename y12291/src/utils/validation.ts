import type { QuantumState, ValidationIssue, ValidationStatus } from '@/types/quantum';

const NORMALIZATION_TOLERANCE = 0.01;

export function validateNormalization(alpha: number, beta: number): { isNormalized: boolean | null; delta: number | null; issue: ValidationIssue | null } {
  const pAlpha = Math.pow(Math.abs(alpha), 2);
  const pBeta = Math.pow(Math.abs(beta), 2);
  const total = pAlpha + pBeta;
  const delta = Math.abs(total - 1);

  if (delta <= NORMALIZATION_TOLERANCE) {
    return { isNormalized: true, delta, issue: null };
  }

  return {
    isNormalized: false,
    delta,
    issue: {
      id: `norm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: 'UNNORMALIZED_PROBABILITY',
      severity: 'error',
      message: `概率未归一: |α|²+|β|² = ${total.toFixed(4)}，偏差 Δ = ${delta.toFixed(4)}`,
      relatedField: 'alpha,beta',
      relatedStateId: '',
      detectedAt: Date.now(),
      resolvedAt: null,
    },
  };
}

export function validatePhase(phi: number): { isInRange: boolean; overflow: number | null; issue: ValidationIssue | null } {
  if (phi >= 0 && phi < 2 * Math.PI) {
    return { isInRange: true, overflow: null, issue: null };
  }

  let overflow: number;
  if (phi < 0) {
    overflow = phi;
  } else {
    overflow = phi - 2 * Math.PI;
  }

  return {
    isInRange: false,
    overflow,
    issue: {
      id: `phase-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: 'PHASE_OVERFLOW',
      severity: 'warning',
      message: `相位越界: φ = ${phi.toFixed(4)}，越出量 ${overflow.toFixed(4)}（有效范围 [0, 2π)）`,
      relatedField: 'phi',
      relatedStateId: '',
      detectedAt: Date.now(),
      resolvedAt: null,
    },
  };
}

export function validateMeasurementBasis(state: QuantumState): { hasConfusion: boolean; issue: ValidationIssue | null } {
  if (!state.measurementBasis) {
    return { hasConfusion: false, issue: null };
  }

  const basisLabels = state.probabilityBars.map((bar) => bar.basis);
  const hasMismatch = basisLabels.some((label) => {
    if (state.measurementBasis!.type === 'custom') return false;
    const expected = state.measurementBasis!.type;
    return label !== expected && label !== `${expected}-0` && label !== `${expected}-1`;
  });

  if (!hasMismatch) {
    return { hasConfusion: false, issue: null };
  }

  return {
    hasConfusion: true,
    issue: {
      id: `basis-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: 'BASIS_CONFUSION',
      severity: 'error',
      message: `测量基混淆: 测量基为 ${state.measurementBasis.type}，但概率条中存在不匹配的基: ${basisLabels.join(', ')}`,
      relatedField: 'measurementBasis,probabilityBars',
      relatedStateId: state.id,
      detectedAt: Date.now(),
      resolvedAt: null,
    },
  };
}

export function validateQuantumState(state: QuantumState): ValidationStatus {
  const issues: ValidationIssue[] = [];

  const normResult = validateNormalization(state.alpha, state.beta);
  const isNormalized = normResult.isNormalized;
  const normalizationDelta = normResult.delta;
  if (normResult.issue) {
    normResult.issue.relatedStateId = state.id;
    issues.push(normResult.issue);
  }

  const phaseResult = validatePhase(state.phi);
  const isPhaseInRange = phaseResult.isInRange;
  const phaseOverflow = phaseResult.overflow;
  if (phaseResult.issue) {
    phaseResult.issue.relatedStateId = state.id;
    issues.push(phaseResult.issue);
  }

  const basisResult = validateMeasurementBasis(state);
  const measurementBasisConfusion = basisResult.hasConfusion;
  if (basisResult.issue) {
    issues.push(basisResult.issue);
  }

  return {
    isNormalized,
    normalizationDelta,
    isPhaseInRange,
    phaseOverflow,
    measurementBasisConfusion,
    issues,
  };
}

export function computeDataGap(state: QuantumState): { hasGap: boolean; fields: string[] } {
  const fields: string[] = [];
  if (state.measurementBasis === null) fields.push('measurementBasis');
  if (state.probabilityBars.length === 0) fields.push('probabilityBars');
  if (state.normalizedProbability === null) fields.push('normalizedProbability');
  return { hasGap: fields.length > 0, fields };
}

export function blochSphereCoordinates(theta: number, phi: number): [number, number, number] {
  const x = Math.sin(theta) * Math.cos(phi);
  const y = Math.sin(theta) * Math.sin(phi);
  const z = Math.cos(theta);
  return [x, y, z];
}
