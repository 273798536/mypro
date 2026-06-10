import type { Batch, Version } from "@/types";
import { STATUS_BADGE, STATUS_LABEL, SOLVENT_META, ROLE_LABEL, purityColor } from "@/types";
import { Link } from "react-router-dom";
import { useApp } from "@/store/useApp";
import { Calendar, Eye, FileDown, History, Beaker } from "lucide-react";

interface Props {
  batch: Batch;
  compact?: boolean;
}

export default function BatchCard({ batch, compact }: Props) {
  const { role, getLatestVersion, getPublishedVersion } = useApp();
  const meta = SOLVENT_META[batch.solventType];
  const latest = getLatestVersion(batch);
  const published = getPublishedVersion(batch);
  const display: Version | undefined = role === "student" ? published : latest;
  const recovery = batch.initialAmount ? +((batch.recoveredAmount / batch.initialAmount) * 100).toFixed(1) : 0;

  const hasPhOut = batch.phLogs.some((p) => p.isOutOfRange);
  const retestPending = batch.retestAdvices.some((r) => !r.resolved);

  const fmt = (iso: string) => new Date(iso).toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });

  const reviewLink = role === "student" ? `/student/${batch.batchId}` : `/review/${batch.batchId}`;

  return (
    <div className="card hover:shadow-lg transition-all animate-slide-up">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm text-lab-600 font-semibold tracking-wide">
              {batch.batchId}
            </span>
            <span className={`badge ${STATUS_BADGE[batch.status]}`}>
              {STATUS_LABEL[batch.status]}
            </span>
            {hasPhOut && (
              <span className="badge bg-warn-100 text-warn-700">⚠ pH越界</span>
            )}
            {retestPending && (
              <span className="badge bg-alert-50 text-alert-700">🔄 复测待处理</span>
            )}
          </div>
          <div className="mt-2 flex items-center gap-3 text-sm text-ink-600">
            <span className="flex items-center gap-1">
              <Beaker size="14" className="text-lab-500" />
              {meta.name}（{meta.abbreviation}）
            </span>
            <span>{batch.initialAmount}L → 回收 {batch.recoveredAmount}L（{recovery}%）</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className={`text-[11px] font-medium mb-1 ${purityColor(display?.purityResult || 0)}`}>
            {display?.purityResult ? `纯度` : "待录入纯度"}
          </div>
          {display?.purityResult ? (
            <div className={`text-3xl font-display ${purityColor(display.purityResult)}`}>
              {display.purityResult.toFixed(1)}
              <span className="text-base font-sans ml-0.5 opacity-70">%</span>
            </div>
          ) : (
            <div className="text-2xl font-display text-ink-300">—</div>
          )}
          <div className="text-[11px] text-ink-400 mt-1">目标 {batch.targetPurity}%</div>
        </div>
      </div>

      {display?.explanation && !compact && (
        <div className="mt-4 p-3 rounded-xl bg-lab-50/60 border border-lab-100/70 text-sm text-ink-700 leading-relaxed">
          <span className="inline-block px-2 py-0.5 rounded-md bg-lab-100 text-lab-700 text-xs font-medium mr-2 mb-1">
            结果解释
          </span>
          {display.explanation}
        </div>
      )}

      {!compact && (
        <div className="mt-4 flex items-center justify-between gap-4 flex-wrap border-t border-ink-100 pt-3">
          <div className="flex items-center gap-4 text-xs text-ink-500 flex-wrap">
            <span className="flex items-center gap-1">
              <Calendar size="12" />
              创建 {fmt(batch.createdAt)}
            </span>
            {display && (
              <span className="flex items-center gap-1">
                <History size="12" />
                v{display.versionNum} · {ROLE_LABEL[display.modifiedBy]} · {fmt(display.modifiedAt)}
              </span>
            )}
            <span className="flex items-center gap-1">
              共 {batch.versions.length} 个版本
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link to={reviewLink} className="btn-secondary">
              <Eye size="15" />
              {role === "student" ? "查看报告" : "复核 / 详情"}
            </Link>
            {role !== "student" && batch.status === "published" && (
              <ExportButton batch={batch} />
            )}
          </div>
        </div>
      )}

      {compact && (
        <div className="mt-3">
          <Link to={reviewLink} className="btn-secondary w-full">
            <Eye size="15" /> 查看详情
          </Link>
        </div>
      )}
    </div>
  );
}

function ExportButton({ batch }: { batch: Batch }) {
  const { getPublishedVersion, calculateBalance } = useApp();
  const pub = getPublishedVersion(batch);
  if (!pub) return null;

  const handleCsv = () => {
    const bal = calculateBalance({
      solventType: batch.solventType,
      initialAmount: batch.initialAmount,
      targetPurity: batch.targetPurity,
    });
    const meta = SOLVENT_META[batch.solventType];
    const rows: string[][] = [
      ["溶剂回收纯度追踪报告 · 导出内容与界面摘要一致"],
      ["批次号", batch.batchId],
      ["溶剂类型", `${meta.name} (${meta.abbreviation})`],
      ["状态", STATUS_LABEL[batch.status]],
      ["投料量(L)", String(batch.initialAmount)],
      ["回收量(L)", String(batch.recoveredAmount)],
      ["目标纯度(%)", String(batch.targetPurity)],
      ["实际纯度(%)", String(pub.purityResult)],
      ["回收率(%)", String(+((batch.recoveredAmount / batch.initialAmount) * 100).toFixed(2))],
      ["理论回收率(%)", String(bal.theoreticalRecovery)],
      ["pH范围", `${bal.phRange[0]} ~ ${bal.phRange[1]}`],
      ["版本号", `v${pub.versionNum}`],
      ["修改人", ROLE_LABEL[pub.modifiedBy]],
      ["修改说明", pub.changeNote],
      ["结果解释", pub.explanation],
      [],
      ["反应条件"],
      ["名称", "数值", "单位"],
      ...batch.reactionConditions.map((r) => [r.name, r.value, r.unit]),
      [],
      ["温度曲线"],
      ["时间(min)", "温度(°C)"],
      ...batch.tempCurve.map((t) => [String(t.timeMin), String(t.tempC)]),
      [],
      ["pH记录"],
      ["时间(min)", "pH值", "是否越界"],
      ...batch.phLogs.map((p) => [String(p.timeMin), String(p.phValue), p.isOutOfRange ? "是" : "否"]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${batch.batchId}_纯度报告.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => window.print();

  return (
    <>
      <button onClick={handleCsv} className="btn-ghost">
        <FileDown size="15" />
        导出CSV
      </button>
      <button onClick={handlePrint} className="btn-ghost">
        <FileDown size="15" />
        打印PDF
      </button>
    </>
  );
}
