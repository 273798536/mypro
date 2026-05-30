import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useGameStore } from "@/store/gameStore";
import { useReplayStore } from "@/store/replayStore";
import { evaluateGame, buildSuggestions } from "@/engine/scoring";
import ReplayTimeline from "@/components/ReplayTimeline";
import ReplaySnapshot from "@/components/ReplaySnapshot";
import SuggestionCard from "@/components/SuggestionCard";
import { Trophy, XCircle, ArrowLeft, RotateCcw, ChevronRight } from "lucide-react";

export default function ResultPage() {
  const { scenarioId } = useParams<{ scenarioId: string }>();
  const navigate = useNavigate();
  const {
    scenario,
    snapshots,
    evacuated,
    totalPeople,
    elapsed,
    score,
    events,
    operations,
    resetGame,
  } = useGameStore();

  const { currentStep, selectedSnapshot, goToStep, loadSnapshots } =
    useReplayStore();

  useEffect(() => {
    if (snapshots.length > 0) {
      loadSnapshots(snapshots);
    }
  }, [snapshots, loadSnapshots]);

  if (!scenario) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-gray-400 text-sm">无游戏记录</div>
      </div>
    );
  }

  const result = evaluateGame(snapshots, totalPeople, evacuated, scenario.timeLimit, elapsed);
  const suggestions = buildSuggestions(events, score.deductions);
  const evacuationRate = totalPeople > 0 ? Math.floor((evacuated / totalPeople) * 100) : 0;

  const floors = scenario.floors;

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-gray-700/40 bg-bg-light/50 backdrop-blur-sm px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200 transition-colors"
            >
              <ArrowLeft size={14} />
              返回
            </button>
            <div className="h-4 w-px bg-gray-700" />
            <h1 className="text-lg font-bold text-gray-200">
              {scenario.name} · 演练结果
            </h1>
          </div>
          <button
            onClick={() => {
              resetGame();
              navigate(`/game/${scenario.id}`);
            }}
            className="flex items-center gap-1.5 bg-accent/20 text-accent border border-accent/30 hover:bg-accent hover:text-white text-xs py-1.5 px-3 rounded transition-all"
          >
            <RotateCcw size={12} />
            重新演练
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        <div
          className={`rounded-xl border p-6 animate-fade-in-up ${
            result.passed
              ? "border-safe/30 bg-safe/5"
              : "border-danger/30 bg-danger/5"
          }`}
        >
          <div className="flex items-center gap-3 mb-3">
            {result.passed ? (
              <Trophy size={28} className="text-safe" />
            ) : (
              <XCircle size={28} className="text-danger" />
            )}
            <div>
              <h2
                className={`text-2xl font-black ${
                  result.passed ? "text-safe" : "text-danger"
                }`}
              >
                {result.passed ? "演练通过" : "演练未通过"}
              </h2>
              <p className="text-sm text-gray-400 mt-0.5">
                {result.coreReason}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 mt-4">
            <div className="bg-bg/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-black font-mono text-gray-200">
                {result.score.total}
              </div>
              <div className="text-[10px] text-gray-500">评分</div>
            </div>
            <div className="bg-bg/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-black font-mono text-safe">
                {evacuationRate}%
              </div>
              <div className="text-[10px] text-gray-500">疏散率</div>
            </div>
            <div className="bg-bg/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-black font-mono text-info">
                {elapsed}s
              </div>
              <div className="text-[10px] text-gray-500">用时</div>
            </div>
            <div className="bg-bg/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-black font-mono text-accent">
                {operations.length}
              </div>
              <div className="text-[10px] text-gray-500">操作次数</div>
            </div>
          </div>
        </div>

        {score.deductions.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-gray-300 flex items-center gap-2">
              <ChevronRight size={14} className="text-danger" />
              评分溯源
            </h3>
            <div className="bg-bg-light/50 rounded-lg border border-gray-700/30 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-700/40">
                    <th className="text-left py-2 px-3 text-gray-500 font-mono">步骤</th>
                    <th className="text-left py-2 px-3 text-gray-500">扣分原因</th>
                    <th className="text-center py-2 px-3 text-gray-500 font-mono">扣分</th>
                    <th className="text-left py-2 px-3 text-gray-500">修正建议</th>
                  </tr>
                </thead>
                <tbody>
                  {score.deductions.map((d, i) => (
                    <tr key={i} className="border-b border-gray-700/20 hover:bg-bg/30">
                      <td className="py-2 px-3 font-mono text-accent">#{d.step}</td>
                      <td className="py-2 px-3 text-gray-300">{d.reason}</td>
                      <td className="py-2 px-3 text-center font-mono text-danger">
                        {d.points}
                      </td>
                      <td className="py-2 px-3 text-gray-400">{d.suggestion}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {suggestions.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-300 flex items-center gap-2">
              <ChevronRight size={14} className="text-accent" />
              可操作修正建议
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {suggestions.map((s, i) => (
                <SuggestionCard
                  key={i}
                  category={s.category}
                  items={s.items}
                />
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-300 flex items-center gap-2">
            <ChevronRight size={14} className="text-info" />
            步骤回放
          </h3>
          <ReplayTimeline
            snapshots={snapshots}
            currentStep={currentStep}
            onStepClick={goToStep}
          />
          {selectedSnapshot && (
            <ReplaySnapshot snapshot={selectedSnapshot} floors={floors} />
          )}
        </div>
      </main>
    </div>
  );
}
