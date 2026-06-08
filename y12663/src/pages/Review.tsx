import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Flag,
  Layers,
  AlertTriangle,
  CheckCircle,
  Camera,
  Shield,
  Clock,
} from "lucide-react";
import Timeline from "@/components/review/Timeline";
import TraceChainView from "@/components/review/TraceChainView";
import { useGameStore } from "@/store/gameStore";
import { useDataStore } from "@/store/dataStore";
import { formatDuration } from "@/utils/format";
import SceneCanvas from "@/components/scene/SceneCanvas";

export default function Review() {
  const status = useGameStore((s) => s.status);
  const stats = useGameStore((s) => s.stats);
  const getElapsedMs = useGameStore((s) => s.getElapsedMs);
  const planes = useDataStore((s) => s.planes);
  const datasets = useDataStore((s) => s.datasets);

  const counts = useMemo(
    () => ({
      overrun: planes.filter((p) => p.status === "overrun").length,
      resolved: planes.filter((p) => p.status === "resolved").length,
      normal: planes.filter((p) => p.status === "normal").length,
    }),
    [planes],
  );

  const cards = [
    {
      label: "累计时长",
      value: formatDuration(getElapsedMs()),
      Icon: Clock,
      color: "text-cool-400",
      bg: "from-cool-400/20 to-cool-400/5",
    },
    {
      label: "处理记录",
      value: stats.totalRecords.toString(),
      Icon: Layers,
      color: "text-zinc-100",
      bg: "from-zinc-400/20 to-zinc-400/5",
    },
    {
      label: "越界告警",
      value: `${counts.overrun}`,
      Icon: AlertTriangle,
      color: "text-alert-400",
      bg: "from-alert-400/25 to-alert-400/5",
    },
    {
      label: "已修正",
      value: `${counts.resolved}`,
      Icon: CheckCircle,
      color: "text-lime-400",
      bg: "from-lime-400/25 to-lime-400/5",
    },
    {
      label: "重复拦截",
      value: stats.duplicateBlocked.toString(),
      Icon: Shield,
      color: "text-purple-300",
      bg: "from-purple-400/25 to-purple-400/5",
    },
    {
      label: "截图导出",
      value: stats.exportedCount.toString(),
      Icon: Camera,
      color: "text-yellow-300",
      bg: "from-yellow-400/25 to-yellow-400/5",
    },
  ];

  return (
    <div className="relative h-full w-full flex flex-col p-3 md:p-5 gap-4 overflow-y-auto z-10">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="btn-pill bg-white/5 border-white/15 text-zinc-200 hover:bg-white/10"
          >
            <ArrowLeft size={14} /> 返回工作台
          </Link>
          <div>
            <div className="text-base md:text-lg font-bold tracking-wide flex items-center gap-2">
              <Flag size={18} className="text-cool-400" /> 复盘 · 回合结算
            </div>
            <div className="text-[11px] text-zinc-400 font-mono-app">
              回放过操作、倒查追溯链路
            </div>
          </div>
        </div>
        <div className="text-[11px] font-mono-app text-zinc-400">
          数据集 {datasets.length} · 剖切面 {planes.length} · 状态：{status}
        </div>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map((c) => (
          <div
            key={c.label}
            className={`rounded-2xl border border-white/10 bg-gradient-to-br ${c.bg} p-4 backdrop-blur-sm`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`text-[11px] font-mono-app ${c.color}`}>
                {c.label}
              </div>
              <c.Icon size={14} className={c.color} />
            </div>
            <div className={`text-2xl font-bold font-mono-app ${c.color}`}>
              {c.value}
            </div>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 space-y-4">
          <TraceChainView />
          <Timeline />
        </div>
        <div className="lg:col-span-2 min-h-[360px] glass-card p-2 flex flex-col">
          <div className="text-[11px] font-mono-app text-zinc-400 px-2 py-1">
            场景回放：点击时间轴或追溯节点，相机自动过渡
          </div>
          <div className="flex-1 min-h-0 rounded-xl overflow-hidden border border-white/10">
            <SceneCanvas />
          </div>
        </div>
      </section>

      <footer className="text-center text-[11px] font-mono-app text-zinc-600 pt-2">
        教学楼日照体块盒 · 可从任意结论回到来源与处理记录
      </footer>
    </div>
  );
}
