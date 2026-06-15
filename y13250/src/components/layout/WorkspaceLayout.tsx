import { TopToolbar } from './TopToolbar';
import { SummaryCards } from '../summary/SummaryCards';
import { MaterialsPanel } from '../materials/MaterialsPanel';
import { MergeGraph } from '../graph/MergeGraph';
import { AnomalyPanel } from '../anomalies/AnomalyPanel';
import { EvidencePanel } from '../evidence/EvidencePanel';
import { OperationLogs } from '../logs/OperationLogs';
import { VersionCompare } from '../materials/VersionCompare';

export function WorkspaceLayout() {
  return (
    <div className="min-h-screen w-full bg-bg text-text">
      <div className="absolute inset-0 bg-grid-soft bg-[size:32px_32px] opacity-40 pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-transparent to-bg/80" />

      <div className="relative max-w-[1720px] mx-auto p-4 min-h-screen flex flex-col gap-3">
        <div className="rounded-xl border border-border overflow-hidden bg-bg-card/40 backdrop-blur-sm shadow-2xl">
          <TopToolbar />
          <div className="p-4 space-y-4">
            <SummaryCards />

            <div className="grid grid-cols-12 gap-3 min-h-[calc(100vh-440px)]">
              <div className="col-span-3 h-[720px]">
                <MaterialsPanel />
              </div>

              <div className="col-span-6 flex flex-col gap-3 min-w-0">
                <div className="h-[420px]">
                  <MergeGraph />
                </div>
                <OperationLogs />
              </div>

              <div className="col-span-3 flex flex-col gap-3 min-w-0">
                <div className="h-[340px]">
                  <AnomalyPanel />
                </div>
                <div className="flex-1 min-h-[380px]">
                  <EvidencePanel />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between px-2 py-1 text-[10px] text-text-dim/80">
              <div className="flex items-center gap-4">
                <span>接手即懂：<span className="text-text-muted">材料区（左）· 图表区（中）· 异常区（右上）· 证据/备注区（右下）· 顶部重跑·导出 · 底部日志</span></span>
              </div>
              <div className="flex items-center gap-3">
                <span>所有状态/备注/版本均持久化到 localStorage，刷新重启后完全一致</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <VersionCompare />
    </div>
  );
}
