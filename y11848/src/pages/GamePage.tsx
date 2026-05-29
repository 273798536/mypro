import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { useGameEngine } from '../hooks/useGameEngine';
import { GameHeader } from '../components/GameHeader';
import { CacheGrid } from '../components/CacheGrid';
import { RequestQueue } from '../components/RequestQueue';
import { EventLog } from '../components/EventLog';
import { ActionPanel } from '../components/ActionPanel';
import { motion, AnimatePresence } from 'framer-motion';

export const GamePage: React.FC = () => {
  const navigate = useNavigate();
  const { status, cache, requestQueue, eventLog, config } = useGameStore();

  useGameEngine();

  useEffect(() => {
    if (status === 'finished') {
      navigate('/result');
    }
  }, [status, navigate]);

  return (
    <div className="min-h-screen bg-tech-dark p-4">
      <AnimatePresence>
        {status === 'paused' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-tech-blue rounded-2xl p-8 text-center border border-tech-cyan/30"
            >
              <div className="text-6xl mb-4">⏸️</div>
              <h2 className="text-2xl font-bold text-white mb-4">游戏暂停</h2>
              <p className="text-gray-400 mb-6">点击"继续"按钮恢复游戏</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto space-y-4">
        <GameHeader />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <CacheGrid cache={cache} gridSize={config.gridSize} />
            <ActionPanel />
          </div>

          <div className="lg:col-span-1" style={{ height: 'calc(100vh - 180px)' }}>
            <RequestQueue requests={requestQueue} />
          </div>

          <div className="lg:col-span-1" style={{ height: 'calc(100vh - 180px)' }}>
            <EventLog events={eventLog} maxItems={100} />
          </div>
        </div>
      </div>
    </div>
  );
};
