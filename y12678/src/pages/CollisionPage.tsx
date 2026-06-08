import { useState } from "react";
import { AlertTriangle, CheckCircle, Download, Filter } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import DetectionPanel from "@/components/collision/DetectionPanel";
import CollisionReportCard from "@/components/collision/CollisionReportCard";
import { useAppStore } from "@/store/useAppStore";

type RiskFilter = "all" | "high" | "medium" | "low";

export default function CollisionPage() {
  const { collisionResults } = useAppStore();
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("all");

  const getRiskLevel = (d: number) =>
    d < 18 ? "high" : d < 24 ? "medium" : "low";

  const filtered = collisionResults.filter(
    (r) => riskFilter === "all" || getRiskLevel(r.distance) === riskFilter
  );

  const stats = {
    total: collisionResults.length,
    high: collisionResults.filter((r) => getRiskLevel(r.distance) === "high").length,
    medium: collisionResults.filter((r) => getRiskLevel(r.distance) === "medium").length,
    low: collisionResults.filter((r) => getRiskLevel(r.distance) === "low").length,
  };

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader
        title="碰撞检测"
        subtitle="月底 / 课前检测 · 可解释判定 · 自动关联溯源"
      >
        <button className="btn-secondary">
          <Filter className="h-4 w-4" />
          高级筛选
        </button>
        <button className="btn-secondary">
          <Download className="h-4 w-4" />
          导出报告
        </button>
      </PageHeader>

      <div className="flex-1 space-y-5 p-6">
        <DetectionPanel onDetect={() => {}} />

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="eng-card p-4">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <AlertTriangle className="h-4 w-4 text-ocean-500" />
              <span>检测总数</span>
            </div>
            <p className="mt-1 font-mono-num text-2xl font-bold text-ocean-700">{stats.total}</p>
          </div>
          <div className="eng-card p-4 border-l-4 border-l-coral-500">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <AlertTriangle className="h-4 w-4 text-coral-500" />
              <span>高风险</span>
            </div>
            <p className="mt-1 font-mono-num text-2xl font-bold text-coral-600">{stats.high}</p>
          </div>
          <div className="eng-card p-4 border-l-4 border-l-amber-500">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span>临界状态</span>
            </div>
            <p className="mt-1 font-mono-num text-2xl font-bold text-amber-600">{stats.medium}</p>
          </div>
          <div className="eng-card p-4 border-l-4 border-l-seaweed-500">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <CheckCircle className="h-4 w-4 text-seaweed-500" />
              <span>低风险</span>
            </div>
            <p className="mt-1 font-mono-num text-2xl font-bold text-seaweed-600">{stats.low}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {([
            { k: "all", label: "全部" },
            { k: "high", label: "高风险" },
            { k: "medium", label: "临界" },
            { k: "low", label: "低风险" },
          ] as { k: RiskFilter; label: string }[]).map((opt) => (
            <button
              key={opt.k}
              onClick={() => setRiskFilter(opt.k)}
              className={`rounded px-3 py-1.5 text-xs font-song transition-colors ${
                riskFilter === opt.k
                  ? "bg-ocean-500 text-white shadow-sm"
                  : "bg-white border border-ocean-200 text-ocean-600 hover:bg-ocean-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
          <span className="ml-2 text-xs text-gray-400">
            共 {filtered.length} 条结果
          </span>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {filtered.map((r, idx) => (
            <CollisionReportCard key={r.id} result={r} index={idx} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="eng-card flex flex-col items-center justify-center py-20">
            <CheckCircle className="mb-3 h-12 w-12 text-seaweed-300" />
            <p className="font-song text-ocean-500">当前筛选范围无碰撞风险</p>
            <p className="mt-1 text-xs text-gray-400">可调整检测范围或筛选条件</p>
          </div>
        )}
      </div>
    </div>
  );
}
