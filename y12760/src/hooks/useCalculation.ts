import { useMemo } from 'react';
import type { Peak } from '@/types';
import { calculateBalance, DEFAULT_CORRECTION_FACTORS, type CalculationOptions } from '@/utils/calculation';

export function useCalculation(peaks: Peak[], options?: CalculationOptions) {
  const result = useMemo(() => {
    if (!peaks || peaks.length === 0) return null;
    try {
      return calculateBalance(peaks, options);
    } catch (_) {
      return null;
    }
  }, [peaks, options?.method]);

  return {
    result,
    factors: DEFAULT_CORRECTION_FACTORS,
  };
}

export default useCalculation;
