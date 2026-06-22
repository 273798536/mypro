import BatchHeader from "@/components/BatchHeader";
import FilterBar from "@/components/FilterBar";
import StatsCards from "@/components/StatsCards";
import AlertsPanel from "@/components/AlertsPanel";
import RecordsTable from "@/components/RecordsTable";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        <BatchHeader />
        <FilterBar />
        <StatsCards />
        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <RecordsTable />
          </div>
          <div className="space-y-5">
            <AlertsPanel />
            <FlowHint />
          </div>
        </div>
      </div>
    </div>
  );
}

function FlowHint() {
  const items = [
    { n: "1", t: "先看顶部交接说明", d: "小孟补的现场情况、晚到附件、单位换算提醒，决定后续核对方向。" },
    { n: "2", t: "用筛选条件切视角", d: "按状态/变化来源/材料批次切，统计、明细、导出同步。" },
    { n: "3", t: "先看告警不先看单条", d: "连续同批次偏差要先对上流，不然每条孤立重跑没意义。" },
    { n: "4", t: "展开明细核对三项", d: "状态 ↔ 人工备注 ↔ 截图三者必须互相对得上。" },
    { n: "5", t: "登记重跑写入历史", d: "每次重跑保留差异摘要和截图，抽查时直接追这条链。" },
    { n: "6", t: "最后一键导出 CSV", d: "带编号一致/参数一致/晚到附件/重跑次数等完整字段。" },
  ];
  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
      <div className="text-sm font-semibold text-slate-800 mb-3">复核工作流提示</div>
      <ol className="space-y-2.5">
        {items.map((it) => (
          <li key={it.n} className="flex items-start gap-2.5 text-xs">
            <div className="h-5 w-5 rounded-full bg-slate-900 text-white flex items-center justify-center flex-shrink-0 text-[11px] font-medium">
              {it.n}
            </div>
            <div>
              <div className="text-slate-800 font-medium">{it.t}</div>
              <div className="text-slate-500 mt-0.5 leading-relaxed">{it.d}</div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
