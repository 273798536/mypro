import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Layers, ChevronRight } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { scenarios } from '@/data/scenarios';

export default function Records() {
  const navigate = useNavigate();
  const _loadFromStorage = useGameStore(s => s._loadFromStorage);
  const allRecords = useGameStore(s => s.getAllRecords);

  _loadFromStorage();

  const records = allRecords().sort((a, b) => b.timestamp - a.timestamp);

  const getScenarioName = (id: string) => scenarios.find(s => s.id === id)?.name ?? id;

  return (
    <div className="min-h-screen bg-navy-950">
      <div className="border-b border-navy-700 bg-navy-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-1.5 rounded-md hover:bg-navy-700 text-neutral-slate hover:text-white transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-base font-serif font-semibold text-white">课堂记录</h1>
          <span className="text-xs text-neutral-slate ml-2">{records.length} 条记录</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6">
        {records.length === 0 ? (
          <div className="text-center py-20">
            <Clock size={40} className="mx-auto text-navy-600 mb-4" />
            <p className="text-neutral-slate text-sm">暂无课堂记录</p>
            <p className="text-neutral-slate text-xs mt-1">完成一次拼图战后，记录将出现在这里</p>
            <button
              onClick={() => navigate('/')}
              className="mt-4 px-4 py-2 rounded-md text-sm bg-amber/10 border border-amber/30 text-amber hover:bg-amber hover:text-navy-950 transition-colors"
            >
              开始挑战
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {records.map(record => (
              <div
                key={record.id}
                className="bg-navy-900 border border-navy-600 rounded-lg p-4 hover:border-amber/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Layers size={14} className="text-amber" />
                      <span className="text-sm font-medium text-white">{getScenarioName(record.scenarioId)}</span>
                      {record.rerunFromId && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-amber/10 text-amber">重跑</span>
                      )}
                      {record.isInverted && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-risk-red/10 text-risk-red">曲线反向</span>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-xs">
                      <div>
                        <span className="text-neutral-slate">持仓</span>
                        <span className="ml-1 font-mono text-white">{record.portfolioSnapshot.length} 只</span>
                      </div>
                      <div>
                        <span className="text-neutral-slate">久期缺口</span>
                        <span className={`ml-1 font-mono ${Math.abs(record.durationGap) > 1 ? 'text-risk-red' : 'text-safe-green'}`}>
                          {record.durationGap.toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-neutral-slate">事件</span>
                        <span className="ml-1 font-mono text-white">{record.activeEventIds.length} 个</span>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-xs text-neutral-slate">
                      <Clock size={11} />
                      {new Date(record.timestamp).toLocaleString('zh-CN')}
                    </div>
                    <div className="mt-2 flex gap-1.5">
                      {record.validationResults.slice(0, 4).map(v => (
                        <span
                          key={v.ruleId}
                          className={`text-xs px-1.5 py-0.5 rounded ${
                            v.passed ? 'bg-safe-green/10 text-safe-green' : 'bg-risk-red/10 text-risk-red'
                          }`}
                        >
                          {v.ruleId}
                        </span>
                      ))}
                      {record.validationResults.length > 4 && (
                        <span className="text-xs text-neutral-slate">+{record.validationResults.length - 4}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`text-2xl font-mono font-bold ${
                      record.totalScore >= 80 ? 'text-safe-green' : record.totalScore >= 50 ? 'text-risk-yellow' : 'text-risk-red'
                    }`}>
                      {record.totalScore}
                    </span>
                    <button
                      onClick={() => navigate(`/settlement/${record.scenarioId}/${record.id}`)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs border border-navy-500 text-neutral-slate hover:text-amber hover:border-amber/40 transition-colors"
                    >
                      查看详情
                      <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
