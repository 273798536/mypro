import { useEffect } from "react";
import Header from "@/components/Header";
import InputPanel from "@/components/InputPanel";
import ResultPanel from "@/components/ResultPanel";
import { useAppStore } from "@/utils/store";

export default function Home() {
  const { loadScenario, channels, output } = useAppStore();

  useEffect(() => {
    if (channels.length === 0) {
      loadScenario("smooth");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Header />
      <main className="max-w-[1600px] mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
          <aside className="space-y-4">
            <InputPanel />
          </aside>
          <section>
            <ResultPanel />
          </section>
        </div>

        {output && (
          <footer className="mt-8 border-t border-zinc-800 pt-4">
            <h3 className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">
              终端摘要
            </h3>
            <pre className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-xs text-zinc-400 font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto">
{`[分配完成] ${output.globalSummary}

预算上限结论:
  总预算:     ¥${output.totalBudget.toLocaleString()}
  已分配:     ¥${(output.totalBudget - output.remainingBudget).toLocaleString()}
  剩余:       ¥${output.remainingBudget.toLocaleString()}
  触及上限:   ${output.results.filter((r) => r.capReached).map((r) => `${r.channelName}(上限¥${r.dailyCap.toLocaleString()})`).join(", ") || "无"}
  总迭代轮数: ${output.totalRounds}

各渠道分配:
${output.results.map((r) => `  ${r.channelName}: ¥${r.allocatedBudget.toLocaleString()} / ¥${r.dailyCap.toLocaleString()} | 边际收益 ${r.marginalReturn.toFixed(6)} | 转化 ${r.expectedConversions.toFixed(4)}${r.capReached ? " ← 预算耗尽" : ""}${r.delayDiscount < 1 ? ` | 延迟折扣×${r.delayDiscount.toFixed(4)}` : ""}${r.duplicatePenalty < 1 ? ` | 重复惩罚×${r.duplicatePenalty.toFixed(4)}` : ""}`).join("\n")}`}
            </pre>
          </footer>
        )}
      </main>
    </div>
  );
}
