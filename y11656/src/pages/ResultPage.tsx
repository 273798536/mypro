import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ScoreBreakdown } from '@/components/result/ScoreBreakdown';
import { ErrorTimeline } from '@/components/result/ErrorTimeline';
import { Button } from '@/components/common/Button';
import { useGameStore } from '@/store/useGameStore';
import type { GameRecord } from '@/types';
import { ArrowLeft, BarChart3, RotateCcw, Home } from 'lucide-react';

export function ResultPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { gameRecords, resetGame } = useGameStore();
  const [record, setRecord] = useState<GameRecord | null>(null);

  useEffect(() => {
    if (!gameId) return;
    
    const found = gameRecords.find(r => r.id === gameId);
    if (found) {
      setRecord(found);
    } else {
      navigate('/');
    }
  }, [gameId, gameRecords, navigate]);

  if (!record) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="text-amber-700 text-xl">加载中...</div>
      </div>
    );
  }

  const handleReplay = () => {
    if (record) {
      navigate(`/game/${record.levelId}`);
    }
  };

  const handleViewReport = () => {
    if (record) {
      navigate(`/report/${record.id}`);
    }
  };

  const handleHome = () => {
    resetGame();
    navigate('/');
  };

  const getGrade = (score: number, totalItems: number) => {
    const maxScore = totalItems * 10;
    const ratio = score / maxScore;
    if (ratio >= 0.9) return { grade: 'S', color: 'text-yellow-500', bg: 'bg-yellow-100' };
    if (ratio >= 0.7) return { grade: 'A', color: 'text-green-500', bg: 'bg-green-100' };
    if (ratio >= 0.5) return { grade: 'B', color: 'text-blue-500', bg: 'bg-blue-100' };
    if (ratio >= 0.3) return { grade: 'C', color: 'text-orange-500', bg: 'bg-orange-100' };
    return { grade: 'D', color: 'text-red-500', bg: 'bg-red-100' };
  };

  const { grade, color, bg } = getGrade(record.score, record.totalItems);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-100 to-amber-200 py-8">
      <div className="max-w-4xl mx-auto px-6">
        <div className="flex items-center justify-between mb-6">
          <Button onClick={handleHome} variant="secondary" size="sm" className="flex items-center gap-2">
            <ArrowLeft size={18} />
            返回首页
          </Button>
          <h1 className="text-2xl font-bold text-amber-900">游戏结果</h1>
          <div className="w-24" />
        </div>

        <div className={`${bg} rounded-2xl p-8 mb-6 text-center shadow-lg`}>
          <div className={`text-8xl font-bold ${color} mb-2`}>{grade}</div>
          <div className="text-amber-800 text-lg">评级</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ScoreBreakdown
            actions={record.actions}
            totalScore={record.score}
            totalItems={record.totalItems}
            correctCount={record.correctCount}
            errorCount={record.errorCount}
            duration={record.duration}
          />
          <ErrorTimeline actions={record.actions} />
        </div>

        <div className="mt-6 flex justify-center gap-4">
          <Button onClick={handleReplay} variant="primary" className="flex items-center gap-2">
            <RotateCcw size={18} />
            再玩一次
          </Button>
          <Button onClick={handleViewReport} variant="secondary" className="flex items-center gap-2">
            <BarChart3 size={18} />
            查看详细报告
          </Button>
        </div>
      </div>
    </div>
  );
}
