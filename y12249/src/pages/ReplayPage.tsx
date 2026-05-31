
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Music } from 'lucide-react';
import { GameSession } from '../types';
import { getSessionById } from '../utils/storage';
import { PlaybackControls } from '../components/replay/PlaybackControls';
import { ReplayVisualizer } from '../components/replay/ReplayVisualizer';

export const ReplayPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<GameSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentRound, setCurrentRound] = useState(1);
  const [speed, setSpeed] = useState(1);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (sessionId) {
      const data = getSessionById(sessionId);
      setSession(data);
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (isPlaying && session) {
      intervalRef.current = setInterval(() => {
        setCurrentRound((prev) => {
          if (prev >= session.totalRounds) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 2000 / speed);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, speed, session]);

  const handlePlayPause = () => {
    if (currentRound >= (session?.totalRounds || 0)) {
      setCurrentRound(1);
    }
    setIsPlaying(!isPlaying);
  };

  const handlePrev = () => {
    setCurrentRound((prev) => Math.max(1, prev - 1));
  };

  const handleNext = () => {
    if (session) {
      setCurrentRound((prev) => Math.min(session.totalRounds, prev + 1));
    }
  };

  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
  };

  const handleBack = () => {
    if (sessionId) {
      navigate(`/result/${sessionId}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white">加载中...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">未找到训练记录</h2>
          <button
            onClick={() => navigate('/history')}
            className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-xl transition-colors"
          >
            返回历史记录
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-amber-400/20 to-amber-600/20 mb-4">
            <Music className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">决策回放</h1>
          <p className="text-white/60">{session.sceneName}</p>
        </div>

        <div className="mb-6">
          <PlaybackControls
            isPlaying={isPlaying}
            currentRound={currentRound}
            totalRounds={session.totalRounds}
            speed={speed}
            onPlayPause={handlePlayPause}
            onPrev={handlePrev}
            onNext={handleNext}
            onSpeedChange={handleSpeedChange}
            onBack={handleBack}
          />
        </div>

        <ReplayVisualizer session={session} currentRound={currentRound} />
      </div>
    </div>
  );
};

