import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Trophy,
  CheckCircle,
  HelpCircle,
  XCircle,
  RotateCcw,
  Download,
  Clock,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { scenes } from "@/data/mock/scenes";
import { useGameStore } from "@/stores/gameStore";
import { useReviewStore } from "@/stores/reviewStore";
import { formatTime } from "@/utils/collision";
import Scene3D from "@/components/three/Scene3D";

export default function Result() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [playbackIdx, setPlaybackIdx] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const loadSession = useGameStore((s) => s.loadSession);
  const session = useGameStore((s) => s.session);
  const allJudgments = useReviewStore((s) => s.judgments);

  useMemo(() => {
    if (sessionId) loadSession(sessionId);
  }, [sessionId, loadSession]);

  const judgments = useMemo(
    () => (sessionId ? allJudgments[sessionId] || [] : []),
    [allJudgments, sessionId],
  );
  const scene = session ? scenes.find((s) => s.id === session.sceneId) : undefined;

  const stats = useMemo(() => {
    let safe = 0;
    let review = 0;
    let error = 0;
    judgments.forEach((j) => {
      if (j.type === "safe") safe++;
      else if (j.type === "review") review++;
      else error++;
    });
    const total = judgments.length || 1;
    return {
      safe,
      review,
      error,
      safePct: Math.round((safe / total) * 100),
      reviewPct: Math.round((review / total) * 100),
      errorPct: Math.round((error / total) * 100),
    };
  }, [judgments]);

  const playbackJudgment = playbackIdx >= 0 && playbackIdx < judgments.length ? judgments[playbackIdx] : null;

  const currentScene = scene || scenes[0];

  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }
    setIsPlaying(true);
    let i = playbackIdx < 0 ? 0 : playbackIdx;
    const step = () => {
      setPlaybackIdx(i);
      i++;
      if (i >= judgments.length) {
        setIsPlaying(false);
      }
    };
    step();
    const timer = setInterval(() => {
      if (i >= judgments.length) {
        clearInterval(timer);
        setIsPlaying(false);
        return;
      }
      step();
    }, 1500);
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-mine-300">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 lg:p-6">
      <div className="grain-overlay" />
      <div className="relative z-10 max-w-7xl mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} className="btn-secondary flex items-center gap-1.5 !px-3 !py-2">
            <ArrowLeft className="w-4 h-4" /> 返回
          </button>
          <h1 className="font-serif text-2xl font-bold text-amber-glow flex-1">复盘结算</h1>
          <button
            onClick={() => navigate(`/export/${session.id}`)}
            className="btn-primary flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> 截图导出
          </button>
          {scene && (
            <button
              onClick={() => navigate(`/game/${scene.id}`)}
              className="btn-secondary flex items-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" /> 再来一轮
            </button>
          )}
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          <div className="card-glass p-5 md:col-span-1 flex flex-col items-center justify-center">
            <Trophy className="w-10 h-10 text-amber-glow mb-2" />
            <div className="font-mono text-5xl font-bold text-amber-glow">{session.score}</div>
            <div className="text-xs text-mine-400 mt-1">本轮得分</div>
          </div>
          <div className="card-glass p-5 md:col-span-1 flex flex-col items-center justify-center">
            <div className="text-xs text-mine-400 mb-2">准确率</div>
            <div className="font-mono text-5xl font-bold text-pore-glow">{session.accuracy}%</div>
            <div className="flex items-center gap-1 mt-2 text-xs text-mine-400">
              <Clock className="w-3.5 h-3.5" />
              <span className="font-mono">{formatTime(Math.round((session.endTime! - session.startTime) / 1000))}</span>
            </div>
          </div>
          <div className="card-glass p-5 md:col-span-2">
            <div className="text-xs text-mine-400 mb-3">结论分类分布</div>
            <div className="h-5 rounded-full overflow-hidden bg-mine-700 flex mb-3">
              <div className="bg-pore-safe transition-all" style={{ width: `${stats.safePct}%` }} />
              <div className="bg-warning-review transition-all" style={{ width: `${stats.reviewPct}%` }} />
              <div className="bg-warning-error transition-all" style={{ width: `${stats.errorPct}%` }} />
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="flex items-center justify-center gap-1 text-pore-glow">
                  <CheckCircle className="w-4 h-4" />
                  <span className="font-mono text-2xl font-bold">{stats.safe}</span>
                </div>
                <div className="text-[11px] text-mine-400 mt-0.5">直接可用</div>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1 text-warning-review">
                  <HelpCircle className="w-4 h-4" />
                  <span className="font-mono text-2xl font-bold">{stats.review}</span>
                </div>
                <div className="text-[11px] text-mine-400 mt-0.5">需复核</div>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1 text-warning-error">
                  <XCircle className="w-4 h-4" />
                  <span className="font-mono text-2xl font-bold">{stats.error}</span>
                </div>
                <div className="text-[11px] text-mine-400 mt-0.5">越界错误</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_380px] gap-4">
          <div className="card-glass overflow-hidden min-h-[420px] relative">
            {playbackJudgment ? (
              <Scene3D
                scene={currentScene}
                cutX={playbackJudgment.cutAxis === "x" ? playbackJudgment.cutValue : 0}
                cutY={playbackJudgment.cutAxis === "y" ? playbackJudgment.cutValue : 0}
                cutZ={playbackJudgment.cutAxis === "z" ? playbackJudgment.cutValue : 0}
                activeAxis={playbackJudgment.cutAxis}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                <div className="font-serif text-xl text-amber-glow mb-2">复盘模式</div>
                <p className="text-sm text-mine-300/80 max-w-md">
                  点击下方播放按钮逐步回放每一步剖切判断，或直接从右侧时间线选择某条记录。
                  三维场景将还原当时的剖切位置与越界状态。
                </p>
              </div>
            )}

            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 card-glass !bg-mine-900/90 px-3 py-2 flex items-center gap-3">
              <button
                onClick={() => setPlaybackIdx(Math.max(-1, playbackIdx - 1))}
                disabled={playbackIdx <= 0}
                className="p-1.5 rounded hover:bg-mine-700 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-mine-200" />
              </button>
              <button
                onClick={togglePlay}
                className="p-1.5 rounded bg-amber-glow/80 hover:bg-amber-glow text-mine-900 transition-colors"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setPlaybackIdx(Math.min(judgments.length - 1, playbackIdx + 1))}
                disabled={playbackIdx >= judgments.length - 1}
                className="p-1.5 rounded hover:bg-mine-700 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-mine-200" />
              </button>
              <div className="text-xs text-mine-300 font-mono ml-2">
                {playbackIdx + 1} / {judgments.length}
              </div>
            </div>
          </div>

          <div className="card-glass p-4 space-y-3 overflow-y-auto max-h-[600px]">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-5 rounded bg-amber-glow" />
              <h3 className="font-serif text-base font-semibold text-amber-glow">判断时间线</h3>
            </div>
            <div className="space-y-2">
              {judgments.map((j, idx) => {
                const active = idx === playbackIdx;
                const Icon =
                  j.type === "safe" ? CheckCircle : j.type === "review" ? HelpCircle : XCircle;
                const color =
                  j.type === "safe"
                    ? "text-pore-glow border-pore-safe/40 bg-pore-safe/10"
                    : j.type === "review"
                      ? "text-warning-review border-warning-review/40 bg-warning-review/10"
                      : "text-warning-error border-warning-error/40 bg-warning-error/10";
                const time = new Date(j.timestamp).toLocaleTimeString("zh-CN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                });
                return (
                  <div
                    key={j.id}
                    onClick={() => setPlaybackIdx(active ? -1 : idx)}
                    className={`p-3 rounded border cursor-pointer transition-all ${
                      active ? `${color} shadow-glow scale-[1.02]` : "bg-mine-900/40 border-mine-600/30 hover:border-mine-500/50"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-mono text-xs text-mine-400 w-6">#{idx + 1}</span>
                      <Icon className={`w-4 h-4 ${active ? "" : color.split(" ")[0]}`} />
                      <span className={`text-xs font-semibold ${active ? "" : color.split(" ")[0]}`}>
                        {j.type === "safe" ? "直接可用" : j.type === "review" ? "需复核" : "越界错误"}
                      </span>
                      <span className="ml-auto font-mono text-[10px] text-mine-500">{time}</span>
                    </div>
                    <div className="font-mono text-[11px] text-mine-300 mb-1">
                      {j.cutAxis.toUpperCase()} = {j.cutValue.toFixed(3)}
                      {j.isBoundaryCrossed && (
                        <span className="text-warning-error ml-2">越界 {j.crossDistance.toFixed(3)}</span>
                      )}
                    </div>
                    {j.comment && (
                      <div className="text-[11px] text-amber-glow/80">💬 {j.comment}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
