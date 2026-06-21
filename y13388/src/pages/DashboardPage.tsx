import AppHeader from "@/components/AppHeader";
import StatCard from "@/components/StatCard";
import SampleListPanel from "@/components/SampleListPanel";
import DecisionPanel from "@/components/DecisionPanel";
import ExportDropdown from "@/components/ExportDropdown";
import { useDashboardStore } from "@/store/dashboardStore";
import { ClipboardCheck, ShieldAlert, ShieldCheck, UserCog2, DownloadCloud } from "lucide-react";

export default function DashboardPage() {
  const getStats = useDashboardStore((s) => s.getStats);
  const stats = getStats();

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-[1600px] px-6 py-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-signal-cyan/80">Drift · Shift · Decision</div>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-100">
              漂移监控成本看板
              <span className="ml-3 align-middle text-sm font-normal text-ink-500">
                把样本、版本、人工修正和历史时间线串起来
              </span>
            </h1>
          </div>
          <ExportDropdown context="dashboard" />
        </div>

        <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="待审核样本"
            value={stats.pending}
            subtitle="需要小林拍板"
            icon={UserCog2}
            accent="cyan"
            delta={{ value: "2 较昨日", positive: false }}
          />
          <StatCard
            title="验证集污染"
            value={stats.pollution}
            subtitle="别混进正常材料里"
            icon={ShieldAlert}
            accent="red"
            delta={{ value: "+1 今日", positive: false }}
          />
          <StatCard
            title="人工改判"
            value={stats.manualOverride}
            subtitle="算法判断别抢戏"
            icon={ClipboardCheck}
            accent="violet"
            delta={{ value: "稳定", positive: true }}
          />
          <StatCard
            title="本月放行率"
            value={`${(stats.passRate * 100).toFixed(1)}%`}
            subtitle="已决策样本口径"
            icon={ShieldCheck}
            accent="green"
            delta={{ value: "达标", positive: true }}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div>
            <SampleListPanel />
          </div>
          <div className="h-[calc(100vh-11rem)] min-h-[520px] lg:sticky lg:top-20">
            <DecisionPanel />
          </div>
        </div>
      </main>
    </div>
  );
}
