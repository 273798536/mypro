import { useNavigate } from 'react-router-dom';
import { TrendingUp, AlertTriangle, Layers, ChevronRight, BookOpen } from 'lucide-react';
import { scenarios } from '@/data/scenarios';
import { useGameStore } from '@/store/gameStore';

const difficultyColors: Record<string, string> = {
  '初级': 'bg-safe-green/20 text-safe-green',
  '中级': 'bg-risk-yellow/20 text-risk-yellow',
  '高级': 'bg-risk-red/20 text-risk-red',
};

export default function Home() {
  const navigate = useNavigate();
  const loadScenario = useGameStore(s => s.loadScenario);
  const _loadFromStorage = useGameStore(s => s._loadFromStorage);
  const allRecords = useGameStore(s => s.getAllRecords);

  _loadFromStorage();

  const handleStart = (scenarioId: string) => {
    loadScenario(scenarioId);
    navigate(`/battle/${scenarioId}`);
  };

  return (
    <div className="min-h-screen bg-navy-950">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber/10 border border-amber/20 text-amber text-xs mb-6">
            <BookOpen size={14} />
            投教课堂风险管理实训工具
          </div>
          <h1 className="text-4xl font-serif font-bold text-white mb-3">
            利率曲线拼图战
          </h1>
          <p className="text-neutral-slate text-sm max-w-lg mx-auto leading-relaxed">
            拖拽收益率曲线、组合债券卡、应对事件叠加 —— 在操作中感受曲线形态与持仓风险的取舍
          </p>
        </div>

        <div className="grid gap-5">
          {scenarios.map(scenario => {
            const records = allRecords().filter(r => r.scenarioId === scenario.id);
            const bestScore = records.length > 0 ? Math.max(...records.map(r => r.totalScore)) : null;
            return (
              <div
                key={scenario.id}
                className="group relative bg-navy-900 border border-navy-600 rounded-lg p-6 transition-all hover:border-amber/40 hover:shadow-lg hover:shadow-amber/5"
              >
                <div className="flex items-start justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-lg font-serif font-semibold text-white group-hover:text-amber-light transition-colors">
                        {scenario.name}
                      </h2>
                      <span className={`text-xs px-2 py-0.5 rounded ${difficultyColors[scenario.difficulty]}`}>
                        {scenario.difficulty}
                      </span>
                    </div>
                    <p className="text-sm text-neutral-slate leading-relaxed mb-4">
                      {scenario.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-neutral-slate">
                      <span className="flex items-center gap-1">
                        <Layers size={12} />
                        {scenario.bondCards.length} 张债券卡
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp size={12} />
                        {scenario.eventCards.length} 个事件
                      </span>
                      <span className="flex items-center gap-1">
                        <AlertTriangle size={12} />
                        目标久期 {scenario.targetDuration}
                      </span>
                      {bestScore !== null && (
                        <span className="text-amber font-mono">
                          最佳 {bestScore} 分
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleStart(scenario.id)}
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-md bg-amber/10 border border-amber/30 text-amber text-sm font-medium transition-all hover:bg-amber hover:text-navy-950 shrink-0"
                  >
                    进入战场
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-12 flex justify-center">
          <button
            onClick={() => navigate('/records')}
            className="text-sm text-neutral-slate hover:text-amber transition-colors flex items-center gap-1.5"
          >
            <BookOpen size={14} />
            查看课堂记录
          </button>
        </div>
      </div>
    </div>
  );
}
