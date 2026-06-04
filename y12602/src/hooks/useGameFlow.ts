import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { formatTime } from '@/utils/time';

export function useGameFlow() {
  const {
    gameStatus,
    startTime,
    startGame,
    pauseGame,
    resumeGame,
    resetGame,
    finishGame,
    getElapsedTime,
    currentRound,
  } = useAppStore();

  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (gameStatus !== 'playing') return;

    const interval = setInterval(() => {
      setElapsedTime(getElapsedTime());
    }, 1000);

    return () => clearInterval(interval);
  }, [gameStatus, getElapsedTime]);

  useEffect(() => {
    setElapsedTime(getElapsedTime());
  }, [gameStatus, getElapsedTime]);

  const statusText = {
    idle: '准备开始',
    playing: '审核进行中',
    paused: '已暂停',
    finished: '审核完成',
  }[gameStatus];

  const statusColor = {
    idle: 'text-neutral-500',
    playing: 'text-success',
    paused: 'text-warning',
    finished: 'text-primary',
  }[gameStatus];

  return {
    status: gameStatus,
    statusText,
    statusColor,
    startTime,
    elapsedTime,
    formattedTime: formatTime(elapsedTime),
    currentRound,
    start: startGame,
    pause: pauseGame,
    resume: resumeGame,
    reset: resetGame,
    finish: finishGame,
    canStart: gameStatus === 'idle',
    canPause: gameStatus === 'playing',
    canResume: gameStatus === 'paused',
    canFinish: gameStatus === 'playing',
    canReset: gameStatus !== 'idle',
  };
}
