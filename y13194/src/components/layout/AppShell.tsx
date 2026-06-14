import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { useLocation } from "react-router-dom";
import { clsx } from "clsx";
import { useAppStore } from "../../store/appStore";

const TITLE_MAP: Record<string, { title: string; subtitle?: string; breadcrumb: string[] }> = {
  "/": {
    title: "数据工作台",
    subtitle: "总览 · 待处理 · 新手引导",
    breadcrumb: ["首页", "数据工作台"],
  },
  "/3d-panel": {
    title: "Web3D 数据联动面板",
    subtitle: "点选单体 · 切时间轴 · 筛选日志",
    breadcrumb: ["首页", "3D 联动面板"],
  },
  "/history": {
    title: "历史版本追溯",
    subtitle: "备注变更 · 截图归档 · 操作审计",
    breadcrumb: ["首页", "历史追溯"],
  },
  "/anomaly": {
    title: "异常隔离中心",
    subtitle: "方向符号反置 · 跳变原因 · 证据补充",
    breadcrumb: ["首页", "异常隔离中心"],
  },
  "/export": {
    title: "报告导出中心",
    subtitle: "预览 · 模板选择 · 样例 · 导出队列",
    breadcrumb: ["首页", "报告导出"],
  },
};

export function AppShell() {
  const location = useLocation();
  const collapsed = useAppStore((s) => s.ui.rightPanelCollapsed);

  const pathKey =
    Object.keys(TITLE_MAP).find((k) => (k === "/" ? location.pathname === "/" : location.pathname.startsWith(k))) ??
    "/";
  const info = TITLE_MAP[pathKey];

  return (
    <div className="relative flex h-full w-full overflow-hidden bg-deepspace-950">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-grid-deep bg-grid opacity-40"
      ></div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-grain mix-blend-overlay"
      ></div>
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/3 h-96 w-[680px] -translate-x-1/2 rounded-full bg-cyber-500/10 blur-[120px]"
      ></div>
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 right-10 h-80 w-[520px] rounded-full bg-alert-500/8 blur-[120px]"
      ></div>

      <Sidebar />

      <div className="relative flex min-w-0 flex-1 flex-col">
        <TopBar {...info} />
        <main className="relative flex min-h-0 flex-1 overflow-hidden">
          <div
            className={clsx(
              "flex min-w-0 flex-1 flex-col overflow-hidden transition-all duration-300",
            )}
          >
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              <Outlet />
            </div>
          </div>

          {!collapsed && <RightInfoPanel />}
        </main>
      </div>
    </div>
  );
}

function RightInfoPanel() {
  const selectedId = useAppStore((s) => s.battery.selectedId);
  const cells = useAppStore((s) => s.battery.cells);
  const allLogs = useAppStore((s) => s.log.logs);
  const filtered = allLogs.filter((l) => l.batteryId === selectedId);
  const anomalies = filtered.filter((l) => l.isAnomaly).length;
  const avgR = filtered.length
    ? filtered.reduce((a, b) => {
        const v = b.unit === "μΩ" ? b.resistance / 1000 : b.unit === "Ω" ? b.resistance * 1000 : b.resistance;
        return a + v;
      }, 0) / filtered.length
    : 0;
  const count = filtered.length;
  const cell = cells.find((c) => c.id === selectedId);

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-l border-deepspace-700/50 bg-deepspace-900/40">
      <div className="border-b border-deepspace-700/50 px-5 py-4">
        <div className="section-title mb-2">当前选中单体</div>
        {cell ? (
          <div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-lg font-semibold text-cyber-400">{cell.code}</span>
              <span
                className={clsx(
                  "chip",
                  cell.status === "normal" && "chip-cyber",
                  cell.status === "warning" && "chip-amber",
                  cell.status === "anomaly" && "chip-alert",
                  cell.status === "pending" && "chip",
                )}
              >
                {cell.status === "normal"
                  ? "正常"
                  : cell.status === "warning"
                    ? "注意"
                    : cell.status === "anomaly"
                      ? "异常"
                      : "待审"}
              </span>
            </div>
            <div className="mt-1 text-xs text-slate-500">型号：{cell.model}</div>
          </div>
        ) : (
          <div className="text-sm text-slate-500">未选中单体，请在 3D 面板中点选</div>
        )}
      </div>

      {cell && (
        <div className="border-b border-deepspace-700/50 px-5 py-4">
          <div className="section-title mb-3">快速指标</div>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="采样总数" value={count.toString()} tone="cyber" />
            <StatCard label="异常记录" value={anomalies.toString()} tone="alert" />
            <StatCard
              label="平均内阻"
              value={avgR ? `${avgR.toFixed(2)} mΩ` : "—"}
              tone="cyber"
            />
            <StatCard label="标称值" value={`${cell.nominalResistance.toFixed(2)} mΩ`} tone="muted" />
          </div>
        </div>
      )}

      <div className="border-b border-deepspace-700/50 px-5 py-4">
        <div className="section-title mb-3">待办速览</div>
        <ul className="space-y-2 text-xs">
          <TodoItem tone="alert" text="3 条方向符号记录待复核" count="3" />
          <TodoItem tone="amber" text="5 条异常需补证据" count="5" />
          <TodoItem tone="cyber" text="2 份报告正在排队导出" count="2" />
        </ul>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="section-title mb-3">快捷操作</div>
        <div className="grid grid-cols-2 gap-2">
          <QuickBtn label="查看历史" />
          <QuickBtn label="导出该单体" />
          <QuickBtn label="批量标记已审" />
          <QuickBtn label="跳转到异常" primary />
        </div>
        <div className="divider-line my-5"></div>
        <div className="rounded-lg border border-deepspace-700/50 bg-deepspace-800/40 p-3">
          <div className="section-title mb-2">接班小贴士 · 小宋专用</div>
          <ul className="space-y-2 text-[11px] leading-relaxed text-slate-400">
            <li>· ① 样例报告在「导出中心 · 样例专区」</li>
            <li>· ② 异常记录集中在「异常隔离中心」</li>
            <li>· ③ 结果导出：选电池 → 选模板 → 点「生成报告」</li>
          </ul>
        </div>
      </div>
    </aside>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "cyber" | "alert" | "amber" | "muted";
}) {
  const colorMap = {
    cyber: "text-cyber-400 border-cyber-500/20",
    alert: "text-alert-400 border-alert-500/20",
    amber: "text-amberx-400 border-amberx-500/20",
    muted: "text-slate-300 border-deepspace-600/50",
  };
  return (
    <div className={`rounded-lg border ${colorMap[tone]} bg-deepspace-800/40 px-3 py-2.5`}>
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`mt-1 font-mono text-base font-semibold tabular-nums ${colorMap[tone].split(" ")[0]}`}>
        {value}
      </div>
    </div>
  );
}

function TodoItem({ tone, text, count }: { tone: string; text: string; count: string }) {
  const dot = {
    alert: "bg-alert-500",
    amber: "bg-amberx-500",
    cyber: "bg-cyber-500",
  }[tone as keyof { [k: string]: string }];
  return (
    <li className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-deepspace-800/50">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`}></span>
      <span className="flex-1 text-slate-300">{text}</span>
      <span className="font-mono text-[11px] text-slate-400">{count}</span>
    </li>
  );
}

function QuickBtn({ label, primary }: { label: string; primary?: boolean }) {
  return (
    <button
      className={clsx(
        "rounded-md border px-2.5 py-2 text-[11px] font-medium transition-all",
        primary
          ? "border-cyber-500/40 bg-cyber-500/10 text-cyber-300 hover:bg-cyber-500/20"
          : "border-deepspace-600/50 bg-deepspace-800/40 text-slate-300 hover:border-cyber-500/30 hover:text-cyber-300",
      )}
    >
      {label}
    </button>
  );
}
