import { useCallback } from 'react';
import { useRecordsStore } from '@/store/records';

export function useParamLinkage() {
  const setHighlightedField = useRecordsStore((s) => s.setHighlightedField);
  const highlightedField = useRecordsStore((s) => s.highlightedField);
  const addParamChange = useRecordsStore((s) => s.addParamChange);

  const flashField = useCallback(
    (field: string, duration = 1400) => {
      setHighlightedField(field);
      window.setTimeout(() => setHighlightedField(null), duration);
    },
    [setHighlightedField]
  );

  const changeAndTrace = useCallback(
    (recordId: string, sourceField: string, oldValue: string, newValue: string, reason: string) => {
      addParamChange(recordId, { sourceField, oldValue, newValue, reason });
      flashField(sourceField);
    },
    [addParamChange, flashField]
  );

  return { highlightedField, flashField, changeAndTrace };
}
