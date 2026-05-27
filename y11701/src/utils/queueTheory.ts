import type { SchemeParams, QueueResult } from '@/types';

function factorial(n: number): number {
  if (n <= 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
}

export function calcMMC(params: SchemeParams): QueueResult {
  const { arrivalRate: lambda, serviceRate: mu, numCounters: c } = params;

  if (mu <= 0 || c <= 0) {
    return {
      rho: 0, P0: 0, Lq: 0, L: 0, Wq: 0, W: 0, Pw: 0, utilization: 0,
    };
  }

  const rho = lambda / (c * mu);

  if (rho >= 1) {
    return {
      rho,
      P0: 0,
      Lq: Infinity,
      L: Infinity,
      Wq: Infinity,
      W: Infinity,
      Pw: 1,
      utilization: 1,
    };
  }

  let sumP0 = 0;
  for (let n = 0; n <= c - 1; n++) {
    sumP0 += Math.pow(lambda / mu, n) / factorial(n);
  }

  const lastTerm = Math.pow(lambda / mu, c) / (factorial(c) * (1 - rho));
  const P0 = 1 / (sumP0 + lastTerm);

  const Lq = P0 * Math.pow(lambda / mu, c) * rho / (factorial(c) * Math.pow(1 - rho, 2));
  const L = Lq + lambda / mu;
  const Wq = Lq / lambda;
  const W = Wq + 1 / mu;
  const Pw = P0 * Math.pow(lambda / mu, c) / (factorial(c) * (1 - rho));
  const utilization = lambda / (c * mu);

  return {
    rho,
    P0,
    Lq: isFinite(Lq) ? Lq : 999,
    L: isFinite(L) ? L : 999,
    Wq: isFinite(Wq) ? Wq : 999,
    W: isFinite(W) ? W : 999,
    Pw,
    utilization,
  };
}

export function calcCounterRange(
  params: SchemeParams,
  minC: number,
  maxC: number,
): { c: number; result: QueueResult }[] {
  const results: { c: number; result: QueueResult }[] = [];
  for (let c = minC; c <= maxC; c++) {
    const modified = { ...params, numCounters: c };
    results.push({ c, result: calcMMC(modified) });
  }
  return results;
}

export function calcArrivalRateRange(
  params: SchemeParams,
  minLambda: number,
  maxLambda: number,
  step: number,
): { lambda: number; result: QueueResult }[] {
  const results: { lambda: number; result: QueueResult }[] = [];
  for (let lambda = minLambda; lambda <= maxLambda + step / 2; lambda += step) {
    const modified = { ...params, arrivalRate: Number(lambda.toFixed(2)) };
    results.push({ lambda: Number(lambda.toFixed(2)), result: calcMMC(modified) });
  }
  return results;
}

export function calcOptimalCounters(
  params: SchemeParams,
  maxWq: number,
  maxCounters: number,
): number {
  for (let c = 1; c <= maxCounters; c++) {
    const result = calcMMC({ ...params, numCounters: c });
    if (result.Wq <= maxWq) {
      return c;
    }
  }
  return maxCounters;
}
