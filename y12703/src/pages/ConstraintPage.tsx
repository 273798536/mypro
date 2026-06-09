import PageContainer from "@/components/layout/PageContainer";
import StatCard from "@/components/constraint/StatCard";
import FilterBar from "@/components/constraint/FilterBar";
import ProblemTable from "@/components/constraint/ProblemTable";
import DetailPanel from "@/components/constraint/DetailPanel";
import { useStore } from "@/store/useStore";
import { AlertTriangle } from "lucide-react";

export default function ConstraintPage() {
  const { getStats, setFilters, selectedProblemId } = useStore();
  const stats = getStats();

  return (
    <PageContainer>
      <div className="mb-6">
        <h1 className="font-serif font-bold text-2xl text-ink-800">约束校验</h1>
        <p className="text-sm text-ink-500 mt-1">
          日常入口 · 快速筛查外推越界、历史答案不一致等异常，支持图、表、文字说明三者对照核验
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-5">
        <StatCard
          label="题库总数"
          value={stats.total}
          sub="全部已录入题目"
          tone="primary"
          delay={0}
        />
        <StatCard
          label="数据可用"
          value={stats.available}
          sub="已通过校验"
          tone="confirm"
          delay={80}
          onClick={() => setFilters({ status: "approved" })}
        />
        <StatCard
          label="暂缓复核"
          value={stats.pending}
          sub="含待确认+暂缓"
          tone="warn"
          delay={160}
          onClick={() => setFilters({ status: "pending" })}
        />
        <StatCard
          label="需重新采集"
          value={stats.recollect}
          sub="数据严重异常"
          tone="alert"
          delay={240}
          onClick={() => setFilters({ status: "recollect" })}
        />
        <StatCard
          label="外推越界"
          value={stats.outliers}
          sub="偏离 3σ 区间"
          tone="alert"
          delay={320}
          onClick={() => setFilters({ onlyOutliers: true })}
        >
          <AlertTriangle size={14} className="ml-1 inline" />
        </StatCard>
      </div>

      <div className="mb-4">
        <FilterBar />
      </div>

      <div className="space-y-4">
        <ProblemTable />
        {selectedProblemId && <DetailPanel />}
      </div>
    </PageContainer>
  );
}
