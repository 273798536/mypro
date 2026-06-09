import { Layers, TrendingUp, CheckCircle2, AlertTriangle, XCircle, Play, History } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { scenes } from "@/data/mock/scenes";
import { getAllSessions } from "@/stores/gameStore";
import { useReviewStore } from "@/stores/reviewStore";
import { useMemo } from "react";

export default function Dashboard() {
  const navigate = useNavigate();
  const sessions = useMemo(() => getAllSessions(), []);
  const allJudgments = useReviewStore((s) => s.judgments);

  const stats = useMemo(() => {
    let total = 0;
    let safe = 0;
    let review = 0;
    let error = 0;
    sessions.forEach((sess) => {
      const j = allJudgments[sess.id] || [];
      total += j.length;
      j.forEach((jj) => {
        if (jj.type === "safe") safe++;
        else if (jj.type === "review") review++;
        else error++;
      });
    });
    const acc = total > 0 ? Math.round(((safe + review * 0.5) / total) * 100) : 0;
    return { total, safe, review, error, acc, sessions: sessions.length };
  }, [sessions, allJudgments]);

  return (
    <div className="min-h-screen p-6 lg:p-10 relative">
      <div className="grain-overlay" />
      <div className="relative z-10 max-w-7xl mx-auto space-y-8">
        <header className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-glow to-amber-dark flex items-center justify-center shadow-glow">
              <Layers className="w-6 h-6 text-mine-900" />
            </div>
            <div>
              <h1 className="font-serif text-2xl lg:text-3xl font-bold text-amber-glow">
                油气储层孔隙漫游
              </h1>
              <p className="text-sm text-mine-300/70">
                剖切面越界复核训练 · 测量记录 · 三维模型 · 离群点漂浮 一体化复核
              </p>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card-glass p-4">
            <div className="flex items-center gap-2 text-xs text-mine-300/70 mb-1">完成轮次</div>
            <div className="font-mono text-3xl font-bold text-amber-glow">{stats.sessions}</div>
          </div>
          <div className="card-glass p-4">
            <div className="flex items-center gap-2 text-xs text-mine-300/70 mb-1">累计判断</div>
            <div className="font-mono text-3xl font-bold text-mine-100">{stats.total}</div>
          </div>
          <div className="card-glass p-4">
            <div className="flex items-center gap-2 text-xs text-mine-300/70 mb-1">综合准确率</div>
            <div className="font-mono text-3xl font-bold text-pore-glow">{stats.acc}%</div>
          </div>
          <div className="card-glass p-4">
            <div className="flex items-center gap-2 text-xs text-mine-300/70 mb-1">结论分布</div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-pore-glow font-mono font-bold">{stats.safe}</span>
              <span className="text-warning-review font-mono font-bold">{stats.review}</span>
              <span className="text-warning-error font-mono font-bold">{stats.error}</span>
            </div>
            <div className="h-1.5 mt-2 rounded-full overflow-hidden bg-mine-700 flex">
              {stats.total > 0 && (
                <>
                  <div className="bg-pore-safe" style={{ width: `${(stats.safe / stats.total) * 100}%` }} />
                  <div className="bg-warning-review" style={{ width: `${(stats.review / stats.total) * 100}%` }} />
                  <div className="bg-warning-error" style={{ width: `${(stats.error / stats.total) * 100}%` }} />
                </>
              )}
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-amber-glow" />
            <h2 className="font-serif text-lg font-semibold text-amber-glow">训练场景</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {scenes.map((scene) => (
              <div
                key={scene.id}
                className="card-glass-hover p-5 flex flex-col gap-3 group"
                onClick={() => navigate(`/game/${scene.id}`)}
              >
                <div className="flex items-start justify-between">
                  <h3 className="font-serif text-lg font-semibold text-mine-100 group-hover:text-amber-glow transition-colors">
                    {scene.name}
                  </h3>
                  <span
                    className={`tag ${
                      scene.difficulty === "入门"
                        ? "tag-safe"
                        : scene.difficulty === "进阶"
                          ? "tag-review"
                          : "tag-error"
                    }`}
                  >
                    {scene.difficulty}
                  </span>
                </div>
                <p className="text-sm text-mine-300/80 flex-1">{scene.description}</p>
                <div className="flex flex-wrap gap-3 text-[11px] text-mine-400 font-mono">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-pore-glow/70" /> 孔隙 {scene.pores.length}
                  </span>
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-warning-review/70" /> 离群 {scene.outliers.length}
                  </span>
                  <span className="flex items-center gap-1">
                    <XCircle className="w-3 h-3 text-warning-error/70" /> 记录 {scene.measurements.length}
                  </span>
                </div>
                {scene.isDuplicateTest && (
                  <div className="text-[11px] text-warning-error flex items-center gap-1">
                    ⚠ 含重复导入记录，用于测试去重逻辑
                  </div>
                )}
                <button className="btn-primary w-full flex items-center justify-center gap-2 mt-1">
                  <Play className="w-4 h-4" /> 开始训练
                </button>
              </div>
            ))}
          </div>
        </section>

        {sessions.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <History className="w-5 h-5 text-amber-glow" />
              <h2 className="font-serif text-lg font-semibold text-amber-glow">历史记录</h2>
            </div>
            <div className="card-glass divide-y divide-mine-600/30 overflow-hidden">
              {sessions.slice(0, 8).map((sess) => {
                const scene = scenes.find((s) => s.id === sess.sceneId);
                const j = allJudgments[sess.id] || [];
                const date = new Date(sess.startTime).toLocaleString("zh-CN");
                return (
                  <div
                    key={sess.id}
                    className="px-4 py-3 flex items-center gap-4 hover:bg-mine-700/30 cursor-pointer transition-colors"
                    onClick={() =>
                      navigate(
                        sess.status === "completed"
                          ? `/result/${sess.id}`
                          : `/game/${sess.sceneId}`,
                      )
                    }
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-mine-100 font-medium">
                        {scene?.name || "未知场景"}
                      </div>
                      <div className="text-[11px] text-mine-400 font-mono">{date}</div>
                    </div>
                    <div className="text-xs text-mine-300 font-mono">
                      {j.length} 条判断
                    </div>
                    {sess.status === "completed" ? (
                      <>
                        <span className="tag tag-safe">得分 {sess.score}</span>
                        <span className="text-xs text-pore-glow font-mono">{sess.accuracy}%</span>
                      </>
                    ) : (
                      <span className="tag tag-review">进行中</span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
