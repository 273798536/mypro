import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, RotateCcw } from 'lucide-react';
import CanvasStage from '../components/CanvasStage';
import ScoreCard from '../components/ScoreCard';
import ReplayBar from '../components/ReplayBar';
import { getLevel } from '../game/levels';
import { getRun } from '../game/storage';

const ResultPage: React.FC = () => {
  const { runId } = useParams<{ runId: string }>();
  const nav = useNavigate();
  const run = getRun(runId ?? '');
  const level = run ? getLevel(run.levelId) : undefined;
  const [replayIndex, setReplayIndex] = useState(0);

  if (!run || !level) {
    return <div className="min-h-screen bg-slate-950 text-white p-8">记录不存在</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-violet-950 text-white">
      <div className="p-4 flex items-center gap-4">
        <button
          onClick={() => nav('/')}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold">结算: {level.name}</h1>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => nav(`/play/${run.levelId}`)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-sm"
          >
            <RotateCcw className="w-4 h-4" />
            再来一次
          </button>
          <button
            onClick={() => nav(`/report/${run.id}`)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm"
          >
            <FileText className="w-4 h-4" />
            航行报告
          </button>
        </div>
      </div>
      <div className="px-4 pb-8 flex gap-6 items-start">
        <div className="flex-shrink-0 space-y-4">
          <CanvasStage level={level} snapshot={null} replayFrames={run.frames} replayIndex={replayIndex} />
          <ReplayBar frames={run.frames} onChange={setReplayIndex} autoPlay />
        </div>
        <div className="flex-1 max-w-sm">
          <ScoreCard score={run.score} result={run.result} failureReason={run.failureReason} />
          <div className="mt-4 bg-slate-900/80 backdrop-blur rounded-xl p-4">
            <div className="text-sm font-bold mb-2">事件日志</div>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {run.events.map((e, i) => (
                <div
                  key={i}
                  className={`text-xs px-2 py-1 rounded ${
                    e.type === 'fuel-low' || e.type === 'collision' || e.type === 'escape'
                      ? 'bg-red-900/50 text-red-300'
                      : e.type === 'target-reached'
                      ? 'bg-emerald-900/50 text-emerald-300'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  <span className="font-mono mr-2">[{e.t.toFixed(2)}s]</span>
                  {e.message}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultPage;
