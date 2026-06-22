import { Download, BarChart3, TrendingUp, Users, Layers } from "lucide-react";
import { useSamplingStore } from "@/store/useSamplingStore";
import { cn } from "@/lib/utils";

export default function ResultPanel() {
  const result = useSamplingStore((s) => s.samplingResult);
  const samples = useSamplingStore((s) => s.samples);
  const sampledIds = ["s001", "s006", "s005", "s010"];
  const sampledSamples = samples.filter((s) => sampledIds.includes(s.id));

  const handleExport = () => {
    const data = {
      result,
      samples: sampledSamples,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sampling_result.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const metrics = [
    {
      label: "样本总数",
      value: result.totalCount,
      unit: "条",
      icon: Layers,
      color: "text-slate-deep",
      bg: "bg-slate-deep/10",
    },
    {
      label: "已抽样",
      value: result.sampledCount,
      unit: "条",
      icon: Users,
      color: "text-teal-jade",
      bg: "bg-teal-jade/10",
    },
    {
      label: "抽样率",
      value: (result.sampleRate * 100).toFixed(1),
      unit: "%",
      icon: BarChart3,
      color: "text-blue-600",
      bg: "bg-blue-600/10",
    },
    {
      label: "样本均值",
      value: result.meanValue.toFixed(0),
      unit: "元",
      icon: TrendingUp,
      color: "text-amber-warm",
      bg: "bg-amber-warm/10",
    },
  ];

  return (
    <section id="result-section" className="bg-white rounded-xl shadow-card overflow-hidden animate-fadeUp">
      <div className="px-5 py-4 border-b border-ink-100 flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg font-semibold text-ink-900">抽样结果</h3>
          <p className="text-xs font-mono text-ink-500 mt-0.5">
            最终样本集、统计指标 · 可导出 JSON
          </p>
        </div>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-deep text-white text-xs font-mono hover:bg-slate-darker transition-colors"
        >
          <Download size={13} />
          导出 JSON
        </button>
      </div>

      <div className="p-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {metrics.map((m) => {
            const Icon = m.icon;
            return (
              <div
                key={m.label}
                className="bg-ink-50 rounded-lg p-3 flex items-center gap-3"
              >
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", m.bg)}>
                  <Icon size={18} className={m.color} />
                </div>
                <div>
                  <div className="text-[10px] font-mono text-ink-500 uppercase tracking-wider">
                    {m.label}
                  </div>
                  <div className={cn("font-mono font-semibold text-lg", m.color)}>
                    {m.value}
                    <span className="text-xs font-normal text-ink-500 ml-0.5">{m.unit}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div>
          <div className="text-xs font-mono text-ink-500 uppercase tracking-wider mb-2">
            抽中样本明细
          </div>
          <div className="border border-ink-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-ink-100/80">
                  <th className="px-3 py-2 text-left text-[11px] font-mono font-semibold text-ink-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-3 py-2 text-left text-[11px] font-mono font-semibold text-ink-500 uppercase tracking-wider">
                    订单
                  </th>
                  <th className="px-3 py-2 text-right text-[11px] font-mono font-semibold text-ink-500 uppercase tracking-wider">
                    金额
                  </th>
                  <th className="px-3 py-2 text-left text-[11px] font-mono font-semibold text-ink-500 uppercase tracking-wider">
                    分层
                  </th>
                </tr>
              </thead>
              <tbody>
                {sampledSamples.map((s, i) => (
                  <tr key={s.id} className={i % 2 === 0 ? "bg-white" : "bg-ink-50"}>
                    <td className="px-3 py-2 text-[12px] font-mono text-ink-500">{s.id}</td>
                    <td className="px-3 py-2 text-[12px] font-mono text-ink-900">{s.name}</td>
                    <td className="px-3 py-2 text-right text-[12px] font-mono text-ink-900 font-medium">
                      {(s.value ?? s.filledValue ?? 0).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-[12px] font-mono">
                      <span className="px-1.5 py-0.5 rounded bg-slate-deep/10 text-slate-deep text-[10px]">
                        {s.category ?? s.filledCategory}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

