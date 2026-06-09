import { useVolumeStore } from "@/store/useVolumeStore";
import ParamCard from "@/components/ParamCard";
import VolumeOverview from "@/components/VolumeOverview";
import TrendChart from "@/components/TrendChart";
import AnomalyBarChart from "@/components/AnomalyBarChart";
import MaterialList from "@/components/MaterialList";
import CalculationDraft from "@/components/CalculationDraft";
import AnomalyCards from "@/components/AnomalyCards";
import HistoryCompare from "@/components/HistoryCompare";
import ExportPanel from "@/components/ExportPanel";
import { Package, Boxes, GitCompare, Download } from "lucide-react";

const TABS = [
  { key: "overview", label: "总览", icon: Package },
  { key: "materials", label: "清单与草稿", icon: Boxes },
  { key: "compare", label: "历史对比", icon: GitCompare },
  { key: "export", label: "导出", icon: Download },
];

export default function Dashboard() {
  const { activeTab, setActiveTab, currentBatch, batches, currentBatchId, setCurrentBatchId } = useVolumeStore();

  return (
    <div className="min-h-screen">
      <header className="bg-ink-800 text-white">
        <div className="max-w-[1400px] mx-auto px-6 py-5">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="serif text-2xl font-bold tracking-wide">物流装箱体积近似</h1>
              <p className="serif text-ink-200 text-xs mt-1">排课材料批次复核 · 把题目清单、计算草稿、异常结论连起来看</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="serif text-xs text-ink-300">当前批次</span>
              <select
                value={currentBatchId}
                onChange={(e) => setCurrentBatchId(e.target.value)}
                className="bg-ink-700 border border-ink-600 rounded px-3 py-1.5 mono text-sm text-white focus:outline-none focus:border-amber-400"
              >
                {batches.map((b) => (
                  <option key={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>
          <nav className="flex gap-1 mt-5">
            {TABS.map((t) => {
              const Icon = t.icon;
              const isActive = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded serif text-sm transition-colors ${
                    isActive
                      ? "bg-amber-400 text-ink-900 font-semibold"
                      : "text-ink-200 hover:text-white hover:bg-ink-700"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                </button>
              );
            })}
          </nav>
        </div>
        <div className="border-t border-ink-700" />
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-6">
        {activeTab === "overview" && (
          <div className="space-y-5 animate-fadeUp">
          <VolumeOverview />
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <div className="xl:col-span-1">
              <ParamCard />
            </div>
            <TrendChart />
            <AnomalyBarChart />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <MaterialList />
            <div className="space-y-5">
              <AnomalyCards />
            </div>
          </div>
        </div>
        )}

        {activeTab === "materials" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 animate-fadeUp">
            <MaterialList />
            <div className="space-y-5">
              <CalculationDraft />
              <AnomalyCards />
            </div>
          </div>
          )}

        {activeTab === "compare" && (
          <div className="animate-fadeUp">
            <HistoryCompare />
          </div>
        )}

        {activeTab === "export" && (
          <div className="max-w-2xl animate-fadeUp">
            <ExportPanel />
          </div>
        )}

        <footer className="mt-10 pb-6 text-center serif text-xs text-ink-400">
          批次 {currentBatch.id} · 创建于 {currentBatch.createdAt.slice(0, 10)} · 参数、图表、明细、下载完全同源
        </footer>
      </main>
    </div>
  );
}
