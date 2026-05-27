import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, Trash2 } from 'lucide-react';
import { getAllRuns } from '../game/storage';
import { getLevel } from '../game/levels';

const HistoryPage: React.FC = () => {
  const nav = useNavigate();
  const runs = getAllRuns().sort((a, b) => b.endTime - a.endTime);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-violet-950 text-white">
      <div className="p-4 flex items-center gap-4">
        <button
          onClick={() => nav('/')}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold">历史航行记录</h1>
      </div>
      <div className="max-w-3xl mx-auto px-4 pb-12 space-y-3">
        {runs.length === 0 ? (
          <div className="text-slate-400 text-center py-12">暂无航行记录</div>
        ) : (
          runs.map((run) => {
            const level = getLevel(run.levelId);
            return (
              <div
                key={run.id}
                className="bg-slate-800/60 rounded-xl p-4 border border-white/10 flex items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate">{level?.name ?? run.levelId}</div>
                  <div className="text-sm text-slate-400">
                    {new Date(run.endTime).toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {run.result} · {run.frames.length} 帧 · {run.events.length} 事件
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{run.score.total}</div>
                  <div
                    className={`text-xs ${
                      run.result === 'success' ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {run.result === 'success' ? '成功' : '失败'}
                  </div>
                </div>
                <button
                  onClick={() => nav(`/result/${run.id}`)}
                  className="p-2 rounded-lg bg-violet-600 hover:bg-violet-500"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default HistoryPage;
