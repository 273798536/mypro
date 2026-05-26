import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import GameHeader from '@/components/game/GameHeader';
import PatientQueue from '@/components/game/PatientQueue';
import RoomPanel from '@/components/game/RoomPanel';
import EventPanel from '@/components/game/EventPanel';
import GameControls from '@/components/game/GameControls';
import AlertModal from '@/components/common/AlertModal';
import { useGameStore } from '@/stores/useGameStore';
import type { GameRecord } from '@/types';

const GamePage: React.FC = () => {
  const navigate = useNavigate();
  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [alertConfig, setAlertConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'warning' | 'danger' | 'info';
  }>({ isOpen: false, title: '', message: '', type: 'warning' });

  const {
    status,
    elapsedTime,
    totalTime,
    score,
    maxScore,
    patients,
    rooms,
    events,
    speed,
    startGame,
    pauseGame,
    resumeGame,
    restartGame,
    endGame,
    update,
    setSpeed,
    getWaitingPatients,
    getCompletedPatients,
  } = useGameStore();

  const waitingPatients = getWaitingPatients();
  const completedPatients = getCompletedPatients();

  const gameLoop = useCallback((currentTime: number) => {
    if (lastTimeRef.current === 0) {
      lastTimeRef.current = currentTime;
    }

    const deltaTime = (currentTime - lastTimeRef.current) / 1000;
    lastTimeRef.current = currentTime;

    if (status === 'playing') {
      update(deltaTime);
    }

    animationRef.current = requestAnimationFrame(gameLoop);
  }, [status, update]);

  useEffect(() => {
    animationRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameLoop]);

  useEffect(() => {
    if (status === 'playing' && elapsedTime >= totalTime) {
      handleEndGame();
    }
  }, [elapsedTime, totalTime, status]);

  useEffect(() => {
    const criticalEvents = events.filter(e => e.type === 'critical_miss' && !e.read);
    if (criticalEvents.length > 0) {
      const latestEvent = criticalEvents[0];
      setAlertConfig({
        isOpen: true,
        title: '⚠️ 危重漏分警告',
        message: latestEvent.message,
        type: 'danger',
      });
    }

    const timeoutEvents = events.filter(e => e.type === 'timeout' && !e.read);
    if (timeoutEvents.length > 0 && criticalEvents.length === 0) {
      const latestEvent = timeoutEvents[0];
      setAlertConfig({
        isOpen: true,
        title: '⏰ 等候超时提醒',
        message: latestEvent.message,
        type: 'warning',
      });
    }

    const reEvaluateEvents = events.filter(e => e.type === 'priority_change' && !e.read);
    if (reEvaluateEvents.length > 0 && criticalEvents.length === 0 && timeoutEvents.length === 0) {
      const latestEvent = reEvaluateEvents[0];
      setAlertConfig({
        isOpen: true,
        title: '🔄 优先级变更提示',
        message: latestEvent.message,
        type: 'info',
      });
    }
  }, [events]);

  const handleEndGame = () => {
    const record = endGame();
    navigate('/result', { state: { record } });
  };

  const handleStart = () => {
    startGame();
  };

  const handleRestart = () => {
    restartGame();
    setSelectedPatientId(null);
  };

  const handleCloseAlert = () => {
    setAlertConfig(prev => ({ ...prev, isOpen: false }));
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-[1600px] mx-auto space-y-4">
        <GameHeader
          status={status}
          elapsedTime={elapsedTime}
          totalTime={totalTime}
          score={score}
          maxScore={maxScore}
          waitingCount={waitingPatients.length}
          completedCount={completedPatients.length}
          speed={speed}
          onSpeedChange={setSpeed}
        />

        <div className="grid grid-cols-12 gap-4" style={{ height: 'calc(100vh - 280px)' }}>
          <div className="col-span-4 pl-8">
            <PatientQueue patients={patients} />
          </div>

          <div className="col-span-5 space-y-4">
            <RoomPanel
              rooms={rooms}
              patients={patients}
              selectedPatientId={selectedPatientId}
              onSelectPatient={setSelectedPatientId}
            />
            <GameControls
              status={status}
              onStart={handleStart}
              onPause={pauseGame}
              onResume={resumeGame}
              onRestart={handleRestart}
              onEnd={handleEndGame}
            />
          </div>

          <div className="col-span-3">
            <EventPanel events={events} />
          </div>
        </div>
      </div>

      <AlertModal
        isOpen={alertConfig.isOpen}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onClose={handleCloseAlert}
        autoClose={alertConfig.type !== 'danger'}
        autoCloseDelay={4000}
      />
    </div>
  );
};

export default GamePage;
