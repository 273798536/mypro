import { useEffect } from 'react';
import { useRecordStore } from '@/store/useRecordStore';

export function useRecords() {
  const records = useRecordStore(s => s.records);
  const loaded = useRecordStore(s => s.loaded);
  const loadRecords = useRecordStore(s => s.loadRecords);
  const getRecord = useRecordStore(s => s.getRecord);

  useEffect(() => {
    if (!loaded) loadRecords();
  }, [loaded, loadRecords]);

  return { records, loaded, getRecord };
}

export default useRecords;
