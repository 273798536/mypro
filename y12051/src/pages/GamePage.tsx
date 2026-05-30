import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { BeatTrack } from '../components/Game/BeatTrack';
import { ControlPanel } from '../components/Game/ControlPanel';
import { DispatchArea } from '../components/Game/DispatchArea';
import { PauseOverlay } from '../components/Game/PauseOverlay';
import { useGameEngine } from '../hooks/useGameEngine';
import { useGameStore } from '../store/gameStore';
import { getTrackById } from '../data/sampleTracks';

export const GamePage: React.FC = () => {
  const { trackId } = useParams<{ trackId: string }>();
  const navigate = useNavigate();
  
  const track = trackId ? getTrackById(trackId) : null;
  
  const {
    status,
    currentTime,
    score,
    combo,
    maxCombo,
    selectedTrack,
    judgments,
    settings
  } = useGameStore();

  const {
    startGame,
    pauseGame,
    resumeGame,
    restartGame,
    goToResult,
    handleTrackSelect,
  } = useGameEngine({ track: track || null });

  useEffect(() => {
    if (track) {
      startGame();
    }
    return () => {
      useGameStore.getState().resetGame();
    };
  }, [track, startGame]);

  useEffect(() => {
    if (status === 'finished') {
      navigate(`/result/${trackId}`);
    }
  }, [status, trackId, navigate]);

  if (!track) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">未找到曲目</div>
      </div>
    );
  }

  const handleBackToMenu = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleBackToMenu}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
            返回菜单
          </motion.button>
          
          <div className="text-white">
            <h1 className="text-xl font-bold">{track.name}</h1>
            <p className="text-sm text-gray-400">
              {track.bpm} BPM · {track.notes.length} 音符
            </p>
          </div>
          
          <div className="w-24" />
        </div>

        <div className="relative mb-6">
          <BeatTrack
            track={track}
            currentTime={currentTime}
            judgments={judgments}
            showRemarks={settings.showRemarks}
          />
          
          <AnimatePresence>
            {status === 'paused' && (
              <PauseOverlay
                onResume={resumeGame}
                onRestart={restartGame}
                onHome={handleBackToMenu}
              />
            )}
          </AnimatePresence>
        </div>

        <ControlPanel
          isPlaying={status === 'playing'}
          onPause={pauseGame}
          onResume={resumeGame}
          onRestart={restartGame}
          onReview={goToResult}
          score={score}
          combo={combo}
          maxCombo={maxCombo}
        />

        <div className="mt-6">
          <DispatchArea
            selectedTrack={selectedTrack}
            onTrackSelect={handleTrackSelect}
            disabled={status !== 'playing'}
          />
        </div>
      </div>
    </div>
  );
};
