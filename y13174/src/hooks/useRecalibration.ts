import { useState, useCallback } from 'react';
import { useDeflectionStore } from '@/store/useDeflectionStore';
import type { RecalcResult } from '@/types';

export function useRecalibration() {
  const [recalcResult, setRecalcResult] = useState<RecalcResult | null>(null);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [lastRecalcTime, setLastRecalcTime] = useState<string | null>(null);
  const recalibrateBoundary = useDeflectionStore((s) => s.recalibrateBoundary);

  const runRecalc = useCallback(
    (recordId: string) => {
      setIsCalibrating(true);
      try {
        const result = recalibrateBoundary(recordId);
        setRecalcResult(result);
        setLastRecalcTime(new Date().toISOString());
        return result;
      } finally {
        setIsCalibrating(false);
      }
    },
    [recalibrateBoundary]
  );

  return {
    recalcResult,
    isCalibrating,
    runRecalc,
    lastRecalcTime,
  };
}
