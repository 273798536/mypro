import { useState, useEffect } from 'react';
import type { TideVersion, ConclusionImpact } from '@/types';
import { useAppStore } from '@/store/useAppStore';

export function useTideWatcher() {
  const currentVersion = useAppStore(s => s.tide.currentVersion);
  const impacts = useAppStore(s => s.tide.impacts);
  const bannerVisible = useAppStore(s => s.tide.bannerVisible);
  const toggleTideBanner = useAppStore(s => s.toggleTideBanner);
  const syncTideVersion = useAppStore(s => s.syncTideVersion);

  const [countdown, setCountdown] = useState<{ h: number; m: number; s: number } | null>(null);

  useEffect(() => {
    if (!currentVersion || currentVersion.status !== 'delayed') {
      setCountdown(null);
      return;
    }
    const est = new Date('2026-06-12 11:30:00').getTime();
    const tick = () => {
      const now = Date.now();
      let diff = Math.max(0, est - now);
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1000);
      setCountdown({ h, m, s });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [currentVersion]);

  const groupedImpacts = {
    critical: impacts.filter(i => i.impactLevel === 'critical'),
    major: impacts.filter(i => i.impactLevel === 'major'),
    minor: impacts.filter(i => i.impactLevel === 'minor'),
  };

  return {
    currentVersion: currentVersion as TideVersion | null,
    impacts,
    groupedImpacts,
    bannerVisible,
    toggleTideBanner,
    syncTideVersion,
    countdown,
  };
}

export type { TideVersion, ConclusionImpact };
