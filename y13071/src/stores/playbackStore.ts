import { create } from "zustand";
import { PLAYBACK_DURATION, anomalies, seedAnnotations } from "@/utils/mockData";
import type { KeyframeMarker } from "@/shared/types";

interface PlaybackState {
  currentTimestamp: number;
  duration: number;
  isPlaying: boolean;
  speed: number;
  keyframes: KeyframeMarker[];
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (ts: number) => void;
  setSpeed: (s: number) => void;
  tick: (deltaSec: number) => void;
}

const buildKeyframes = (): KeyframeMarker[] => {
  const result: KeyframeMarker[] = [];
  anomalies.forEach((a) =>
    result.push({ timestamp: a.timestamp, type: "ANOMALY", refId: a.id })
  );
  seedAnnotations
    .filter((a) => a.status === "ACTIVE")
    .forEach((a) =>
      result.push({ timestamp: a.timestamp, type: "ANNOTATION", refId: a.id })
    );
  return result.sort((a, b) => a.timestamp - b.timestamp);
};

export const usePlaybackStore = create<PlaybackState>((set, get) => ({
  currentTimestamp: 0,
  duration: PLAYBACK_DURATION,
  isPlaying: false,
  speed: 1,
  keyframes: buildKeyframes(),
  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  toggle: () => set({ isPlaying: !get().isPlaying }),
  seek: (ts) =>
    set({
      currentTimestamp: Math.max(0, Math.min(get().duration, ts)),
    }),
  setSpeed: (s) => set({ speed: s }),
  tick: (deltaSec) => {
    const { isPlaying, speed, currentTimestamp, duration, pause } = get();
    if (!isPlaying) return;
    const next = currentTimestamp + deltaSec * speed * 60;
    if (next >= duration) {
      set({ currentTimestamp: duration, isPlaying: false });
      pause();
    } else {
      set({ currentTimestamp: next });
    }
  },
}));
