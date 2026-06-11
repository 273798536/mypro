import { useEffect, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';

function parseHash() {
  const hash = window.location.hash.replace(/^#/, '');
  if (!hash) return null;
  const params = new URLSearchParams(hash);
  const result: Record<string, string> = {};
  params.forEach((v, k) => {
    result[k] = v;
  });
  return result;
}

function debounce<T extends (...args: unknown[]) => void>(fn: T, wait = 150) {
  let t: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

export function useHashSync() {
  const initialized = useRef(false);

  useEffect(() => {
    const parsed = parseHash();
    if (parsed) {
      const patch: Record<string, unknown> = {};
      const filterPatch: Record<string, string> = {};
      if (parsed.station) filterPatch.station = parsed.station;
      if (parsed.dateFrom) filterPatch.dateFrom = parsed.dateFrom;
      if (parsed.dateTo) filterPatch.dateTo = parsed.dateTo;
      if (parsed.statusFilter) filterPatch.statusFilter = parsed.statusFilter;
      if (Object.keys(filterPatch).length) patch.filters = filterPatch;
      if (parsed.selected) patch.selectedRecordId = parsed.selected;
      if (parsed.point) patch.selectedPointId = parsed.point;
      if (Object.keys(patch).length) {
        useAppStore.setState(patch as Partial<ReturnType<typeof useAppStore.getState>>);
      }
    }
    initialized.current = true;
  }, []);

  useEffect(() => {
    if (!initialized.current) return;

    const sync = () => {
      const s = useAppStore.getState();
      const params = new URLSearchParams();
      if (s.filters.station) params.set('station', s.filters.station);
      if (s.filters.dateFrom) params.set('dateFrom', s.filters.dateFrom);
      if (s.filters.dateTo) params.set('dateTo', s.filters.dateTo);
      if (s.filters.statusFilter && s.filters.statusFilter !== 'all') params.set('statusFilter', s.filters.statusFilter);
      if (s.selectedRecordId) params.set('selected', s.selectedRecordId);
      if (s.selectedPointId) params.set('point', s.selectedPointId);
      const str = params.toString();
      window.location.hash = str ? `#${str}` : '';
    };

    const debouncedSync = debounce(sync, 150);
    const unsub = useAppStore.subscribe(debouncedSync);
    return unsub;
  }, []);
}
