import React from 'react';
import { ResourceBar } from '../components/game/ResourceBar';
import { ModuleMap } from '../components/game/ModuleMap';
import { TaskQueue } from '../components/game/TaskQueue';
import { StaffPanel } from '../components/game/StaffPanel';
import { ControlBar } from '../components/game/ControlBar';
import { AlertBanner } from '../components/game/AlertBanner';
import { useGameStore } from '../store/useGameStore';
import { useNavigate } from 'react-router-dom';

export const GamePage: React.FC = () => {
  const { status } = useGameStore();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (status === 'finished') {
      navigate('/result');
    }
  }, [status, navigate]);

  return (
    <div className="w-full h-screen flex flex-col p-4 gap-4">
      <AlertBanner />
      
      <div className="scanline fixed inset-0 pointer-events-none z-50" />

      <div className="text-center mb-2">
        <h1 className="text-2xl font-bold text-cyber-cyan font-orbitron tracking-wider">
          空间站维修排班系统
        </h1>
        <p className="text-xs text-gray-500 mt-1">SPACE STATION MAINTENANCE SCHEDULER</p>
      </div>

      <ResourceBar />

      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
        <div className="col-span-3 h-full">
          <TaskQueue />
        </div>

        <div className="col-span-6 h-full">
          <ModuleMap />
        </div>

        <div className="col-span-3 h-full">
          <StaffPanel />
        </div>
      </div>

      <ControlBar />
    </div>
  );
};
