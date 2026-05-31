
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Play, RotateCcw, Home } from 'lucide-react';
import { GameSession } from '../types';
import { getSessionById } from '../utils/storage';
import { ScoreOverview } from '../components/result/ScoreOverview';
import { ErrorTimeline } from '../components/result/ErrorTimeline';
import { DecisionReview } from '../components/result/DecisionReview';
import { useGameStore } from '../store/gameStore';

export const ResultPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { resetGame } = useGameStore();
  const [session, setSession] = useState<GameSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionId) {
      const data = getSessionById(sessionId);
      setSession(data);
      setLoading(false);
    }
  }, [sessionId]);

  const handleReplay = () => {
    if (sessionId) {
      navigate(`/replay/${sessionId}`);
    }
  };

  const handleNewGame = () => {
    resetGame();
    navigate('/');
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
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/history')}
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>返回历史记录</span>
          </button>
          <div className="flex gap-3">
            <button
              onClick={handleNewGame}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Home className="w-4 h-4" />
              首页
            </button>
            <button
              onClick={handleReplay}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              回放
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <ScoreOverview session={session} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ErrorTimeline session={session} />
            <DecisionReview session={session} />
          </div>

          <div className="flex justify-center gap-4 pt-4">
            <button
              onClick={handleReplay}
              className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-medium rounded-xl transition-all shadow-lg shadow-amber-500/30 flex items-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              回放决策过程
            </button>
            <button
              onClick={handleNewGame}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-colors flex items-center gap-2"
            >
              开始新训练
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

