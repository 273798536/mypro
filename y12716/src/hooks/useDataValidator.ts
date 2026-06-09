import { useCallback, useMemo } from 'react';
import type { Question } from '@/types';
import { validateQuestions, parseCSV } from '@/utils/validator';

export function useDataValidator() {
  const validate = useCallback((qs: Question[]) => validateQuestions(qs), []);

  const summary = useMemo(() => {
    return (gaps: ReturnType<typeof validateQuestions>['gaps']) => {
      const bySeverity = { warning: 0, error: 0 };
      const byField: Record<string, number> = {};
      for (const g of gaps) {
        bySeverity[g.severity]++;
        byField[g.fieldName] = (byField[g.fieldName] || 0) + 1;
      }
      return { bySeverity, byField };
    };
  }, []);

  return { validate, summary, parseCSV };
}
