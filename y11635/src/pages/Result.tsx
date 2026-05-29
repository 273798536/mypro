import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, RotateCcw, BarChart3 } from 'lucide-react';
import { useGameStore } from '../hooks/useGameStore';
import { WaterLevelChart } from '../components/WaterLevelChart';
import { ScoreDetail } from '../components/ScoreDetail';
import { FailureAnalysis } from '../components/FailureAnalysis';
import { PlaybackControl } from '../components/PlaybackControl';
import { ExportButton } from '../components/ExportButton';
import { ReservoirScene } from '../components/ReservoirScene';

export function Result() {
  const navigate = useNavigate();
  const { totalScore, status, logs, scoreDetails, resetGame, replayRound } = useGameStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'score' | 'analysis' | 'replay'>('overview');

  const handleRestart = () => {
    resetGame();
    navigate('/');
  };

  const getScoreGrade = () => {
    if (totalScore >= 150) return { grade: 'S', color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
    if (totalScore >= 100) return { grade: 'A', color: 'text-green-400', bg: 'bg-green-500/20' };
    if (totalScore >= 50) return { grade: 'B', color: 'text-blue-400', bg: 'bg-blue-500/20' };
    if (totalScore >= 0) return { grade: 'C', color: 'text-orange-400', bg: 'bg-orange-500/20' };
    return { grade: 'D', color: 'text-red-400', bg: 'bg-red-500/20' };
  };

  const grade = getScoreGrade();

  const replayLog = replayRound > 0 && logs[replayRound - 1] ? logs[replayRound - 1] : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-100">游戏结算</h1>
          <button
            onClick={handleRestart}
            className="flex items-center gap-2 px-4 py-2 rounded-lg
              bg-slate-700 hover:bg-slate-600 text-slate-300
              transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            再玩一次
          </button>
        </div>

        <div className="bg-gradient-to-r from-slate-800 to-slate-800/50 rounded-2xl p-6 mb-6 border border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className={`w-24 h-24 rounded-full ${grade.bg} flex items-center justify-center border-4 border-current ${grade.color}`}>
                <span className="text-5xl font-bold">{grade.grade}</span>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {status === 'success' ? (
                    <Trophy className="w-6 h-6 text-yellow-400" />
                  ) : (
                    <BarChart3 className="w-6 h-6 text-red-400" />
                  )}
                  <span className={`text-2xl font-bold ${
                    status === 'success' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {status === 'success' ? '成功通关' : '游戏失败'}
                  </span>
                </div>
                <div className="text-slate-400">完成回合: {logs.length}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-400 mb-1">总得分</div>
              <div className={`text-5xl font-mono font-bold ${
                totalScore >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {totalScore >= 0 ? '+' : ''}{totalScore}
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          {[
            { id: 'overview', label: '概览' },
            { id: 'score', label: '得分明细' },
            { id: 'analysis', label: '分析报告' },
            { id: 'replay', label: '回合回放' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-8 space-y-4">
              <WaterLevelChart height={200} />
              <div className="bg-slate-800 rounded-xl p-4">
                <h3 className="text-lg font-bold text-slate-100 mb-3">最终状态</h3>
                <ReservoirScene
                  reservoirLevel={logs.length > 0 ? logs[logs.length - 1].reservoirLevel : 0}
                  gateOpening={0}
                  upstreamInflow={0}
                  weatherType="sunny"
                  warningIssued={false}
                />
              </div>
            </div>
            <div className="col-span-4 space-y-4">
              <ExportButton />
              <div className="bg-slate-800 rounded-xl p-4">
                <h3 className="text-lg font-bold text-slate-100 mb-3">游戏统计</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-2 border-b border-slate-700">
                    <span className="text-slate-400">总回合数</span>
                    <span className="text-slate-200 font-mono">{logs.length}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-700">
                    <span className="text-slate-400">安全运行回合</span>
                    <span className="text-green-400 font-mono">
                      {scoreDetails.filter(d => d.category === '安全运行').length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-700">
                    <span className="text-slate-400">预警及时</span>
                    <span className="text-blue-400 font-mono">
                      {scoreDetails.filter(d => d.category === '预警及时').length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-slate-400">失误次数</span>
                    <span className="text-red-400 font-mono">
                      {scoreDetails.filter(d => d.score < 0).length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'score' && (
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-8">
              <ScoreDetail details={scoreDetails} totalScore={totalScore} />
            </div>
            <div className="col-span-4">
              <ExportButton />
            </div>
          </div>
        )}

        {activeTab === 'analysis' && (
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-8">
              <FailureAnalysis scoreDetails={scoreDetails} />
            </div>
            <div className="col-span-4">
              <ExportButton />
            </div>
          </div>
        )}

        {activeTab === 'replay' && (
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-8">
              <div className="mb-4">
                {replayLog && (
                  <ReservoirScene
                    reservoirLevel={replayLog.reservoirLevel}
                    gateOpening={replayLog.gateOpening}
                    upstreamInflow={replayLog.upstreamInflow}
                    weatherType={replayLog.weather.type}
                    warningIssued={replayLog.warningIssued}
                  />
                )}
              </div>
              <WaterLevelChart height={160} />
            </div>
            <div className="col-span-4">
              <PlaybackControl logs={logs} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
