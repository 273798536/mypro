import { useEffect } from 'react';
import { useReviewStore } from '@/store/useReviewStore';
import { URL_PARAMS } from '@/lib/contract';

export function useUrlSync() {
  const applyUrlState = useReviewStore((s) => s.applyUrlState);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    applyUrlState({
      version: sp.get(URL_PARAMS.version),
      run: sp.get(URL_PARAMS.run),
      filter: sp.get(URL_PARAMS.filter),
      sample: sp.get(URL_PARAMS.sample),
      exportKind: sp.get(URL_PARAMS.export),
    });
  }, [applyUrlState]);

  const version = useReviewStore((s) => s.version);
  const filter = useReviewStore((s) => s.filter);
  const selectedSampleId = useReviewStore((s) => s.selectedSampleId);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    sp.set(URL_PARAMS.version, version);
    sp.set(URL_PARAMS.filter, filter);
    if (selectedSampleId) sp.set(URL_PARAMS.sample, selectedSampleId);
    else sp.delete(URL_PARAMS.sample);
    const qs = sp.toString();
    const next = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, '', next);
  }, [version, filter, selectedSampleId]);
}
