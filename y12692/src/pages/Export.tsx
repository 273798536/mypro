import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  FileJson,
  FileText,
  Info,
  ShieldCheck,
} from "lucide-react";
import { useLatticeStore } from "@/store/useLatticeStore";
import { buildFileName, exportJson, exportPdf } from "@/utils/export";

type Format = "json" | "pdf" | "both";

export default function ExportPage() {
  const navigate = useNavigate();
  const currentBatch = useLatticeStore((s) => s.currentBatch());
  const batches = useLatticeStore((s) => s.batches);
  const setCurrentBatch = useLatticeStore((s) => s.setCurrentBatch);
  const [format, setFormat] = useState<Format>("pdf");
  const [done, setDone] = useState<string | null>(null);

  if (!currentBatch) {
    return (
      <div className="flex h-full items-center justify-center">
        <button type="button" className="btn-primary" onClick={() => navigate("/")}>
          返回工作台
        </button>
      </div>
    );
  }

  const handleExport = () => {
    if (format === "json" || format === "both") exportJson(currentBatch);
    if (format === "pdf" || format === "both") exportPdf(currentBatch);
    setDone(
      format === "both"
        ? "JSON 与 PDF 均已下载"
        : `${format.toUpperCase()} 已下载`,
    );
    setTimeout(() => setDone(null), 2800);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 p-5">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate("/")} className="btn-ghost flex items-center gap-1">
            <ArrowLeft size={14} /> 工作台
          </button>
          <div>
            <h1 className="font-display text-2xl text-ink-50">成果输出</h1>
            <p className="label mt-0.5">
              文件名含批次号与时间戳，内容不花哨但可区分每次运行
            </p>
          </div>
        </div>
        {done && (
          <div className="animate-slide-up flex items-center gap-2 rounded-sm border border-pass/60 bg-pass/10 px-3 py-1.5 text-xs font-mono text-pass">
            <CheckCircle2 size={14} /> {done}
          </div>
        )}
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[280px_1fr] gap-4">
        <aside className="panel flex min-h-0 flex-col overflow-hidden">
          <div className="panel-header">
            <div className="text-sm font-display text-ink-50">选择批次</div>
          </div>
          <ul className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {batches.map((b) => {
              const active = b.batchId === currentBatch.batchId;
              return (
                <li key={b.batchId}>
                  <button
                    type="button"
                    onClick={() => setCurrentBatch(b.batchId)}
                    className={
                      "w-full rounded-sm border p-2 text-left transition " +
                      (active
                        ? "border-lattice/60 bg-lattice/10"
                        : "border-ink-500/40 hover:bg-ink-600/30")
                    }
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-ink-50">{b.batchId}</span>
                      <span className="chip border-ink-400/40 text-ink-200 text-[10px]">
                        {b.collisions.length} 异常
                      </span>
                    </div>
                    <div className="mt-1 truncate text-[11px] text-ink-100">
                      {b.materialName}
                    </div>
                    <div className="text-[10px] font-mono text-ink-200/60">
                      {new Date(b.runTimestamp).toLocaleString("zh-CN")}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <section className="panel flex min-h-0 flex-col overflow-hidden">
          <div className="panel-header">
            <div>
              <div className="text-sm font-display text-ink-50">下载预览</div>
              <div className="label mt-0.5">
                与界面共用同一批处理记录，数据唯一来源
              </div>
            </div>
            <ShieldCheck size={18} className="text-lattice" />
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="panel p-4">
                <div className="label mb-2">当前批次信息</div>
                <dl className="space-y-1.5 text-[12px] font-mono">
                  <div className="flex justify-between">
                    <dt className="text-ink-200/70">批次号</dt>
                    <dd className="text-ink-50">{currentBatch.batchId}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ink-200/70">材料</dt>
                    <dd className="text-ink-50">{currentBatch.materialName}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ink-200/70">运行时间</dt>
                    <dd className="text-ink-50">
                      {new Date(currentBatch.runTimestamp).toLocaleString("zh-CN")}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ink-200/70">碰撞异常</dt>
                    <dd className="text-warn">{currentBatch.collisions.length} 处</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ink-200/70">审计日志</dt>
                    <dd className="text-ink-50">{currentBatch.auditLogs.length} 条</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ink-200/70">复核状态</dt>
                    <dd
                      className={
                        currentBatch.reviewStatus === "approved"
                          ? "text-pass"
                          : currentBatch.reviewStatus === "rejected"
                            ? "text-alert"
                            : "text-ink-100"
                      }
                    >
                      {currentBatch.reviewStatus === "approved"
                        ? "已通过"
                        : currentBatch.reviewStatus === "rejected"
                          ? "已驳回"
                          : "待复核"}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="panel p-4">
                <div className="label mb-2">文件名预览（区分本次与上次）</div>
                <div className="rounded-sm border border-ink-500/40 bg-ink-900/70 p-3 font-mono text-[12px] text-lattice break-all">
                  {buildFileName(currentBatch, format === "both" ? "pdf/json" : format)}
                </div>
                <div className="mt-3">
                  <div className="label mb-2">输出格式</div>
                  <div className="grid grid-cols-3 gap-2">
                    {(["pdf", "json", "both"] as Format[]).map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setFormat(f)}
                        className={
                          "btn flex items-center justify-center gap-1 " +
                          (format === f
                            ? "border-lattice bg-lattice/15 text-lattice"
                            : "border-ink-400/50 text-ink-100 hover:bg-ink-500/40")
                        }
                      >
                        {f === "pdf" && <FileText size={12} />}
                        {f === "json" && <FileJson size={12} />}
                        {f === "both" && "两者"}
                        {f !== "both" && f.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleExport}
                  className="btn-primary mt-4 w-full"
                >
                  下载成果文件
                </button>
              </div>
            </div>

            <div className="panel p-4">
              <div className="flex items-center gap-2 text-sm font-display text-ink-50">
                <Info size={14} className="text-lattice" />
                报告内容摘要（不花哨，专注施工交底）
              </div>
              <p className="mt-2 text-[12px] leading-relaxed text-ink-100/90">
                包含：批次号、材料、运行时间、复核状态、完整参数快照、碰撞异常列表（含坐标、体积、原子对、解释文字、复核人与通过原因），以及总处理意见。所有数据来源于
                <span className="mx-1 rounded-sm bg-lattice/10 px-1 py-0.5 text-lattice">
                  同一批处理记录
                </span>
                ，界面、复核、报告三者共用，确保对账一致。
              </p>
            </div>

            {currentBatch.reviewerNote && (
              <div className="panel p-4">
                <div className="label mb-1">处理意见</div>
                <p className="text-[12px] leading-relaxed text-ink-100">
                  {currentBatch.reviewerNote}
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
