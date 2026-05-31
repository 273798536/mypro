import { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';

export function useReplay() {
  const replayData = useGameStore(state => state.replayData);
  const isReplaying = useGameStore(state => state.isReplaying);
  const currentReplayFrame = useGameStore(state => state.currentReplayFrame);
  const replaySpeed = useGameStore(state => state.replaySpeed);
  const seekReplay = useGameStore(state => state.seekReplay);
  const pauseReplay = useGameStore(state => state.pauseReplay);

  const animationFrameRef = useRef<number>();
  const lastTimestampRef = useRef<number>(0);

  const playLoop = useCallback((timestamp: number) => {
    if (!replayData) return;

    const deltaTime = timestamp - lastTimestampRef.current;
    lastTimestampRef.current = timestamp;

    const frameInterval = 1000 / 30 / replaySpeed;
    const newFrame = Math.min(
      currentReplayFrame + Math.floor(deltaTime / frameInterval),
      replayData.length - 1
    );

    if (newFrame !== currentReplayFrame) {
      seekReplay(newFrame);
    }

    if (newFrame >= replayData.length - 1) {
      pauseReplay();
      return;
    }

    animationFrameRef.current = requestAnimationFrame(playLoop);
  }, [replayData, currentReplayFrame, replaySpeed, seekReplay, pauseReplay]);

  useEffect(() => {
    if (isReplaying && replayData) {
      lastTimestampRef.current = performance.now();
      animationFrameRef.current = requestAnimationFrame(playLoop);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isReplaying, replayData, playLoop]);

  const getCurrentFrameData = useCallback(() => {
    if (!replayData || currentReplayFrame >= replayData.length) return null;
    return replayData[currentReplayFrame];
  }, [replayData, currentReplayFrame]);

  const exportScore = useCallback(() => {
    const report = useGameStore.getState().exportScore();
    if (!report) return null;

    const dataStr = JSON.stringify(report, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `score_report_${report.gameId}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return report;
  }, []);

  return {
    getCurrentFrameData,
    exportScore,
    totalFrames: replayData?.length || 0,
    currentFrame: currentReplayFrame,
    isPlaying: isReplaying
  };
}
