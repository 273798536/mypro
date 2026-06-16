import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/layout/PageContainer";
import { WorkbenchFilter } from "@/components/merge/WorkbenchFilter";
import { GroupTableRow } from "@/components/merge/GroupTableRow";
import { VariantCompareCard } from "@/components/merge/VariantCompareCard";
import { RiskAlertBar } from "@/components/merge/RiskAlertBar";
import { ActionFooter } from "@/components/merge/ActionFooter";
import { useFilteredGroups } from "@/hooks/useFilter";
import { useAppStore } from "@/store/useAppStore";
import { StatusBadge } from "@/components/ui/Badges";
import {
  ArrowUpDown,
  GitMerge,
  FileDown,
  AlertTriangle,
  LayoutGrid,
  LayoutList,
} from "lucide-react";
import clsx from "clsx";

type ViewMode = "list" | "compare";
type SortKey = "confidence" | "updatedAt" | "variantCount" | "risk";

export function MergeWorkbenchPage() {
  const groups = useFilteredGroups();
  const adjacentRisks = useAppStore((s) => s.adjacentRisks);
  const risks = useMemo(
    () => adjacentRisks.filter((r) => !r.reviewed),
    [adjacentRisks]
  );
  const [view, setView] = useState<ViewMode>("list");
  const [sortKey, setSortKey] = useState<SortKey>("confidence");
  const [sortAsc, setSortAsc] = useState(false);
  const navigate = useNavigate();

  const sorted = [...groups].sort((a, b) => {
    let r = 0;
    if (sortKey === "confidence") r = a.confidence - b.confidence;
    else if (sortKey === "variantCount") r = a.variantCount - b.variantCount;
    else if (sortKey === "risk") {
      const rank = { high: 0, low: 1, none: 2 } as const;
      r = rank[a.riskLevel] - rank[b.riskLevel];
    } else {
      r = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
    }
    return sortAsc ? r : -r;
  });

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortAsc((v) => !v);
    else {
      setSortKey(k);
      setSortAsc(false);
    }
  };

  const headerTip = (k: SortKey, label: string) => (
    <button
      onClick={() => toggleSort(k)}
      className="inline-flex items-center gap-1 hover:text-civic-700 transition-colors"
    >
      {label}
      <ArrowUpDown
        className={clsx(
          "w-3 h-3 transition-transform",
          sortKey === k && !sortAsc && "rotate-180",
          sortKey === k ? "text-civic-600" : "text-neutral-300"
        )}
      />
    </button>
  );

  return (
    <PageContainer
      title="点位归并工作台"
      subtitle="筛选候选组→查看变体对比→评估相邻风险→人工判断留痕，异常点红色标记"
      headerActions={
        <>
          <div className="inline-flex rounded-civic border border-neutral-200 overflow-hidden">
            <button
              onClick={() => setView("list")}
              className={clsx(
                "px-3 py-1.5 text-xs flex items-center gap-1 transition-colors",
                view === "list"
                  ? "bg-civic-600 text-white"
                  : "bg-white text-neutral-600 hover:bg-neutral-50"
              )}
            >
              <LayoutList className="w-3.5 h-3.5" />
              列表视图
            </button>
            <button
              onClick={() => setView("compare")}
              className={clsx(
                "px-3 py-1.5 text-xs flex items-center gap-1 transition-colors",
                view === "compare"
                  ? "bg-civic-600 text-white"
                  : "bg-white text-neutral-600 hover:bg-neutral-50"
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              对比视图
            </button>
          </div>
          <button
            onClick={() => navigate("/export")}
            className="btn-outline"
          >
            <FileDown className="w-4 h-4" />
            导出结果
          </button>
          <button
            onClick={() => navigate("/history")}
            className="btn-primary"
          >
            <GitMerge className="w-4 h-4" />
            操作历史
          </button>
        </>
      }
    >
      {risks.length > 0 && <RiskAlertBar />}

      <WorkbenchFilter />

      {view === "list" ? (
        <div className="card-base overflow-hidden animate-fade-up">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px]">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="w-1 py-3" />
                  <th className="w-10 py-3 px-3" />
                  <th className="py-3 px-2 w-20">组号</th>
                  <th className="py-3 px-2 min-w-[340px]">
                    点位名称 / 名称变体
                  </th>
                  <th className="py-3 px-2 w-28">
                    {headerTip("risk", "状态")}
                  </th>
                  <th className="py-3 px-2 w-32">风险</th>
                  <th className="py-3 px-2 w-40">
                    {headerTip("confidence", "置信度")}
                  </th>
                  <th className="py-3 px-2 w-20 text-center">
                    {headerTip("variantCount", "变体")}
                  </th>
                  <th className="py-3 px-2 w-20 text-center">证据</th>
                  <th className="py-3 px-2 w-32">
                    {headerTip("updatedAt", "更新时间")}
                  </th>
                  <th className="py-3 px-2 w-24">操作</th>
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-20 text-center">
                      <div className="inline-flex flex-col items-center text-neutral-400">
                        <AlertTriangle className="w-10 h-10 mb-3" />
                        <div className="font-medium">当前筛选条件下无匹配的点位</div>
                        <div className="text-xs mt-1">请调整筛选条件或重置</div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  sorted.map((g, i) => (
                    <GroupTableRow key={g.groupId} group={g} index={i} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {sorted.map((g, i) => (
            <div key={g.groupId} className="animate-fade-up" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-neutral-400">{g.groupId}</span>
                  <StatusBadge status={g.status} />
                </div>
                <button
                  onClick={() => navigate(`/merge/${g.groupId}`)}
                  className="link-back"
                >
                  查看详情 →
                </button>
              </div>
              <VariantCompareCard group={g} compact />
            </div>
          ))}
        </div>
      )}

      <div className="h-32" />
      <ActionFooter />
    </PageContainer>
  );
}
