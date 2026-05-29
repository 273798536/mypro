import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/useGameStore';
import NetValueChart from '@/components/game/NetValueChart';
import PositionPanel from '@/components/game/PositionPanel';
import NewsPanel from '@/components/game/NewsPanel';
import DecisionPanel from '@/components/game/DecisionPanel';
import RiskAlert from '@/components/game/RiskAlert';
import { Home, RotateCcw, FileText } from 'lucide-react';

export default function GamePage() {
  const navigate = useNavigate();
  const { gameState, industryCards, resetGame } = useGameStore();

  useEffect(() => {
    if (!gameState || industryCards.length === 0) {
      navigate('/');
    }
  }, [gameState, industryCards.length, navigate]);

  if (!gameState) return null;

  return (
    <div className="min-h-screen bg-grid py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8 animate-fade-in">
          <div>
            <h1 className="text-3xl font-bold text-primary-600 font-display">
              基金经理调仓局
            </h1>
            <p className="text-gray-500 mt-1">
              在行业新闻和风险预算间做出明智选择
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/report')}
              className="btn-secondary flex items-center gap-2 text-sm py-2"
            >
              <FileText className="w-4 h-4" />
              查看报告
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

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <NetValueChart />
            <PositionPanel />
          </div>

          <div className="space-y-6">
            <RiskAlert />
            <NewsPanel />
            <DecisionPanel />
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-gray-400 animate-fade-in">
          <p>💡 提示：尝试不同的决策策略，观察风险事件如何影响你的投资组合</p>
          <p className="mt-1">触发风险事件会扣分，但也会让你学习到宝贵的投资经验</p>
        </div>
      </div>
    </div>
  );
}
