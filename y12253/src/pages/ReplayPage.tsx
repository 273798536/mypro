import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, PlayCircle } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import Timeline from '../components/replay/Timeline';
import ScoreImpact from '../components/replay/ScoreImpact';
import GameCanvas from '../components/game/GameCanvas';

const ReplayPage: React.FC = () => {
  const navigate = useNavigate();
  const { decisionLog } = useGameStore();

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
          
          <h1 className="font-display text-2xl text-sonar-green-400 flex items-center gap-2">
            <PlayCircle size={24} />
            航行回放
          </h1>

          <button
            onClick={() => navigate('/report')}
            className="flex items-center gap-2 px-4 py-2 bg-tech-cyan-500/20 text-tech-cyan-400 rounded-lg hover:bg-tech-cyan-500/30 transition-colors border border-tech-cyan-500/30"
          >
            航行报告
          </button>
        </div>

        {!hasData ? (
          <div className="glow-border rounded-lg p-12 bg-deep-ocean-950/50 text-center">
            <PlayCircle size={64} className="mx-auto text-gray-600 mb-4" />
            <h2 className="text-xl text-gray-400 mb-2">暂无回放数据</h2>
            <p className="text-gray-500 mb-6">完成一次航行后即可查看回放</p>
            <button
              onClick={() => navigate('/game')}
              className="px-6 py-3 bg-tech-cyan-500 hover:bg-tech-cyan-400 text-deep-ocean-950 font-display rounded-lg transition-all"
            >
              开始航行
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2">
                <GameCanvas />
              </div>
              <div className="space-y-4">
                <ScoreImpact />
                <Timeline />
              </div>
            </div>

            <div className="glow-border rounded-lg p-6 bg-deep-ocean-950/50">
              <h3 className="text-tech-cyan-500 font-display text-lg mb-4">关键节点时间线</h3>
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 timeline-line" />
                <div className="space-y-4">
                  {decisionLog.slice(0, 8).map((record, idx) => (
                    <div key={record.id} className="relative pl-12">
                      <div className={`absolute left-2 w-5 h-5 rounded-full border-2 ${
                        record.consequence === 'safe' 
                          ? 'bg-sonar-green-500 border-sonar-green-400' 
                          : record.consequence === 'misjudgment'
                          ? 'bg-warning-orange-500 border-warning-orange-400'
                          : 'bg-danger-red-500 border-danger-red-400'
                      }`} />
                      <div className="glow-border rounded-lg p-3 bg-deep-ocean-900/50">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-mono text-tech-cyan-400">步骤 {record.step}</span>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            record.consequence === 'safe'
                              ? 'bg-sonar-green-500/20 text-sonar-green-400'
                              : record.consequence === 'misjudgment'
                              ? 'bg-warning-orange-500/20 text-warning-orange-400'
                              : 'bg-danger-red-500/20 text-danger-red-400'
                          }`}>
                            {record.consequence === 'safe' ? '安全' : record.consequence === 'misjudgment' ? '误判' : '碰撞'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400">
                          {record.action === 'sonar' ? '发射声呐' : `向${record.direction}移动`}
                          {record.remarks && ` · ${record.remarks}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReplayPage;
