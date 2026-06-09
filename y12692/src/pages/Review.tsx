import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  FileJson,
  FileText,
  History,
  Layers,
  XCircle,
} from "lucide-react";
import { useLatticeStore } from "@/store/useLatticeStore";
import type {
  AuditLog,
  BatchRecord,
  CollisionItem,
  CrossSection,
  ModelOverlap,
  PointCloudSlice,
} from "@/types";
import { buildFileName, exportJson, exportPdf } from "@/utils/export";
import { cn } from "@/lib/utils";

function statusChip(status: BatchRecord["reviewStatus"]) {
  if (status === "approved")
    return <span className="chip border-pass/60 bg-pass/10 text-pass">复核通过</span>;
  if (status === "rejected")
    return <span className="chip border-alert/60 bg-alert/10 text-alert">已驳回</span>;
  return <span className="chip border-ink-300/60 bg-ink-500/30 text-ink-100">待复核</span>;
}

function actionLabel(a: AuditLog["action"]) {
  switch (a) {
    case "parameter_change":
      return "参数调整";
    case "collision_approved":
      return "碰撞复核通过";
    case "collision_rejected":
      return "碰撞复核驳回";
    case "review_submit":
      return "提交复核结论";
    case "note_update":
      return "更新处理意见";
    case "batch_created":
      return "批次创建";
  }
}

function PointCloudPreview({ slice }: { slice: PointCloudSlice }) {
  const size = 220;
  return (
    <div className="panel p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-display text-ink-50">点云切片 · {slice.axis}={slice.position}Å</div>
        <span className="chip border-ink-400/50 text-ink-200">{slice.points.length} 点</span>
      </div>
      <svg viewBox={`0 0 ${size} ${size}`} className="h-[180px] w-full rounded-sm bg-ink-900/60">
        <defs>
          <radialGradient id="pc" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#3DDC97" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#3DDC97" stopOpacity="0.15" />
          </radialGradient>
        </defs>
        {slice.points.length === 0 ? (
          <text x="50%" y="50%" textAnchor="middle" fill="#637FB0" fontSize="11" fontFamily="monospace">
            暂无点云，运行碰撞检测后生成
          </text>
        ) : (
          slice.points.map((p, i) => {
            const maxX = Math.max(...slice.points.map((q) => q.x), 1);
            const maxY = Math.max(...slice.points.map((q) => q.y), 1);
            const cx = ((p.x / maxX) * 0.85 + 0.075) * size;
            const cy = ((p.y / maxY) * 0.85 + 0.075) * size;
            const r = 2.2 + ((p.z - slice.position) * 4);
            return <circle key={i} cx={cx} cy={cy} r={Math.max(1.2, r)} fill="url(#pc)" />;
          })
        )}
      </svg>
      <p className="mt-2 border-l-2 border-lattice/40 pl-2 text-[11px] leading-relaxed text-ink-100/85">
        {slice.description}
      </p>
    </div>
  );
}

function CrossSectionPreview({ cs }: { cs: CrossSection }) {
  const size = 220;
  return (
    <div className="panel p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-display text-ink-50">剖面图 · {cs.axis}={cs.position}Å</div>
        <span className="chip border-ink-400/50 text-ink-200">{cs.atoms.length} 原子</span>
      </div>
      <svg viewBox={`0 0 ${size} ${size}`} className="h-[180px] w-full rounded-sm bg-ink-900/60">
        {cs.atoms.length === 0 ? (
          <text x="50%" y="50%" textAnchor="middle" fill="#637FB0" fontSize="11" fontFamily="monospace">
            暂无剖面，运行碰撞检测后生成
          </text>
        ) : (
          cs.atoms.map((a, i) => {
            const maxX = Math.max(...cs.atoms.map((q) => q.position.x), 1);
            const maxZ = Math.max(...cs.atoms.map((q) => q.position.z), 1);
            const cx = ((a.position.x / maxX) * 0.8 + 0.1) * size;
            const cy = ((a.position.z / maxZ) * 0.8 + 0.1) * size;
            const r = Math.min(18, Math.max(5, a.radius * 8));
            const color = a.element === "Na" ? "#3DDC97" : "#FF8C42";
            return (
              <g key={i}>
                <circle cx={cx} cy={cy} r={r} fill={color} opacity={0.35} />
                <circle cx={cx} cy={cy} r={r * 0.55} fill={color} opacity={0.85} />
                <text
                  x={cx}
                  y={cy + 3}
                  textAnchor="middle"
                  fontSize={Math.max(8, r * 0.55)}
                  fill="#030914"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {a.element}
                </text>
              </g>
            );
          })
        )}
      </svg>
      <p className="mt-2 border-l-2 border-lattice/40 pl-2 text-[11px] leading-relaxed text-ink-100/85">
        {cs.description}
      </p>
    </div>
  );
}

function OverlapPreview({ mo, collisions }: { mo: ModelOverlap; collisions: CollisionItem[] }) {
  return (
    <div className="panel p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-display text-ink-50">模型重叠</div>
        <span className="chip border-warn/60 text-warn">总 {mo.totalOverlapVolume.toFixed(2)}Å³</span>
      </div>
      <div className="h-[180px] overflow-y-auto rounded-sm bg-ink-900/60 p-3">
        {mo.overlapRegions.length === 0 ? (
          <p className="pt-8 text-center text-[11px] font-mono text-ink-200/60">
            运行碰撞检测后在此处展示重叠区域
          </p>
        ) : (
          <ul className="space-y-2">
            {mo.overlapRegions.map((r, i) => {
              const match = collisions.find(
                (c) =>
                  Math.abs(c.position.x - r.position.x) < 0.01 &&
                  Math.abs(c.position.y - r.position.y) < 0.01 &&
                  Math.abs(c.position.z - r.position.z) < 0.01,
              );
              return (
                <li
                  key={i}
                  className="flex items-start justify-between gap-2 rounded-sm border border-ink-500/40 bg-ink-800/60 p-2"
                >
                  <div>
                    <div className="font-mono text-xs text-ink-50">
                      ({r.position.x}, {r.position.y}, {r.position.z})
                    </div>
                    <div className="mt-0.5 text-[10px] font-mono text-ink-200/70">
                      {r.atoms.join(" / ")} · {r.volume.toFixed(2)}Å³
                    </div>
                  </div>
                  {match ? (
                    <span
                      className={
                        "chip " +
                        (match.approved
                          ? "border-pass/60 text-pass"
                          : "border-warn/60 text-warn")
                      }
                    >
                      {match.collisionId}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <p className="mt-2 border-l-2 border-lattice/40 pl-2 text-[11px] leading-relaxed text-ink-100/85">
        {mo.description}
      </p>
    </div>
  );
}

function AuditTrail({ logs }: { logs: AuditLog[] }) {
  return (
    <div className="panel p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-display text-ink-50">
        <History size={14} className="text-lattice" />
        审计日志 · 谁在何时为何修改
      </div>
      <ol className="relative ml-2 space-y-3 border-l border-ink-500/40 pl-4">
        {[...logs].reverse().map((l) => (
          <li key={l.logId} className="relative">
            <span
              className={cn(
                "absolute -left-[22px] top-1 h-3 w-3 rounded-full border-2",
                l.action === "collision_approved"
                  ? "border-pass bg-pass/30"
                  : l.action === "review_submit"
                    ? "border-lattice bg-lattice/30"
                    : "border-ink-300 bg-ink-600",
              )}
            />
            <div className="flex items-center gap-2 text-[11px] font-mono">
              <span className="chip border-ink-400/40 text-ink-100">{actionLabel(l.action)}</span>
              <span className="text-ink-200/80">{l.operator}</span>
              <span className="text-ink-200/50">
                {new Date(l.timestamp).toLocaleString("zh-CN")}
              </span>
            </div>
            {l.field && (
              <div className="mt-1 text-[11px] font-mono text-ink-100/90">
                字段 <span className="text-lattice">{l.field}</span>
                {l.oldValue !== undefined && (
                  <>
                    {" "}
                    · 旧值 <span className="text-warn">{String(l.oldValue)}</span> → 新值{" "}
                    <span className="text-pass">{String(l.newValue)}</span>
                  </>
                )}
              </div>
            )}
            {l.reason && (
              <div className="mt-1 text-[11px] text-ink-100/70">原因：{l.reason}</div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

function TracePanel({ batch }: { batch: BatchRecord }) {
  const [selectedId, setSelectedId] = useState<string | null>(
    batch.collisions[0]?.collisionId ?? null,
  );
  const collision = batch.collisions.find((c) => c.collisionId === selectedId);
  const relatedLogs = useMemo(() => {
    if (!collision) return batch.auditLogs.slice(-3);
    return batch.auditLogs.filter(
      (l) =>
        l.field === collision.collisionId ||
        l.action === "batch_created" ||
        (l.action === "parameter_change" && typeof l.field === "string"),
    );
  }, [collision, batch.auditLogs]);

  return (
    <div className="panel p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-display text-ink-50">
        <Layers size={14} className="text-lattice" />
        异常追踪链路 · 沿异常回查设备坐标与处理意见
      </div>
      {batch.collisions.length === 0 ? (
        <p className="text-[11px] font-mono text-ink-200/70">
          暂无异常可供追踪，先运行碰撞检测。
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-1 pb-2">
            {batch.collisions.map((c) => (
              <button
                key={c.collisionId}
                type="button"
                onClick={() => setSelectedId(c.collisionId)}
                className={
                  "chip " +
                  (selectedId === c.collisionId
                    ? "border-lattice bg-lattice/15 text-lattice"
                    : "border-ink-400/50 text-ink-200 hover:bg-ink-500/30")
                }
              >
                {c.collisionId}
                {c.approved ? " ✓" : ""}
              </button>
            ))}
          </div>
          {collision && (
            <div className="animate-fade-in">
              <div className="rounded-sm border border-ink-500/40 bg-ink-800/60 p-3">
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div>
                    <span className="label">异常 ID</span>
                    <div className="text-ink-50">{collision.collisionId}</div>
                  </div>
                  <div>
                    <span className="label">原子对</span>
                    <div className="text-ink-50">
                      {collision.atomPair[0]} – {collision.atomPair[1]}
                    </div>
                  </div>
                  <div>
                    <span className="label">设备坐标</span>
                    <div className="text-ink-50">
                      ({collision.position.x}, {collision.position.y}, {collision.position.z})
                    </div>
                  </div>
                  <div>
                    <span className="label">关联设备</span>
                    <div className="text-ink-50">{collision.deviceIds.join(", ")}</div>
                  </div>
                  <div>
                    <span className="label">重叠体积</span>
                    <div className="text-warn">{collision.volume.toFixed(2)} Å³</div>
                  </div>
                  <div>
                    <span className="label">处理意见</span>
                    <div className={collision.approved ? "text-pass" : "text-ink-100"}>
                      {collision.approved
                        ? `${collision.approver} · ${collision.approveReason}`
                        : "待复核"}
                    </div>
                  </div>
                </div>
                <div className="mt-2 border-t border-ink-500/30 pt-2 text-[11px] leading-relaxed text-ink-100/85">
                  <span className="label">解释</span>
                  <p className="mt-1">{collision.explanation}</p>
                </div>
              </div>
              <div className="mt-3">
                <div className="label mb-1.5">相关链路日志</div>
                <ul className="space-y-1.5">
                  {relatedLogs.map((l) => (
                    <li
                      key={l.logId}
                      className="flex items-start gap-2 rounded-sm border border-ink-500/30 bg-ink-800/40 p-2 text-[11px]"
                    >
                      <span className="mt-0.5 text-lattice">›</span>
                      <div>
                        <span className="font-mono text-ink-100">
                          [{new Date(l.timestamp).toLocaleTimeString("zh-CN")}] {l.operator}
                        </span>
                        <span className="mx-1 text-ink-200/50">·</span>
                        <span className="font-mono text-ink-200">{actionLabel(l.action)}</span>
                        {l.reason && (
                          <div className="text-ink-100/80">原因：{l.reason}</div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function ReviewPage() {
  const navigate = useNavigate();
  const batches = useLatticeStore((s) => s.batches);
  const currentBatchId = useLatticeStore((s) => s.currentBatchId);
  const setCurrentBatch = useLatticeStore((s) => s.setCurrentBatch);
  const currentBatch = useLatticeStore((s) => s.currentBatch());

  if (!currentBatch) {
    return (
      <div className="flex h-full items-center justify-center">
        <button type="button" className="btn-primary" onClick={() => navigate("/")}>
          返回工作台
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-4">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate("/")} className="btn-ghost flex items-center gap-1">
            <ArrowLeft size={14} /> 工作台
          </button>
          <div>
            <h1 className="font-display text-2xl text-ink-50">复核中心</h1>
            <p className="label">
              点云切片 · 剖面图 · 模型重叠 同页复核，追溯设备坐标与处理意见
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => exportJson(currentBatch)}
            className="btn-ghost flex items-center gap-1"
          >
            <FileJson size={14} /> 下载 JSON
          </button>
          <button
            type="button"
            onClick={() => exportPdf(currentBatch)}
            className="btn-primary flex items-center gap-1"
          >
            <FileText size={14} /> 下载复核报告
          </button>
          <span className="chip border-ink-300/40 text-ink-100 font-mono">
            文件预览：{buildFileName(currentBatch, "pdf")}
          </span>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[260px_1fr] gap-3">
        <aside className="panel flex min-h-0 flex-col overflow-hidden">
          <div className="panel-header">
            <div className="text-sm font-display text-ink-50">批次时间线</div>
            <span className="chip border-ink-400/50 text-ink-200">{batches.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <ol className="relative ml-1 space-y-2 border-l border-ink-500/40 pl-4">
              {[...batches].reverse().map((b, idx) => {
                const isCurrent = b.batchId === currentBatchId;
                const isLatest = idx === 0;
                return (
                  <li key={b.batchId} className="relative">
                    <span
                      className={cn(
                        "absolute -left-[21px] top-2 flex h-4 w-4 items-center justify-center rounded-full",
                        isCurrent
                          ? "bg-lattice"
                          : isLatest
                            ? "bg-ink-300"
                            : "bg-ink-500",
                      )}
                    >
                      {isCurrent ? (
                        <CheckCircle2 size={10} className="text-ink-800" />
                      ) : (
                        <Circle size={8} className="text-ink-900" />
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentBatch(b.batchId)}
                      className={cn(
                        "w-full rounded-sm border p-2 text-left transition",
                        isCurrent
                          ? "border-lattice/60 bg-lattice/10 shadow-glow"
                          : "border-ink-500/40 hover:bg-ink-600/40",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-ink-50">{b.batchId}</span>
                        {statusChip(b.reviewStatus)}
                      </div>
                      <div className="mt-1 truncate text-[11px] font-mono text-ink-100">
                        {b.materialName}
                      </div>
                      <div className="mt-0.5 text-[10px] font-mono text-ink-200/60">
                        {new Date(b.runTimestamp).toLocaleString("zh-CN")}
                      </div>
                      <div className="mt-1 flex gap-1 text-[10px] font-mono">
                        <span className="chip border-warn/50 text-warn">
                          {b.collisions.length}异常
                        </span>
                        <span className="chip border-ink-400/40 text-ink-200">
                          {b.auditLogs.length}日志
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        </aside>

        <section className="grid min-h-0 grid-rows-[auto_1fr] gap-3">
          <div className="grid grid-cols-3 gap-3">
            <PointCloudPreview slice={currentBatch.pointCloudSlice} />
            <CrossSectionPreview cs={currentBatch.crossSection} />
            <OverlapPreview mo={currentBatch.modelOverlap} collisions={currentBatch.collisions} />
          </div>
          <div className="grid min-h-0 grid-cols-2 gap-3">
            <TracePanel batch={currentBatch} />
            <AuditTrail logs={currentBatch.auditLogs} />
          </div>
        </section>
      </div>
    </div>
  );
}
