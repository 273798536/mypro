import { useEffect, useRef, useState, useCallback } from 'react';

export function useSyncScroll(
  leftRef: React.RefObject<HTMLElement>,
  rightRef: React.RefObject<HTMLElement>,
  enabled: boolean = true
): void {
  const isScrolling = useRef(false);
  const rafId = useRef<number | null>(null);

  const syncScroll = useCallback(
    (source: HTMLElement, target: HTMLElement) => {
      if (!enabled || isScrolling.current) return;
      isScrolling.current = true;

      const maxScroll = source.scrollHeight - source.clientHeight;
      if (maxScroll <= 0) {
        isScrolling.current = false;
        return;
      }

      const ratio = source.scrollTop / maxScroll;
      const targetMax = target.scrollHeight - target.clientHeight;
      target.scrollTop = ratio * targetMax;

      rafId.current = requestAnimationFrame(() => {
        isScrolling.current = false;
      });
    },
    [enabled]
  );

  useEffect(() => {
    const left = leftRef.current;
    const right = rightRef.current;
    if (!left || !right || !enabled) return;

    const handleLeftScroll = () => syncScroll(left, right);
    const handleRightScroll = () => syncScroll(right, left);

    left.addEventListener('scroll', handleLeftScroll, { passive: true });
    right.addEventListener('scroll', handleRightScroll, { passive: true });

    return () => {
      left.removeEventListener('scroll', handleLeftScroll);
      right.removeEventListener('scroll', handleRightScroll);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [leftRef, rightRef, enabled, syncScroll]);
}
