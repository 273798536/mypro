import { useEffect, useRef, useCallback } from 'react';
import { Track, Note, JudgmentResult, SCORE_VALUES } from '../types';
import { useGameStore } from '../store/gameStore';
import { calculateTimingError, judgeTiming, isWithinJudgmentWindow } from '../utils/rhythmUtils';
import {
  detectSyncopationMiss,
  detectSpeedChange,
  detectComboBreak,
  detectWrongTrack,
  createErrorRecord
} from '../utils/errorAnalysis';

interface UseGameEngineProps {
  track: Track | null;
}

export function useGameEngine({ track }: UseGameEngineProps) {
  const {
    status,
    currentTime,
    settings,
    combo,
    judgments,
    setStatus,
    setCurrentTime,
    addScore,
    incrementCombo,
    resetCombo,
    setSelectedTrack,
    addJudgment,
    addError,
    resetGame
  } = useGameStore();

  const gameLoopRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const processedNotesRef = useRef<Set<string>>(new Set());
  const pendingNotesRef = useRef<Note[]>([]);

  const startGame = useCallback(() => {
    if (!track) return;
    
    resetGame();
    processedNotesRef.current.clear();
    pendingNotesRef.current = [...track.notes];
    startTimeRef.current = performance.now();
    setStatus('playing');
  }, [track, resetGame, setStatus]);

  const pauseGame = useCallback(() => {
    setStatus('paused');
  }, [setStatus]);

  const resumeGame = useCallback(() => {
    if (status !== 'paused') return;
    startTimeRef.current = performance.now() - currentTime;
    setStatus('playing');
  }, [status, currentTime, setStatus]);

  const restartGame = useCallback(() => {
    startGame();
  }, [startGame]);

  const goToResult = useCallback(() => {
    setStatus('finished');
  }, [setStatus]);

  const processNoteJudgment = useCallback((note: Note, hitTime: number, selectedTrack: number | null) => {
    const timingError = calculateTimingError(hitTime, note.time);
    const judgment = judgeTiming(timingError, settings.sensitivity, note.isSyncopated);
    
    const isCorrectTrack = selectedTrack === note.track;
    const actualJudgment = isCorrectTrack ? judgment : 'miss';
    
    const result: JudgmentResult = {
      noteId: note.id,
      hitTime,
      judgment: actualJudgment,
      timingError,
      isSyncopated: note.isSyncopated,
      correctTrack: note.track,
      selectedTrack: selectedTrack ?? undefined
    };

    addJudgment(result);

    if (isCorrectTrack && isWithinJudgmentWindow(timingError, settings.sensitivity)) {
      const score = SCORE_VALUES[actualJudgment] * (note.isSyncopated ? 1.5 : 1);
      addScore(Math.floor(score));
      incrementCombo();
    } else {
      resetCombo();
    }

    if (note.isSyncopated) {
      const syncopationError = detectSyncopationMiss(result);
      if (syncopationError) addError(syncopationError);
    }

    if (!isCorrectTrack) {
      const wrongTrackError = detectWrongTrack(result);
      if (wrongTrackError) addError(wrongTrackError);
    }

    if (combo > 5) {
      const comboError = detectComboBreak(combo, result);
      if (comboError) addError(comboError);
    }

    const recentJudgments = judgments.slice(-3);
    if (recentJudgments.length === 3) {
      const speedError = detectSpeedChange(recentJudgments);
      if (speedError) addError(speedError);
    }

    if (note.delayed || note.missingField) {
      addError(createErrorRecord('data_anomaly', hitTime, note.id,
        note.delayed ? `音符延迟${note.delayAmount}ms到达` : '音符数据缺失字段'));
    }
  }, [settings.sensitivity, combo, judgments, addJudgment, addScore, incrementCombo, resetCombo, addError]);

  const handleTrackSelect = useCallback((trackNum: number) => {
    if (status !== 'playing') return;
    
    setSelectedTrack(trackNum);
    const hitTime = currentTime;

    const judgeableNotes = pendingNotesRef.current.filter(note => 
      !processedNotesRef.current.has(note.id) &&
      isWithinJudgmentWindow(calculateTimingError(hitTime, note.time), settings.sensitivity)
    );

    if (judgeableNotes.length > 0) {
      const closestNote = judgeableNotes.reduce((closest, note) => {
        const closestError = Math.abs(calculateTimingError(hitTime, closest.time));
        const noteError = Math.abs(calculateTimingError(hitTime, note.time));
        return noteError < closestError ? note : closest;
      });

      processNoteJudgment(closestNote, hitTime, trackNum);
      processedNotesRef.current.add(closestNote.id);
      pendingNotesRef.current = pendingNotesRef.current.filter(n => n.id !== closestNote.id);
    }

    setTimeout(() => setSelectedTrack(null), 200);
  }, [status, currentTime, settings.sensitivity, setSelectedTrack, processNoteJudgment]);

  useEffect(() => {
    if (status !== 'playing' || !track) {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
        gameLoopRef.current = null;
      }
      return;
    }

    const gameLoop = () => {
      const elapsed = performance.now() - startTimeRef.current;
      setCurrentTime(elapsed);

      const missedNotes = pendingNotesRef.current.filter(note => 
        !processedNotesRef.current.has(note.id) &&
        elapsed - note.time > 200
      );

      missedNotes.forEach(note => {
        processNoteJudgment(note, elapsed, null);
        processedNotesRef.current.add(note.id);
        pendingNotesRef.current = pendingNotesRef.current.filter(n => n.id !== note.id);
      });

      const lastNoteTime = Math.max(...track.notes.map(n => n.time));
      if (elapsed > lastNoteTime + 1000 && pendingNotesRef.current.length === 0) {
        setStatus('finished');
        return;
      }

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [status, track, setCurrentTime, setStatus, processNoteJudgment]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (status !== 'playing') return;
      
      const keyMap: Record<string, number> = {
        '1': 1,
        '2': 2,
        '3': 3,
        '4': 4,
        'd': 1,
        'f': 2,
        'j': 3,
        'k': 4,
        'D': 1,
        'F': 2,
        'J': 3,
        'K': 4
      };

      if (keyMap[e.key]) {
        e.preventDefault();
        handleTrackSelect(keyMap[e.key]);
      }
      
      if (e.key === ' ' || e.key === 'Escape') {
        e.preventDefault();
        if (status === 'playing') {
          pauseGame();
        } else if (status === 'paused') {
          resumeGame();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, handleTrackSelect, pauseGame, resumeGame]);

  return {
    startGame,
    pauseGame,
    resumeGame,
    restartGame,
    goToResult,
    handleTrackSelect,
    gameTime: currentTime
  };
}
