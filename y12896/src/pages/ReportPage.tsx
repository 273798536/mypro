import { useEffect, useState } from "react";
import { usePlaybackStore } from "@/store/playbackStore";
import type { Report } from "~/shared/types";
import {
  FileBarChart,
  Download,
  Zap,
  Droplets,
  AlertTriangle,
  BookOpen,
  Layers,
  RefreshCw,
} from "lucide-react";
import { formatTime, formatDateTime, alertBadgeClass } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function ReportPage() {
  const {
    init,
    scenarios,
    scenario,
    strategy,
    timezone,
    generateReport,
    loading,
    selectScenario,
    setStrategy,
  } = usePlaybackStore();
  const [report, setReport] = useState<Report | null>(null);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (scenario) {
      generateReport().then(() => {
        const store = usePlaybackStore.getState();
        setReport(store.report);
      });
    }
  }, [scenario?.id, strategy, timezone, generateReport]);

  const refresh = async () => {
    await generateReport();
    setReport(usePlaybackStore.getState().report);
  };

  if (!report) {
    return (
      <div className="flex items-center justify-center h-[70vh] text-ocean-300">
        <RefreshCw className="w-8 h-8 animate-spin mr-3" />
        正在生成课堂报告...
      </div>
    );
  }

  const printReport = () => {
    window.print();
  };

  return (
    <div className="min-h-screen pb-16">
      <div className="max-w-[1300px] mx-auto px-6 py-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4 print:hidden">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <FileBarChart className="w-7 h-7 text-tide-green" />
              课堂报告
            </h1>
            <p className="text-sm text-ocean-300 mt-1">
              根据当前潮汐场景和闸门策略，按时段总结发电量、风险事件与教学要点
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-ocean-400 uppercase tracking-wider">场景</label>
              <div className="flex gap-1">
                {scenarios.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => selectScenario(s.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium transition border",
                      scenario?.id === s.id
                        ? "bg-tide-green/20 border-tide-green/50 text-tide-green"
                        : "bg-ocean-800/60 border-ocean-700/40 text-ocean-200 hover:bg-ocean-700/60"
                    )}
                  >
                    <Layers className="w-3 h-3 inline mr-1 -mt-0.5" />
                    {s.tideType}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-ocean-400 uppercase tracking-wider">策略</label>
              <div className="flex gap-1">
                {(["correct", "wrong", "custom"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStrategy(s)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium transition border",
                      strategy === s
                        ? "bg-tide-teal/20 border-tide-teal/50 text-tide-teal"
                        : "bg-ocean-800/60 border-ocean-700/40 text-ocean-200 hover:bg-ocean-700/60"
                    )}
                  >
                    {s === "correct" ? "正确" : s === "wrong" ? "错误" : "自定义"}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={refresh}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-ocean-700/60 border border-ocean-600/40 text-ocean-200 hover:bg-ocean-600/60 text-sm font-medium transition flex items-center gap-2"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              重新生成
            </button>
            <button
              onClick={printReport}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-tide-green to-tide-teal text-ocean-900 text-sm font-semibold transition shadow-glow flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              导出/打印报告
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl bg-gradient-to-br from-ocean-800/70 to-ocean-900/50 border border-ocean-700/50 p-6 shadow-lg">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
              <div>
                <div className="text-xs text-ocean-400 uppercase tracking-wider mb-1">
                  {scenario?.name} · {report.strategyLabel}
                </div>
                <h2 className="text-xl font-bold text-white">
                  潮汐发电闸门演示 - 课堂分析报告
                </h2>
                <p className="text-xs text-ocean-300 mt-1">
                  时区: {timezone} · 生成时间: {new Date().toLocaleString("zh-CN")}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <SummaryCard
                icon={<Zap className="w-5 h-5 text-tide-green" />}
                label="累计发电量"
                value={`${report.summary.totalEnergy.toFixed(0)} kWh`}
                sub="24小时总计"
              />
              <SummaryCard
                icon={<Zap className="w-5 h-5 text-tide-warning" />}
                label="峰值功率"
                value={`${report.summary.peakPower.toFixed(0)} kW`}
                sub="最高输出"
              />
              <SummaryCard
                icon={<BookOpen className="w-5 h-5 text-tide-teal" />}
                label="平均效率"
                value={`${report.summary.averageEfficiency.toFixed(0)}%`}
                sub="水轮机组"
              />
              <SummaryCard
                icon={<Droplets className="w-5 h-5 text-tide-danger" />}
                label="累计弃水"
                value={`${(report.summary.totalWaterDiscarded / 1000).toFixed(1)} km³`}
                sub="未利用水量"
                danger={report.summary.totalWaterDiscarded > 0}
              />
              <SummaryCard
                icon={<AlertTriangle className="w-5 h-5 text-tide-warning" />}
                label="告警事件"
                value={`${report.summary.alertCount.shutdown + report.summary.alertCount.danger + report.summary.alertCount.warning + report.summary.alertCount.info} 件`}
                sub={`停机${report.summary.alertCount.shutdown} · 危险${report.summary.alertCount.danger}`}
                danger={report.summary.alertCount.shutdown + report.summary.alertCount.danger > 0}
              />
            </div>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-ocean-800/70 to-ocean-900/50 border border-ocean-700/50 p-6 shadow-lg">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-5">
              📊 按时段教学分析
            </h3>
            <div className="space-y-3.5">
              {report.segments.map((seg, idx) => {
                const isGood = seg.label.includes("最佳发电") || seg.label.includes("蓄水");
                const isBad = seg.label.includes("弃水");
                return (
                  <div
                    key={idx}
                    className={cn(
                      "rounded-xl border-l-4 bg-ocean-900/50 p-4 transition hover:bg-ocean-800/50",
                      isBad
                        ? "border-tide-danger"
                        : isGood
                        ? "border-tide-green"
                        : "border-ocean-400"
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-2.5">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span
                          className={cn(
                            "px-3 py-1 rounded-full text-xs font-bold",
                            isBad
                              ? "bg-tide-danger/20 text-tide-danger"
                              : isGood
                              ? "bg-tide-green/20 text-tide-green"
                              : "bg-ocean-400/20 text-ocean-200"
                          )}
                        >
                          {seg.label}
                        </span>
                        <span className="font-mono text-sm text-ocean-300">
                          {formatTime(seg.startTime)} - {formatTime(seg.endTime)}
                        </span>
                        <span className="text-[10px] text-ocean-500">
                          时段 {idx + 1} / {report.segments.length}
                        </span>
                      </div>
                      <div className="flex gap-4 text-right">
                        <div>
                          <div className="text-[10px] text-ocean-400 uppercase">发电量</div>
                          <div className="font-mono font-bold text-tide-green">
                            {seg.energy.toFixed(0)} kWh
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-ocean-400 uppercase">平均功率</div>
                          <div className="font-mono font-bold text-tide-warning">
                            {seg.avgPower.toFixed(0)} kW
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-ocean-200 leading-relaxed">
                      <span className="text-tide-teal font-semibold">教学建议：</span>
                      {seg.recommendation}
                    </p>
                    {seg.events.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/5 flex flex-wrap gap-2">
                        {seg.events.map((e, i) => (
                          <span
                            key={i}
                            className={cn(
                              "text-[10px] px-2 py-1 rounded-full border",
                              alertBadgeClass(e.type === "info" ? "info" : e.type === "warning" ? "warning" : e.type === "danger" ? "danger" : "info")
                            )}
                          >
                            {formatTime(e.time)} {e.description}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-ocean-800/70 to-ocean-900/50 border border-ocean-700/50 p-6 shadow-lg">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-5">
              📚 教学知识点（课堂讨论用）
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              {report.teachingNotes.map((note, idx) => (
                <div
                  key={idx}
                  className="rounded-xl bg-gradient-to-br from-ocean-900/70 to-ocean-800/40 border border-ocean-700/40 p-5 hover:border-tide-green/30 transition"
                >
                  <h4 className="text-sm font-bold text-tide-green mb-2.5 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-tide-green/15 flex items-center justify-center border border-tide-green/40 text-[11px]">
                      {idx + 1}
                    </span>
                    {note.title}
                  </h4>
                  <p className="text-sm text-ocean-200 leading-relaxed">{note.content}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border-2 border-dashed border-tide-green/30 bg-tide-green/5 p-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-tide-green/20 flex items-center justify-center shrink-0">
                <BookOpen className="w-7 h-7 text-tide-green" />
              </div>
              <div className="flex-1">
                <h4 className="text-base font-bold text-tide-green mb-2">课堂教学流程建议（45分钟）</h4>
                <ol className="space-y-1.5 text-sm text-ocean-200 leading-relaxed list-decimal list-inside">
                  <li>
                    <span className="font-semibold text-white">引入（5分钟）：</span>在"策略实验"页展示两种策略的发电量差异，抛出问题——"为什么同样的海水，发电量差了好几倍？"
                  </li>
                  <li>
                    <span className="font-semibold text-white">演示（15分钟）：</span>切换到"演示控制台"，播放回放，重点讲解"蓄水→发电→待机"三个阶段的闸门策略。
                  </li>
                  <li>
                    <span className="font-semibold text-white">互动（10分钟）：</span>让学生使用"人工调整闸门"面板故意犯错误（涨潮开闸），观察弃水告警和发电量影响。
                  </li>
                  <li>
                    <span className="font-semibold text-white">拓展（10分钟）：</span>切换时区和场景（混合潮→UTC时区），展示时区错误如何导致闸门策略完全错位。
                  </li>
                  <li>
                    <span className="font-semibold text-white">总结（5分钟）：</span>打开本报告，回顾各时段操作建议和教学知识点，布置课后思考题。
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          body { background: white !important; color: #111 !important; }
          .rounded-2xl { border: 1px solid #ddd !important; background: white !important; box-shadow: none !important; }
          .text-white, .text-ocean-100, .text-ocean-200 { color: #111 !important; }
          .text-tide-green { color: #047857 !important; }
          .text-tide-danger { color: #dc2626 !important; }
          .text-tide-warning { color: #d97706 !important; }
          .text-ocean-300, .text-ocean-400, .text-ocean-500 { color: #555 !important; }
          .bg-tide-green\\/20 { background: #ecfdf5 !important; }
          .bg-tide-danger\\/20 { background: #fef2f2 !important; }
        }
      `}</style>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  sub,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  danger?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl p-4 border bg-ocean-900/50",
        danger ? "border-tide-danger/40" : "border-ocean-700/40"
      )}
    >
      <div className="flex items-center gap-2 text-ocean-400 text-[11px] uppercase tracking-wider mb-2">
        {icon}
        {label}
      </div>
      <div
        className={cn(
          "font-mono text-xl font-bold",
          danger ? "text-tide-danger" : "text-white"
        )}
      >
        {value}
      </div>
      <div className="text-[10px] text-ocean-500 mt-1">{sub}</div>
    </div>
  );
}
