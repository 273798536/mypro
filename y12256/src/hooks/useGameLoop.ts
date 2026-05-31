import { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '@/store/gameStore';
import { playHitSound, resumeAudioContext } from '@/engine/audio';
import { TRACK_KEYS } from '@/types';

export function useGameLoop() {
  const phase = useGameStore((s) => s.phase);
  const updateTick = useGameStore((s) => s.updateTick);
  const handleKeyPress = useGameStore((s) => s.handleKeyPress);
  const handleTrackActive = useGameStore((s) => s.handleTrackActive);
  const handleTrackInactive = useGameStore((s) => s.handleTrackInactive);
  const rafRef = useRef<number>(0);
  const activeKeysRef = useRef<Set<string>>(new Set());

  const loop = useCallback(
    (time: number) => {
      updateTick(time);
      rafRef.current = requestAnimationFrame(loop);
    },
    [updateTick],
  );

  useEffect(() => {
    if (phase === 'playing') {
      rafRef.current = requestAnimationFrame(loop);
    }
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [phase, loop]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (activeKeysRef.current.has(key)) return;

      const trackIndex = TRACK_KEYS.indexOf(key as typeof TRACK_KEYS[number]);
      if (trackIndex === -1) return;

      activeKeysRef.current.add(key);
      resumeAudioContext();

      handleTrackActive(trackIndex);

      if (phase === 'playing') {
        const now = performance.now();
        handleKeyPress(trackIndex, now);

        const state = useGameStore.getState();
        const popup = state.judgmentPopup;
        if (popup && popup.trackIndex === trackIndex) {
          playHitSound(popup.result);
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (!activeKeysRef.current.has(key)) return;

      activeKeysRef.current.delete(key);

      const trackIndex = TRACK_KEYS.indexOf(key as typeof TRACK_KEYS[number]);
      if (trackIndex === -1) return;

      handleTrackInactive(trackIndex);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [phase, handleKeyPress, handleTrackActive, handleTrackInactive]);

  return { isActive: phase === 'playing' };
}
