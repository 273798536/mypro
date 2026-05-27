import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download } from 'lucide-react';
import ChartLine from '../components/ChartLine';
import { getLevel } from '../game/levels';
import { getRun } from '../game/storage';
import { generateJSONReport, generateTextReport, downloadFile } from '../game/report';

const ReportPage: React.FC = () => {
  const { runId } = useParams<{ runId: string }>();
  const nav = useNavigate();
  const run = getRun(runId ?? '');
  const level = run ? getLevel(run.levelId) : undefined;

  if (!run || !level) {
    return <div className="min-h-screen bg-slate-950 text-white p-8">记录不存在</div>;
  }

  const speedSeries = { label: '速度', color: '#06b6d4', data: run.frames.map((f) => Math.sqrt(f.vx ** 2 + f.vy ** 2)) };
  const fuelSeries = { label: '燃料', color: '#10b981', data: run.frames.map((f) => f.fuel) };
  const altitudeSeries = { label: '高度(最近行星)', color: '#8b5cf6', data: run.frames.map((f) => f.altitude) };
  const thrustSeries = { label: '推力', color: '#f97316', data: run.frames.map((f) => f.thrust * 100) };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-violet-950 text-white">
      <div className="p-4 flex items-center gap-4">
        <button
          onClick={() => nav(`/result/${run.id}`)}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold">航行报告: {level.name}</h1>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => downloadFile(generateJSONReport(run), `run-${run.id}.json`, 'application/json')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm"
          >
            <Download className="w-4 h-4" />
            导出 JSON
          </button>
          <button
            onClick={() => downloadFile(generateTextReport(run), `run-${run.id}.txt`, 'text/plain')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-sm"
          >
            <Download className="w-4 h-4" />
            导出文本
          </button>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-4 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ChartLine title="速度" series={[speedSeries]} />
          <ChartLine title="燃料" series={[fuelSeries]} />
          <ChartLine title="高度" series={[altitudeSeries]} />
          <ChartLine title="推力" series={[thrustSeries]} />
        </div>
        <div className="mt-8 bg-slate-900/80 backdrop-blur rounded-xl p-6">
          <h2 className="text-lg font-bold mb-4">航行事件</h2>
          <div className="space-y-2">
            {run.events.map((e, i) => (
              <div
                key={i}
                className={`text-sm px-3 py-2 rounded-lg ${
                  e.type === 'fuel-low' || e.type === 'collision' || e.type === 'escape'
                    ? 'bg-red-900/50 text-red-300'
                    : e.type === 'target-reached'
                    ? 'bg-emerald-900/50 text-emerald-300'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                <span className="font-mono mr-3">[{e.t.toFixed(2)}s]</span>
                {e.message}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-6 bg-slate-900/80 backdrop-blur rounded-xl p-6">
          <h2 className="text-lg font-bold mb-4">评分明细</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-800 rounded-lg p-3 text-center">
              <div className="text-slate-400 text-xs">基础分</div>
              <div className="text-2xl font-bold text-amber-400">+{run.score.base}</div>
            </div>
            <div className="bg-slate-800 rounded-lg p-3 text-center">
              <div className="text-slate-400 text-xs">燃料加分</div>
              <div className="text-2xl font-bold text-emerald-400">+{run.score.fuelBonus}</div>
            </div>
            <div className="bg-slate-800 rounded-lg p-3 text-center">
              <div className="text-slate-400 text-xs">弹弓加分</div>
              <div className="text-2xl font-bold text-violet-400">+{run.score.slingshotBonus}</div>
            </div>
            <div className="bg-slate-800 rounded-lg p-3 text-center">
              <div className="text-slate-400 text-xs">总分</div>
              <div className="text-2xl font-bold text-white">{run.score.total}</div>
            </div>
          </div>
          {run.score.penalties.length > 0 && (
            <div className="mt-4 space-y-2">
              {run.score.penalties.map((p, i) => (
                <div key={i} className="text-sm text-red-400">
                  {p.label}: {p.value}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportPage;
