import { useAppStore } from "@/store/useAppStore";
import { PageHeader } from "@/components/ui/PageHeader";
import { Gauge } from "@/components/ui/Gauge";
import { cn } from "@/lib/utils";
import { SampleList } from "@/pages/workbench/SampleList";
import { SampleDetail } from "@/pages/workbench/SampleDetail";
import { GroupMetricsPanel } from "@/pages/workbench/GroupMetricsPanel";
import { LeakPanel } from "@/pages/workbench/LeakPanel";

export default function Workbench() {
  const samples = useAppStore((s) => s.samples);
  const leaks = useAppStore((s) => s.leaks);
  const tab = useAppStore((s) => s.workbenchTab);
  const setTab = useAppStore((s) => s.setWorkbenchTab);
  const selectedId = useAppStore((s) => s.selectedSampleId);

  const overall =
    samples.reduce((acc, s) => acc + Math.max(0, 1 - Math.abs(s.offlineMetric - s.onlineMetric)), 0) /
    Math.max(1, samples.length);
  const leakUnfinished = leaks.filter((l) => !(l.rerun.tried && l.supplementary.tried && l.manualConfirm.tried)).length;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        eyebrow="offline · online metric alignment"
        title="对齐工作台"
        desc="把提示词版本、标注记录、处理意见、人工修正与分组指标收敛在一处——样本、版本、修正、指标串成一条可追溯链路。"
        right={
          <div className="flex items-center gap-4">
            <div className="hidden text-right lg:block">
              <div className="field-label">当前样本</div>
              <div className="font-mono text-sm text-signal-300">{selectedId}</div>
            </div>
            <Gauge value={overall} label="对齐度" />
          </div>
        }
      />

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)_360px]">
        <div className="hidden min-h-0 border-r border-ink-800 lg:block">
          <SampleList />
        </div>

        <div className="min-h-0 overflow-hidden">
          <SampleDetail />
        </div>

        <div className="hidden min-h-0 flex-col border-l border-ink-800 xl:flex">
          <div className="flex border-b border-ink-800">
            <TabBtn active={tab === "metrics"} onClick={() => setTab("metrics")}>
              分组指标
            </TabBtn>
            <TabBtn
              active={tab === "leak"}
              onClick={() => setTab("leak")}
              badge={leakUnfinished > 0 ? leakUnfinished : undefined}
            >
              训练验证泄漏
            </TabBtn>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {tab === "metrics" ? <GroupMetricsPanel /> : <LeakPanel />}
          </div>
        </div>
      </div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex flex-1 items-center justify-center gap-1.5 px-3 py-2.5 text-xs transition-colors",
        active ? "text-signal-200" : "text-ink-500 hover:text-ink-300",
      )}
    >
      {children}
      {badge !== undefined && (
        <span className="num rounded-full bg-danger-400/20 px-1.5 py-0.5 font-mono text-[9px] text-danger-300">
          {badge}
        </span>
      )}
      {active && <span className="absolute inset-x-3 -bottom-px h-px bg-signal-400" />}
    </button>
  );
}
