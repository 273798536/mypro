import { useNavigate } from "react-router-dom";
import { ClipboardList, FileDown, Beaker, Sparkles } from "lucide-react";
import { useEffect } from "react";
import ParameterPanel from "@/components/ParameterPanel";
import CollisionPanel from "@/components/CollisionPanel";
import CrystalViewport from "@/components/CrystalViewport";
import { useLatticeStore } from "@/store/useLatticeStore";

export default function Home() {
  const navigate = useNavigate();
  const ensureInitialized = useLatticeStore((s) => s.ensureInitialized);
  const currentBatch = useLatticeStore((s) => s.currentBatch());
  const batches = useLatticeStore((s) => s.batches);

  useEffect(() => {
    ensureInitialized();
  }, [ensureInitialized]);

  if (!currentBatch) {
    return (
      <div className="flex h-full items-center justify-center text-ink-100">
        <div className="animate-pulse">初始化中…</div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center justify-between border-b border-ink-500/30 px-5 py-2.5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-sm border border-lattice/50 bg-lattice/10 shadow-glow">
            <Beaker size={18} className="text-lattice" />
          </div>
          <div>
            <h1 className="font-display text-xl tracking-wide text-ink-50">
              化学晶胞堆叠课堂
            </h1>
            <p className="text-[10px] font-mono text-ink-200/70">
              参数联动 · 碰撞检测 · 复核追溯 · 同一批处理记录
            </p>
          </div>
          <span className="ml-2 chip border-ink-400/40 bg-ink-600/30 text-ink-100">
            <Sparkles size={10} className="text-lattice" />
            首次打开自动加载 NaCl 示例
          </span>
        </div>
        <nav className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="btn border-lattice/60 bg-lattice/10 text-lattice"
          >
            主工作台
          </button>
          <button
            type="button"
            onClick={() => navigate("/review")}
            className="btn-ghost flex items-center gap-1"
          >
            <ClipboardList size={13} />
            复核中心
            {batches.length > 0 && (
              <span className="chip ml-1 border-ink-400/40 text-ink-100">
                {batches.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => navigate("/export")}
            className="btn-ghost flex items-center gap-1"
          >
            <FileDown size={13} />
            成果输出
          </button>
        </nav>
      </header>

      <div className="flex min-h-0 flex-1 gap-3 p-3">
        <ParameterPanel batch={currentBatch} />
        <main className="min-w-0 flex-1">
          <CrystalViewport batch={currentBatch} />
        </main>
        <CollisionPanel batch={currentBatch} />
      </div>
    </div>
  );
}
