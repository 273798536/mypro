import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Clock, Zap, Target } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { VinylRecord } from '@/components/VinylRecord';
import { ToolPanel } from '@/components/ToolPanel';
import { FeedbackModal } from '@/components/FeedbackModal';

export const GamePage: React.FC = () => {
  const navigate = useNavigate();
  const {
    status,
    score,
    problemSpots,
    selectedTool,
    combo,
    timeRemaining,
    showFeedback,
    lastFeedback,
    selectTool,
    handleClick,
    clearFeedback,
    setTimeRemaining,
  } = useGameStore();

  useEffect(() => {
    if (status !== 'playing') {
      navigate('/');
    }
  }, [status, navigate]);

  useEffect(() => {
    if (status === 'playing' && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(timeRemaining - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [status, timeRemaining, setTimeRemaining]);

  useEffect(() => {
    if (status === 'finished') {
      navigate('/result');
    }
  }, [status, navigate]);

  const fixedCount = problemSpots.filter((s) => s.isFixed).length;
  const totalCount = problemSpots.length;

  const handleSpotClick = (position: number, track: number) => {
    handleClick(position, track);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 flex flex-col">
      <header className="bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <Home size={20} />
            <span className="text-sm">返回首页</span>
          </button>

          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <Clock size={20} className={timeRemaining <= 10 ? 'text-red-500' : 'text-amber-500'} />
              <span className={`font-mono text-xl font-bold ${
                timeRemaining <= 10 ? 'text-red-500' : 'text-amber-400'
              }`}>
                {formatTime(timeRemaining)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Target size={20} className="text-green-500" />
              <span className="text-gray-300">
                <span className="font-bold text-green-400">{fixedCount}</span>
                <span className="text-gray-500"> / {totalCount}</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Zap size={20} className="text-yellow-500" />
              <span className="font-bold text-2xl text-yellow-400">
                {score}
              </span>
              {combo >= 3 && (
                <span className="text-xs bg-yellow-600 text-white px-2 py-0.5 rounded-full animate-pulse">
                  x{combo} 连击!
                </span>
              )}
            </div>
          </div>

          <div className="w-28" />
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-8"
        >
          <VinylRecord
            problemSpots={problemSpots}
            onSpotClick={handleSpotClick}
            disabled={!selectedTool}
          />
        </motion.div>

        <div className="mb-4 text-center">
          {selectedTool ? (
            <p className="text-gray-400 text-sm">
              已选择工具，点击唱片上的问题点进行修复
            </p>
          ) : (
            <p className="text-amber-400 text-sm">
              👆 请先选择一个修复工具
            </p>
          )}
        </div>

        <ToolPanel
          selectedTool={selectedTool}
          onSelectTool={selectTool}
          disabled={status !== 'playing'}
        />
      </main>

      <FeedbackModal
        isVisible={showFeedback}
        type={lastFeedback?.type || 'success'}
        message={lastFeedback?.message || ''}
        errorType={lastFeedback?.errorType}
        onClose={clearFeedback}
      />
    </div>
  );
};
