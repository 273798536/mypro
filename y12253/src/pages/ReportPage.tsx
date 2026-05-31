import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, FileText } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import DecisionLog from '../components/report/DecisionLog';
import MisjudgmentCard from '../components/report/MisjudgmentCard';

const ReportPage: React.FC = () => {
  const navigate = useNavigate();
  const { misjudgments, decisionLog } = useGameStore();

  const hasData = decisionLog.length > 0;

  return (
    <div className="min-h-screen deep-grid p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="text-sm">返回首页</span>
          </button>
          
          <h1 className="font-display text-2xl text-tech-cyan-400 flex items-center gap-2">
            <FileText size={24} />
            航行报告
          </h1>

          <button
            onClick={() => navigate('/replay')}
            className="flex items-center gap-2 px-4 py-2 bg-sonar-green-500/20 text-sonar-green-400 rounded-lg hover:bg-sonar-green-500/30 transition-colors border border-sonar-green-500/30"
          >
            航行回放
          </button>
        </div>

        {!hasData ? (
          <div className="glow-border rounded-lg p-12 bg-deep-ocean-950/50 text-center">
            <FileText size={64} className="mx-auto text-gray-600 mb-4" />
            <h2 className="text-xl text-gray-400 mb-2">暂无航行记录</h2>
            <p className="text-gray-500 mb-6">完成一次航行后即可查看详细报告</p>
            <button
              onClick={() => navigate('/game')}
              className="px-6 py-3 bg-tech-cyan-500 hover:bg-tech-cyan-400 text-deep-ocean-950 font-display rounded-lg transition-all"
            >
              开始航行
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2">
              <DecisionLog />
            </div>

            <div className="space-y-4">
              <div className="glow-border rounded-lg p-4 bg-deep-ocean-950/50">
                <h3 className="text-tech-cyan-500 font-display text-sm mb-4">航行摘要</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">总决策数</span>
                    <span className="text-white font-mono">{decisionLog.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">安全通过</span>
                    <span className="text-sonar-green-400 font-mono">
                      {decisionLog.filter(d => d.consequence === 'safe').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">险象环生</span>
                    <span className="text-warning-orange-400 font-mono">
                      {decisionLog.filter(d => d.consequence === 'near-miss').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">晚补记录</span>
                    <span className="text-danger-red-400 font-mono">
                      {decisionLog.filter(d => d.isLateEntry).length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">缺字段</span>
                    <span className="text-warning-orange-400 font-mono">
                      {decisionLog.filter(d => d.isMissingFields).length}
                    </span>
                  </div>
                </div>
              </div>

              {misjudgments.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="text-warning-orange-400 font-display text-sm flex items-center gap-2">
                    <AlertTriangle size={16} />
                    回声误判分析
                  </h3>
                  {misjudgments.map((m, idx) => (
                    <MisjudgmentCard key={m.id} misjudgment={m} index={idx} />
                  ))}
                </div>
              ) : (
                <div className="glow-border-green rounded-lg p-4 bg-sonar-green-500/5 text-center">
                  <div className="text-sonar-green-400 text-4xl mb-2">✓</div>
                  <p className="text-sonar-green-400 text-sm">本次航行无回声误判</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportPage;
