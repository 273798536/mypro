import { useDeflectionStore } from '@/store/useDeflectionStore';
import { useMemo } from 'react';

export function useUnifiedDataSource() {
  const unifiedDataSource = useDeflectionStore((s) => s.unifiedDataSource);
  const filterCriteria = useDeflectionStore((s) => s.filterCriteria);

  const statistics = useMemo(
    () => unifiedDataSource?.statistics ?? null,
    [unifiedDataSource]
  );

  const records = useMemo(
    () => unifiedDataSource?.records ?? [],
    [unifiedDataSource]
  );

  const exceptionQueue = useMemo(
    () => unifiedDataSource?.exceptionQueue ?? [],
    [unifiedDataSource]
  );

  return {
    statistics,
    records,
    exceptionQueue,
    filterCriteria,
    isLoading: unifiedDataSource === null,
  };
}
