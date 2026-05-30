import { useEffect, useRef } from "react";
import { useGameStore } from "@/store/gameStore";
import { FIXED_DT } from "@/physics/constants";

export function useGameLoop() {
  const gameTick = useGameStore((s) => s.gameTick);
  const engine = useGameStore((s) => s.engine);
  const isReplaying = useGameStore((s) => s.isReplaying);
  const replaySpeed = useGameStore((s) => s.replaySpeed);
  const setReplayFrame = useGameStore((s) => s.setReplayFrame);
  const session = useGameStore((s) => s.session);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const accumulatorRef = useRef<number>(0);

  useEffect(() => {
    if (engine.phase !== "playing") {
      return;
    }

    lastTimeRef.current = performance.now();
    accumulatorRef.current = 0;

    const loop = (time: number) => {
      const delta = Math.min((time - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = time;
      accumulatorRef.current += delta;

      while (accumulatorRef.current >= FIXED_DT) {
        gameTick();
        accumulatorRef.current -= FIXED_DT;
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [engine.phase, gameTick]);

  useEffect(() => {
    if (!isReplaying || !session) return;

    let frame = useGameStore.getState().replayFrame;
    let lastTime = performance.now();

    const replayLoop = (time: number) => {
      const delta = (time - lastTime) / 1000;
      lastTime = time;

      if (delta > 0) {
        const framesToAdvance = Math.floor(delta * 60 * replaySpeed);
        if (framesToAdvance > 0) {
          frame = Math.min(frame + framesToAdvance, session.snapshots.length - 1);
          setReplayFrame(frame);
        }
      }

      if (frame < session.snapshots.length - 1) {
        rafRef.current = requestAnimationFrame(replayLoop);
      }
    };

    rafRef.current = requestAnimationFrame(replayLoop);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [isReplaying, session, replaySpeed, setReplayFrame]);
}
