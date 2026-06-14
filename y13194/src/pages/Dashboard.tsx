import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  FileWarning,
  Gauge,
  HandCoins,
  History,
  Layers3,
  Map,
  Sparkles,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  Zap,
  ZoomIn,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppStore, useStats } from "@/store/appStore";
import { MiniTrend, makeTrend } from "@/components/charts/MiniTrend";
import { clsx } from "clsx";
import type { SensorLogEntry } from "@/types";

interface MetricCardProps {
  title: string;
  value: number | string;
  delta: number;
  tone: "cyber" | "alert" | "amber" | "aurora";
  icon: React.ComponentType<{ className?: string }>;
  trend: { t: string; v: number }[];
  pulse?: boolean;
  footerText?: string;
  onClick?: () => void;
}

const TONE_MAP = {
  cyber: { text: "text-cyber-400", border: "border-cyber-500/30", bg: "from-cyber-500/15", chip: "chip-cyber", hex: "#00D4AA" },
  alert: { text: "text-alert-400", border: "border-alert-500/30", bg: "from-alert-500/15", chip: "chip-alert", hex: "#FF4757" },
  amber: { text: "text-amberx-400", border: "border-amberx-500/30", bg: "from-amberx-500/15", chip: "chip-amber", hex: "#FFA502" },
  aurora: { text: "text-aurora-400", border: "border-aurora-500/30", bg: "from-aurora-500/15", chip: "chip-aurora", hex: "#7B2CBF" },
};

function MetricCard({ title, value, delta, tone, icon: Icon, trend, pulse, footerText, onClick }: MetricCardProps) {
  const c = TONE_MAP[tone];
  const up = delta >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      onClick={onClick}
      className={clsx("panel panel-hover relative overflow-hidden p-5", pulse && "animate-pulseglow", onClick && "cursor-pointer")}
    >
      <div aria-hidden className={clsx("pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br to-transparent blur-2xl", c.bg)}></div>
      <div className="relative">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className={clsx("flex h-9 w-9 items-center justify-center rounded-lg border bg-gradient-to-br to-transparent", c.border, c.bg)}>
              <Icon className={clsx("h-4 w-4", c.text)} />
            </div>
            <span className="text-xs font-medium text-slate-400">{title}</span>
          </div>
          <span className={clsx("flex items-center gap-1 text-[11px]", c.chip)}>
            {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {up ? "+" : ""}{delta.toFixed(1)}%
          </span>
        </div>
        <div className="mt-4 flex items-baseline gap-2">
          <span className={clsx("font-mono text-3xl font-bold tabular-nums", c.text)}>{value}</span>
        </div>
        <div className="mt-3">
          <MiniTrend data={trend} color={c.hex} />
        </div>
        {footerText && (
          <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
            <ArrowUpRight className="h-3 w-3" />{footerText}
          </div>
        )}
      </div>
    </motion.div>
  );
}

interface GuideCardProps {
  num: string;
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  hint: string;
  onClick: () => void;
  gradient: string;
}

function GuideCard({ num, title, desc, icon: Icon, hint, onClick, gradient }: GuideCardProps) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      onClick={onClick}
      whileHover={{ y: -2 }}
      className="group relative overflow-hidden rounded-xl border border-deepspace-600/50 bg-deepspace-800/50 p-5 text-left transition-all duration-300 hover:border-cyber-500/40 hover:shadow-glow-cyber"
    >
      <div aria-hidden className={clsx("pointer-events-none absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-500 group-hover:opacity-100", gradient)}></div>
      <div className="relative flex h-full flex-col">
        <div className="mb-4 flex items-start justify-between">
          <span className="font-mono text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-white/90 via-white/40 to-transparent">{num}</span>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-deepspace-600/60 bg-deepspace-900/60">
            <Icon className="h-5 w-5 text-cyber-400" />
          </div>
        </div>
        <h3 className="mb-1 text-base font-semibold text-slate-100">{title}</h3>
        <p className="mb-4 flex-1 text-xs leading-relaxed text-slate-400">{desc}</p>
        <div className="mt-auto flex items-center justify-between border-t border-deepspace-700/50 pt-3">
          <span className="text-[11px] text-slate-500">{hint}</span>
          <ArrowUpRight className="h-4 w-4 text-cyber-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>
      </div>
    </motion.button>
  );
}

function TodoItem({ log, onClick }: { log: SensorLogEntry & { latestRemark?: string }; onClick: () => void }) {
  return (
    <motion.button
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onClick}
      className="group flex w-full items-start gap-3 rounded-lg border border-transparent px-3 py-2.5 text-left transition-all hover:border-cyber-500/20 hover:bg-deepspace-800/60"
    >
      <div className={clsx("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md", log.isAnomaly ? "bg-alert-500/15 text-alert-400" : log.evidenceStatus === "pending" ? "bg-amberx-500/15 text-amberx-400" : "bg-cyber-500/15 text-cyber-400")}>
        {log.isAnomaly ? <TriangleAlert className="h-3.5 w-3.5" /> : log.evidenceStatus === "pending" ? <Clock3 className="h-3.5 w-3.5" /> : <BadgeCheck className="h-3.5 w-3.5" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold text-cyber-400">{log.batteryCode}</span>
          <span className="text-[10px] text-slate-500">
            {new Date(log.timestamp).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
          </span>
          {log.isAnomaly && (
            <span className="chip-alert !py-0 !text-[10px]">
              {log.anomalyType === "direction-reversed" ? "方向反置" : log.anomalyType?.includes("jump") ? "数值跳变" : "异常"}
            </span>
          )}
          {!log.isAudited && <span className="chip-amber !py-0 !text-[10px]">未审</span>}
        </div>
        <div className="mt-0.5 text-xs text-slate-400">
          内阻 <span className="data-value text-slate-200">{log.resistance} {log.unit}</span>
          {log.latestRemark && <span className="ml-2 truncate text-slate-500">· {log.latestRemark}</span>}
        </div>
      </div>
      <ArrowUpRight className="mt-1 h-3.5 w-3.5 shrink-0 text-slate-600 transition-colors group-hover:text-cyber-400" />
    </motion.button>
  );
}

const ACTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "remark.add": FileText,
  "remark.edit": Layers3,
  "screenshot.upload": ZoomIn,
  "anomaly.mark": AlertTriangle,
  "audit.approve": CheckCircle2,
  "evidence.update": HandCoins,
  "report.export": Download,
};

const ACTION_TONES: Record<string, string> = {
  "anomaly.mark": "text-alert-400 border-alert-500/30 bg-alert-500/10",
  "audit.approve": "text-cyber-400 border-cyber-500/30 bg-cyber-500/10",
  "report.export": "text-aurora-400 border-aurora-500/30 bg-aurora-500/10",
  "evidence.update": "text-amberx-400 border-amberx-500/30 bg-amberx-500/10",
};

function ActivityItem({ timestamp, operator, action, detail, isLast }: { timestamp: number; operator: string; action: string; detail: string; isLast: boolean }) {
  const Icon = ACTION_ICONS[action] ?? Clock3;
  const tone = ACTION_TONES[action] ?? "text-slate-300 border-deepspace-600/50 bg-deepspace-800/80";

  return (
    <li className="relative pl-6">
      {!isLast && <span aria-hidden className="absolute left-[7px] top-5 h-full w-px bg-gradient-to-b from-deepspace-600/80 to-transparent"></span>}
      <span aria-hidden className="absolute left-0 top-1 flex h-4 w-4 items-center justify-center">
        <span className={clsx("flex h-4 w-4 items-center justify-center rounded-full border", tone)}>
          <Icon className="h-2.5 w-2.5" />
        </span>
      </span>
      <div className="pb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-200">{operator}</span>
          <span className="text-[10px] text-slate-500">·</span>
          <span className="text-[10px] text-slate-500">{relativeTime(timestamp)}</span>
        </div>
        <div className="mt-0.5 text-xs text-slate-400">{detail}</div>
      </div>
    </li>
  );
}

function relativeTime(ts: number) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "刚刚";
  if (m < 60) return `${m} 分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小时前`;
  return `${Math.floor(h / 24)} 天前`;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const stats = useStats();
  const logs = useAppStore((s) => s.log.logs);
  const remarks = useAppStore((s) => s.history.remarks);
  const activities = useAppStore((s) => s.history.auditLogs);

  const pendingList = logs
    .filter((l) => !l.isAudited || l.isAnomaly || l.evidenceStatus === "pending")
    .slice(0, 8)
    .map((l) => ({
      ...l,
      latestRemark: remarks.filter((r) => r.logId === l.id && r.isLatest).map((r) => r.content)[0],
    }));

  const todoAudit = pendingList.filter((x) => !x.isAudited).slice(0, 4);
  const todoEvidence = pendingList.filter((x) => x.evidenceStatus === "pending").slice(0, 4);
  const auditedPct = stats.total > 0 ? Math.round((stats.audited / stats.total) * 100) : 0;

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="方向符号异常"
          value={stats.directionAnomalies}
          delta={12.5}
          tone="alert"
          icon={TriangleAlert}
          trend={makeTrend(stats.directionAnomalies, 1.2, 12, 17)}
          pulse
          footerText="均已单独隔离，不参与统计"
          onClick={() => navigate("/anomaly")}
        />
        <MetricCard
          title="数值跳变记录"
          value={stats.jumps}
          delta={-8.3}
          tone="amber"
          icon={Zap}
          trend={makeTrend(stats.jumps, 0.9, 12, 22)}
          footerText="阈值/单位/晚到附件自动标注"
          onClick={() => navigate("/anomaly")}
        />
        <MetricCard
          title="待补证据"
          value={stats.pendingEvidence}
          delta={4.1}
          tone="aurora"
          icon={FileWarning}
          trend={makeTrend(stats.pendingEvidence, 0.6, 12, 7)}
          footerText="拖拽式三栏状态流转"
          onClick={() => navigate("/anomaly")}
        />
        <MetricCard
          title="已审核通过"
          value={`${auditedPct}%`}
          delta={3.6}
          tone="cyber"
          icon={Gauge}
          trend={makeTrend(stats.audited, 22, 12, 3)}
          footerText={`${stats.audited} / ${stats.total} 条记录`}
        />
      </div>

      <div>
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h2 className="section-title">新手上路 · 接班只需 3 步</h2>
            <p className="mt-1 text-sm text-slate-400">小宋接班时先看这三张卡，30 秒上手</p>
          </div>
          <span className="chip-cyber"><Sparkles className="h-3 w-3" />接班引导</span>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <GuideCard num="01" title="样例在哪？" desc="报告导出中心预置 3 份标准样例（正常/异常/跳变），格式可直接参考。" icon={FileText} hint="查看：导出中心 · 样例专区" gradient="from-cyber-500/15" onClick={() => navigate("/export")} />
          <GuideCard num="02" title="异常在哪？" desc="方向符号写反的记录单独拎出，跳变自动标注阈值/单位/晚到附件原因。" icon={AlertTriangle} hint="直达：异常隔离中心" gradient="from-alert-500/15" onClick={() => navigate("/anomaly")} />
          <GuideCard num="03" title="结果怎么导出？" desc="选电池 → 选模板（标准/精简/含历史版）→ 一键生成，批量下载。" icon={Download} hint="快捷键：Ctrl + E" gradient="from-aurora-500/15" onClick={() => navigate("/export")} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="panel p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="section-title">待处理清单</h2>
              <p className="mt-1 text-sm text-slate-400">按紧急程度排列，点击直接跳转定位</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="btn-ghost !py-1.5 text-xs" onClick={() => navigate("/3d-panel")}>
                <Map className="h-3.5 w-3.5" />打开 3D 面板
              </button>
              <button className="btn-ghost !py-1.5 text-xs">
                <History className="h-3.5 w-3.5" />查看全部
              </button>
            </div>
          </div>
          <div className="divider-line mb-3"></div>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="chip-amber"><Clock3 className="h-3 w-3" />待审核 ({todoAudit.length})</span>
              </div>
              <div className="space-y-1">
                {todoAudit.length ? todoAudit.map((l) => (
                  <TodoItem key={l.id} log={l} onClick={() => navigate(`/history/${l.batteryId}`)} />
                )) : (
                  <div className="rounded-lg border border-dashed border-deepspace-600/50 p-4 text-center text-xs text-slate-500">暂无待审核</div>
                )}
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="chip-aurora"><FileWarning className="h-3 w-3" />待补证据 ({todoEvidence.length})</span>
              </div>
              <div className="space-y-1">
                {todoEvidence.length ? todoEvidence.map((l) => (
                  <TodoItem key={l.id} log={l} onClick={() => navigate("/anomaly")} />
                )) : (
                  <div className="rounded-lg border border-dashed border-deepspace-600/50 p-4 text-center text-xs text-slate-500">证据齐全</div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="panel p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="section-title">最近 24 小时活动</h2>
              <p className="mt-1 text-sm text-slate-400">操作审计时间线</p>
            </div>
            <button className="btn-ghost !px-2 !py-1 text-[11px]">
              <History className="h-3 w-3" />全部
            </button>
          </div>
          <div className="divider-line mb-3"></div>
          <ul className="relative space-y-0">
            {activities.map((a, idx) => (
              <ActivityItem
                key={a.id}
                timestamp={a.timestamp}
                operator={a.operator}
                action={a.action}
                detail={a.detail}
                isLast={idx === activities.length - 1}
              />
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
