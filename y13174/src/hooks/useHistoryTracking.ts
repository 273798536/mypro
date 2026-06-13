import { useDeflectionStore } from '@/store/useDeflectionStore';
import type { Remark, Snapshot, Confirmation } from '@/types';
import { useState, useMemo, useCallback } from 'react';

export function useHistoryTracking(recordId: string) {
  const [isLoading, setIsLoading] = useState(false);
  const getRecordHistory = useDeflectionStore((s) => s.getRecordHistory);
  const addRemarkToStore = useDeflectionStore((s) => s.addRemark);
  const remarksFromStore = useDeflectionStore((s) => s.remarks);
  const snapshotsFromStore = useDeflectionStore((s) => s.snapshots);
  const confirmationsFromStore = useDeflectionStore((s) => s.confirmations);

  const history = useMemo(() => getRecordHistory(recordId), [recordId, remarksFromStore, snapshotsFromStore, confirmationsFromStore]);

  const addRemark = useCallback(
    (content: string, author: string) => {
      setIsLoading(true);
      try {
        addRemarkToStore(recordId, content, author);
      } finally {
        setIsLoading(false);
      }
    },
    [recordId, addRemarkToStore]
  );

  return {
    remarks: history?.remarks ?? [],
    snapshots: history?.snapshots ?? [],
    confirmations: history?.confirmations ?? [],
    addRemark,
    isLoading,
    hasHistory: history !== null,
  };
}
