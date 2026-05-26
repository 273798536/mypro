import { useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { FAIL_TYPE_LABELS } from '../types/game';

export function ResultPage() {
  const navigate = useNavigate();
  const { levelId } = useParams<{ levelId: string }>();
  const location = useLocation();
  const publicState = useGameStore(s => s.publicState);
  const currentLevel = useGameStore(s => s.currentLevel);
  const replays = useGameStore(s => s.replays);
  const restartLevel = useGameStore(s => s.restartLevel);
  const exitToMenu = useGameStore(s => s.exitToMenu);

  const replayId = location.state?.replayId as string | undefined;

  const replay = useMemo(() => {
    if (replayId) {
      return replays.find(r => r.id === replayId);
    }
    return null;
  }, [replayId, replays]);

  if (!publicState && !replay) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white">加载中...</div>
      </div>
    );
  }

  const score = replay?.finalScore ?? publicState?.score ?? 0;
  const maxScore = replay?.maxScore ?? (currentLevel ? publicState?.areas.reduce((s, a) => s + a.reward, 0) ?? 0 : 0);
  const failReasons = replay?.failReasons ?? publicState?.failReasons ?? [];
  const actions = replay?.actions ?? publicState?.dispatchHistory ?? [];
  const levelName = replay?.levelName ?? currentLevel?.name ?? '';

  const scorePercent = maxScore > 0 ? Math.max(0, (score / maxScore) * 100) : 0;

  const getGrade = () => {
    if (scorePercent >= 90) return { label: 'S', color: 'text-yellow-400', desc: '完美！' };
    if (scorePercent >= 75) return { label: 'A', color: 'text-emerald-400', desc: '优秀！' };
    if (scorePercent >= 60) return { label: 'B', color: 'text-blue-400', desc: '良好！' };
    if (scorePercent >= 40) return { label: 'C', color: 'text-yellow-400', desc: '及格' };
    return { label: 'D', color: 'text-red-400', desc: '需要加强训练' };
  };

  const grade = getGrade();

  const handleExport = () => {
    const report = {
      level: levelName,
      levelId,
      finalScore: score,
      maxScore,
      grade: grade.label,
      timestamp: new Date().toISOString(),
      actions: actions.map(a => ({
        round: a.round,
        teamId: a.teamId,
        areaId: a.areaId,
        timestamp: new Date(a.timestamp).toLocaleString()
      })),
      failures: failReasons.map(f => ({
        round: f.round,
        type: FAIL_TYPE_LABELS[f.type],
        description: f.description,
        detail: f.detail,
        source: f.source
      }))
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `repair-report-${levelId}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRestart = () => {
    if (levelId) {
      restartLevel();
      navigate(`/game/${levelId}`);
    }
  };

  const handleReplay = () => {
    if (replayId) {
      navigate(`/replay/${replayId}`);
    }
  };

  const handleBackToMenu = () => {
    exitToMenu();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">🏁 关卡结束</h1>
          <p className="text-slate-400">{levelName}</p>
        </div>

        {/* Score Section */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-800/50 rounded-2xl border border-slate-600 p-8 mb-6">
          <div className="flex items-center justify-center gap-8">
            <div className="text-center">
              <div className={`text-8xl font-bold ${grade.color} mb-2`}>
                {grade.label}
              </div>
              <p className="text-lg text-slate-300">{grade.desc}</p>
            </div>

            <div className="h-24 w-px bg-slate-600" />

            <div className="text-center">
              <p className="text-slate-400 text-sm mb-1">最终得分</p>
              <p className="text-5xl font-bold text-white mb-2">{score}</p>
              <p className="text-slate-500 text-sm">
                满分: {maxScore} ({scorePercent.toFixed(1)}%)
              </p>
              <div className="w-48 bg-slate-700 rounded-full h-3 mt-3">
                <div
                  className={`h-3 rounded-full transition-all duration-1000 ${
                    scorePercent >= 70 ? 'bg-emerald-500' : scorePercent >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${scorePercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Fail Reasons */}
        {failReasons.length > 0 && (
          <div className="bg-slate-800/50 rounded-2xl border border-red-500/30 p-6 mb-6">
            <h2 className="text-xl font-bold text-red-400 mb-4 flex items-center gap-2">
              <span>⚠️</span> 失败记录 ({failReasons.length})
            </h2>
            <div className="space-y-3">
              {failReasons.map((reason, index) => (
                <div
                  key={index}
                  className="bg-slate-700/50 rounded-lg p-4 border-l-4 border-red-500"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded font-medium">
                      {FAIL_TYPE_LABELS[reason.type]}
                    </span>
                    <span className="text-slate-400 text-sm">回合 {reason.round}</span>
                  </div>
                  <p className="text-white font-medium mb-1">{reason.description}</p>
                  <p className="text-slate-400 text-sm mb-2">{reason.detail}</p>
                  <p className="text-slate-500 text-xs font-mono">{reason.source}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action History */}
        <div className="bg-slate-800/50 rounded-2xl border border-slate-600 p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span>📋</span> 操作记录 ({actions.length})
          </h2>
          <div className="max-h-64 overflow-y-auto space-y-2 scrollbar-thin">
            {actions.map((action, index) => (
              <div
                key={index}
                className="flex items-center gap-4 bg-slate-700/30 rounded-lg p-3"
              >
                <span className="text-orange-400 font-mono text-sm">R{action.round}</span>
                <span className="text-slate-300">
                  {action.teamId} → {action.areaId}
                </span>
                <span className="text-slate-500 text-xs ml-auto">
                  {new Date(action.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-4 justify-center">
          {replayId && (
            <button
              onClick={handleReplay}
              className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl font-bold transition-all hover:scale-105"
            >
              🎬 查看回放
            </button>
          )}
          <button
            onClick={handleExport}
            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-all hover:scale-105"
          >
            📤 导出报告
          </button>
          <button
            onClick={handleRestart}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold transition-all hover:scale-105"
          >
            🔄 再玩一次
          </button>
          <button
            onClick={handleBackToMenu}
            className="px-6 py-3 bg-slate-600 hover:bg-slate-500 text-white rounded-xl font-bold transition-all hover:scale-105"
          >
            🏠 返回菜单
          </button>
        </div>
      </div>
    </div>
  );
}