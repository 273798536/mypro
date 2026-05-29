import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/useGameStore';
import NetValueReplay from '@/components/report/NetValueReplay';
import DecisionAnalysis from '@/components/report/DecisionAnalysis';
import OperationGuide from '@/components/report/OperationGuide';
import { Home, RotateCcw, PlayCircle, Trophy, AlertTriangle } from 'lucide-react';
import { cn } from '@/utils/cn';

export default function ReportPage() {
  const navigate = useNavigate();
  const { gameState, industryCards, resetGame, finishCurrentGame } = useGameStore();

  useEffect(() => {
    if (!gameState || industryCards.length === 0) {
      navigate('/');
      return;
    }
    if (!gameState.isFinished) {
      finishCurrentGame();
    }
  }, [gameState, industryCards.length, navigate, finishCurrentGame]);

  if (!gameState) return null;

  const initialValue = gameState.netValueHistory[0]?.value || 100;
  const finalValue = gameState.netValueHistory[gameState.netValueHistory.length - 1]?.value || initialValue;
  const totalReturn = ((finalValue - initialValue) / initialValue) * 100;
  const isProfit = totalReturn >= 0;
  const totalRiskPenalty = gameState.riskEvents.reduce((sum, r) => sum + r.penalty, 0);
  const finalScore = Math.max(0, 100 - totalRiskPenalty + (isProfit ? totalReturn * 0.5 : totalReturn));

  const getScoreGrade = (score: number) => {
    if (score >= 90) return { grade: 'S', color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-200', label: '投资大师' };
    if (score >= 80) return { grade: 'A', color: 'text-green-500', bg: 'bg-green-50', border: 'border-green-200', label: '稳健投资者' };
    if (score >= 70) return { grade: 'B', color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200', label: '成熟玩家' };
    if (score >= 60) return { grade: 'C', color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-200', label: '学习进步中' };
    return { grade: 'D', color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-200', label: '新手需努力' };
  };

  const scoreInfo = getScoreGrade(finalScore);

  return (
    <div className="min-h-screen bg-grid py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8 animate-fade-in">
          <div>
            <h1 className="text-3xl font-bold text-primary-600 font-display">
              投资结算报告
            </h1>
            <p className="text-gray-500 mt-1">
              查看你的投资决策分析和风险事件追溯
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/game')}
              className="btn-secondary flex items-center gap-2 text-sm py-2"
            >
              <PlayCircle className="w-4 h-4" />
              继续游戏
            </button>
            <button
              onClick={() => {
                resetGame();
                navigate('/');
              }}
              className="btn-secondary flex items-center gap-2 text-sm py-2"
            >
              <RotateCcw className="w-4 h-4" />
              重新开始
            </button>
            <button
              onClick={() => navigate('/')}
              className="btn-secondary flex items-center gap-2 text-sm py-2"
            >
              <Home className="w-4 h-4" />
              返回首页
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-6 mb-8">
          <div className="card p-6 animate-slide-up">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
              <Trophy className="w-4 h-4" />
              最终净值
            </div>
            <p className="text-3xl font-mono font-bold text-primary-600">
              {finalValue.toFixed(2)}
            </p>
          </div>
          <div className="card p-6 animate-slide-up" style={{ animationDelay: '0.05s' }}>
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
              {isProfit ? <Trophy className="w-4 h-4 text-accent-profit" /> : <AlertTriangle className="w-4 h-4 text-accent-loss" />}
              累计收益
            </div>
            <p className={cn(
              'text-3xl font-mono font-bold',
              isProfit ? 'text-accent-profit' : 'text-accent-loss'
            )}>
              {isProfit ? '+' : ''}{totalReturn.toFixed(2)}%
            </p>
          </div>
          <div className="card p-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
              <AlertTriangle className="w-4 h-4 text-accent-warning" />
              风险扣分
            </div>
            <p className="text-3xl font-mono font-bold text-accent-loss">
              -{totalRiskPenalty}
            </p>
          </div>
          <div 
            className={cn(
              'card p-6 border-2 animate-slide-up',
              scoreInfo.bg,
              scoreInfo.border
            )} 
            style={{ animationDelay: '0.15s' }}
          >
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
              <Trophy className={cn('w-4 h-4', scoreInfo.color)} />
              综合评级
            </div>
            <div className="flex items-center gap-3">
              <span className={cn(
                'text-5xl font-mono font-bold',
                scoreInfo.color
              )}>
                {scoreInfo.grade}
              </span>
              <div>
                <p className={cn('text-xl font-bold', scoreInfo.color)}>
                  {finalScore.toFixed(0)} 分
                </p>
                <p className="text-sm text-gray-500">{scoreInfo.label}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <NetValueReplay />
          <DecisionAnalysis />
          <OperationGuide />
        </div>

        <div className="mt-12 text-center text-sm text-gray-400 animate-fade-in">
          <p>📊 本报告仅供投教用途，不构成任何投资建议</p>
          <p className="mt-1">记住：投资有风险，入市需谨慎</p>
        </div>
      </div>
    </div>
  );
}
