import { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../store/useGameStore';
import { checkVolumeBalance, GOOD_WINDOW } from '../utils/judgeUtils';

export function useGameLoop() {
  const {
    status,
    currentTime,
    currentTrack,
    userVolumes,
    judgedNoteIds,
    setCurrentTime,
    addJudgeRecord,
    addVolumeRecord,
    markNoteAsJudged,
    setLastJudgeResult,
    finishGame,
  } = useGameStore();

  const animationFrameRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);

  const mainPart = currentTrack.parts.find(p => p.isMain);

  const checkMissedNotes = useCallback((time: number) => {
    currentTrack.parts.forEach(part => {
      part.notes.forEach(note => {
        if (judgedNoteIds.has(note.id)) return;
        
        const timePassed = time - note.time;
        if (timePassed > GOOD_WINDOW) {
          const record = {
            noteId: note.id,
            partId: part.id,
            partName: part.name,
            judgeTime: time,
            expectedTime: note.time,
            result: 'missed' as const,
            offset: timePassed,
            volumeRatio: 0,
          };
          addJudgeRecord(record);
          markNoteAsJudged(note.id);
          setLastJudgeResult(record);
        }
      });
    });
  }, [currentTrack, judgedNoteIds, addJudgeRecord, markNoteAsJudged, setLastJudgeResult]);

  const checkVolumeBalanceLoop = useCallback((time: number) => {
    if (time % 100 > 50 && time % 100 < 60) return;

    const mainVolume = mainPart ? userVolumes[mainPart.id] || 60 : 70;

    currentTrack.parts.forEach(part => {
      const volume = userVolumes[part.id] || 60;
      const { isOverpowering } = checkVolumeBalance(volume, part.isMain, mainVolume);
      
      if (isOverpowering) {
        addVolumeRecord({
          time,
          partId: part.id,
          partName: part.name,
          volume,
          isOverpowering: true,
        });
      }
    });
  }, [currentTrack, userVolumes, mainPart, addVolumeRecord]);

  useEffect(() => {
    if (status === 'playing') {
      if (lastTimeRef.current === 0) {
        startTimeRef.current = performance.now() - pausedTimeRef.current;
      }
      
      const loop = (timestamp: number) => {
        const elapsed = timestamp - startTimeRef.current;
        setCurrentTime(elapsed);
        checkMissedNotes(elapsed);
        checkVolumeBalanceLoop(elapsed);

        if (elapsed >= currentTrack.totalDuration) {
          finishGame();
          return;
        }

        lastTimeRef.current = timestamp;
        animationFrameRef.current = requestAnimationFrame(loop);
      };

      animationFrameRef.current = requestAnimationFrame(loop);
    } else if (status === 'paused') {
      pausedTimeRef.current = currentTime;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    } else {
      lastTimeRef.current = 0;
      pausedTimeRef.current = 0;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [status, currentTrack.totalDuration, currentTime, setCurrentTime, checkMissedNotes, checkVolumeBalanceLoop, finishGame]);
}
