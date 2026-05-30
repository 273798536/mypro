import type { PolicySample, SimulationParams, SimulationResult, ExtremeClaim, SampleWarning } from '@/types';

export function poissonRandom(lambda: number): number {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= Math.random();
  } while (p > L);
  return k - 1;
}

export function buildEmpiricalCDF(claims: number[]): { sorted: number[]; cdf: number[] } {
  const sorted = [...claims].sort((a, b) => a - b);
  const n = sorted.length;
  const cdf = sorted.map((_, i) => (i + 1) / (n + 1));
  return { sorted, cdf };
}

export function sampleFromEmpirical(
  ecdf: { sorted: number[]; cdf: number[] },
  tailAlpha: number,
  tailXm: number
): { value: number; isTail: boolean } {
  const u = Math.random();
  const lastCdf = ecdf.cdf[ecdf.cdf.length - 1];
  if (u <= lastCdf) {
    let idx = 0;
    for (let i = 0; i < ecdf.cdf.length; i++) {
      if (ecdf.cdf[i] >= u) {
        idx = i;
        break;
      }
    }
    return { value: ecdf.sorted[idx], isTail: false };
  }
  const x = tailXm / Math.pow(Math.random(), 1 / tailAlpha);
  return { value: x, isTail: true };
}

export function estimateParetoTail(claims: number[]): { alpha: number; xm: number } {
  const sorted = [...claims].sort((a, b) => a - b);
  const p90Index = Math.floor(sorted.length * 0.9);
  const tailValues = sorted.slice(p90Index);
  if (tailValues.length < 2) {
    return { alpha: 2, xm: (sorted[sorted.length - 1] ?? 0) * 1.1 };
  }
  const xm = tailValues[0];
  const sumLn = tailValues.reduce((acc, xi) => acc + Math.log(xi / xm), 0);
  const alpha = tailValues.length / sumLn;
  return { alpha, xm };
}

export function applyDeductibleLimit(
  claim: number,
  deductible: number,
  limit: number
): { adjusted: number; deductibleApplied: number; interceptType: 'deductible' | 'limit' | 'none' } {
  if (claim <= deductible) {
    return { adjusted: 0, deductibleApplied: claim, interceptType: 'deductible' };
  }
  if (claim - deductible >= limit) {
    return { adjusted: limit, deductibleApplied: deductible, interceptType: 'limit' };
  }
  return { adjusted: claim - deductible, deductibleApplied: deductible, interceptType: 'none' };
}

export function detectSampleWarnings(
  policies: PolicySample[],
  params: SimulationParams
): SampleWarning[] {
  const warnings: SampleWarning[] = [];
  const allClaims = policies.flatMap(p => p.claimAmounts);
  const policyIds = policies.map(p => p.id);

  if (allClaims.length < 30) {
    warnings.push({
      type: 'insufficient_sample',
      message: `Total claims (${allClaims.length}) below minimum threshold of 30`,
      affectedPolicies: policyIds,
      suggestedAction: 'Increase sample size or add more policy data'
    });
  }

  const sorted = [...allClaims].sort((a, b) => a - b);
  const p90Index = Math.floor(sorted.length * 0.9);
  const tailClaims = sorted.slice(p90Index);
  if (tailClaims.length < 5) {
    warnings.push({
      type: 'thin_tail',
      message: `Only ${tailClaims.length} claims above 90th percentile (minimum 5 required)`,
      affectedPolicies: policyIds,
      suggestedAction: 'Collect more extreme claim data for better tail estimation'
    });
  }

  const rangeMin = params.deductible * 0.8;
  const rangeMax = params.deductible * 1.2;
  const nearDeductible = allClaims.filter(c => c >= rangeMin && c <= rangeMax).length;
  if (nearDeductible < 3) {
    warnings.push({
      type: 'deductible_boundary',
      message: `Only ${nearDeductible} claims within 20% range around deductible (${params.deductible})`,
      affectedPolicies: policyIds,
      suggestedAction: 'Review deductible level relative to claim distribution'
    });
  }

  return warnings;
}

function percentile(arr: number[], p: number): number {
  const idx = p * (arr.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  const frac = idx - lo;
  return arr[lo] * (1 - frac) + arr[hi] * frac;
}

export function runSimulation(
  policies: PolicySample[],
  params: SimulationParams,
  onProgress?: (pct: number) => void
): SimulationResult {
  const allClaims = policies.flatMap(p => p.claimAmounts);
  const lambda = allClaims.length / policies.length;
  const ecdf = buildEmpiricalCDF(allClaims);
  const { alpha: tailAlpha, xm: tailXm } = estimateParetoTail(allClaims);

  const sortedOriginal = [...allClaims].sort((a, b) => a - b);
  const p99Index = Math.floor(sortedOriginal.length * 0.99);
  const p99Threshold = sortedOriginal[p99Index] ?? sortedOriginal[sortedOriginal.length - 1] ?? 0;

  const lossDistribution: number[] = [];
  const extremeClaims: ExtremeClaim[] = [];

  for (let iter = 0; iter < params.iterations; iter++) {
    const N = poissonRandom(lambda * policies.length);
    let totalLoss = 0;

    for (let c = 0; c < N; c++) {
      const { value: rawAmount } = sampleFromEmpirical(ecdf, tailAlpha, tailXm);
      const sourcePolicy = policies[Math.floor(Math.random() * policies.length)];
      const { adjusted, deductibleApplied, interceptType } = applyDeductibleLimit(
        rawAmount,
        params.deductible,
        params.limit
      );
      totalLoss += adjusted;

      const isExtremeRaw = rawAmount > p99Threshold;
      const isIntercepted = interceptType === 'deductible' || interceptType === 'limit';

      if (isExtremeRaw || isIntercepted) {
        extremeClaims.push({
          simulationIndex: iter,
          rawAmount,
          cappedAmount: adjusted,
          deductibleApplied,
          sourcePolicyId: sourcePolicy.id,
          sourceField: sourcePolicy.lineOfBusiness,
          severity: isExtremeRaw ? 'critical' : 'high',
          interceptType: isIntercepted ? interceptType : 'uncaught'
        });
      }
    }

    lossDistribution.push(totalLoss);

    if (onProgress && (iter + 1) % 100 === 0) {
      onProgress(((iter + 1) / params.iterations) * 100);
    }
  }

  extremeClaims.sort((a, b) => b.rawAmount - a.rawAmount);
  const trimmedExtreme = extremeClaims.slice(0, 50);

  const sortedLosses = [...lossDistribution].sort((a, b) => a - b);

  const var95 = percentile(sortedLosses, 0.95);
  const var99 = percentile(sortedLosses, 0.99);

  const aboveVar95 = sortedLosses.filter(l => l >= var95);
  const aboveVar99 = sortedLosses.filter(l => l >= var99);
  const tvar95 = aboveVar95.length > 0 ? aboveVar95.reduce((a, b) => a + b, 0) / aboveVar95.length : var95;
  const tvar99 = aboveVar99.length > 0 ? aboveVar99.reduce((a, b) => a + b, 0) / aboveVar99.length : var99;

  const n = lossDistribution.length;
  const meanLoss = lossDistribution.reduce((a, b) => a + b, 0) / n;
  const variance = lossDistribution.reduce((a, b) => a + (b - meanLoss) ** 2, 0) / n;
  const stdLoss = Math.sqrt(variance);

  const purePremium = meanLoss;
  const grossPremium = purePremium * (1 + params.safetyLoading) / (1 - params.expenseRatio);
  const combinedRatio = purePremium / grossPremium;

  const warnings = detectSampleWarnings(policies, params);

  return {
    purePremium,
    grossPremium,
    combinedRatio,
    var95,
    var99,
    tvar95,
    tvar99,
    lossDistribution,
    extremeClaims: trimmedExtreme,
    sampleWarnings: warnings,
    meanLoss,
    stdLoss,
    iterations: params.iterations
  };
}
