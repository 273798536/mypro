import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRightLeft,
  AlertOctagon,
  MapPin,
  FileWarning,
  CheckCircle,
  Download,
  Clock,
  Plus,
  Save,
  RefreshCw,
  EyeOff,
  Link as LinkIcon,
} from "lucide-react";
import { useRecordsStore } from "../store/recordsStore";
import { api } from "../api/client";
import StatusBadge from "../components/StatusBadge";
import TraceTimeline from "../components/TraceTimeline";
import {
  UNIT_LABELS,
  cn,
  formatDateTime,
  convertUnit,
  generateId,
} from "../lib/utils";
import type {
  Conclusion,
  RiskNote,
  UnitError,
  UnitType,
} from "../../shared/types";

export default function RecordDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { activeRecord, history, trace, fetchRecord, fetchHistory, fetchTrace, updateRecord, loading } =
    useRecordsStore();

  const riskRef = useRef<HTMLDivElement>(null);
  const conclusionRef = useRef<HTMLDivElement>(null);

  const [newRisk, setNewRisk] = useState("");
  const [newConclusion, setNewConclusion] = useState("");

  useEffect(() => {
    if (id) {
      fetchRecord(id);
      fetchHistory(id);
      fetchTrace(id);
    }
    return () => useRecordsStore.getState().reset();
  }, [id, fetchRecord, fetchHistory, fetchTrace]);

  const scrollTo = (target: "risk" | "conclusion") => {
    const el = target === "risk" ? riskRef.current : conclusionRef.current;
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const addRiskNote = async () => {
    if (!newRisk.trim() || !activeRecord) return;
    const note: RiskNote = {
      id: `rn-${generateId()}`,
      content: newRisk,
      author: "李讲解员",
      createdAt: new Date().toISOString(),
      linkedConclusionId: null,
    };
    await updateRecord(activeRecord.id, {
      riskNotes: [...activeRecord.riskNotes, note],
      status: "reviewing",
    });
    setNewRisk("");
  };

  const addConclusion = async () => {
    if (!newConclusion.trim() || !activeRecord) return;
    const c: Conclusion = {
      id: `con-${generateId()}`,
      content: newConclusion,
      author: "李讲解员",
      createdAt: new Date().toISOString(),
      status: "pending",
      linkedRiskNoteId: null,
    };
    await updateRecord(activeRecord.id, {
      conclusions: [...activeRecord.conclusions, c],
      status: "corrected",
    });
    setNewConclusion("");
  };

  const correctUnitError = async (errIdx: number, corrected: number) => {
    if (!activeRecord) return;
    const newErrors = activeRecord.unitErrors.map((e, i) =>
      i === errIdx ? { ...e, correctedValue: corrected } : e
    );
    const coords = { ...activeRecord.coords };
    const err = activeRecord.unitErrors[errIdx];
    if (err.field === "x") coords.x = corrected;
    if (err.field === "y") coords.y = corrected;
    if (err.field === "z") coords.z = corrected;
    coords.unit = err.expectedUnit;
    await updateRecord(activeRecord.id, {
      unitErrors: newErrors,
      coords,
      status: newErrors.every((e) => e.correctedValue !== null) ? "corrected" : activeRecord.status,
    });
  };

  const toggleLink = async (type: "risk" | "conclusion", id: string) => {
    if (!activeRecord) return;
    if (type === "risk") {
      const notes = activeRecord.riskNotes.map((n) => {
        if (n.id !== id) return n;
        const target = n.linkedConclusionId
          ? null
          : activeRecord.conclusions[0]?.id ?? null;
        return { ...n, linkedConclusionId: target };
      });
      const conclusions = activeRecord.conclusions.map((c) => {
        const matchedNote = notes.find((n) => n.linkedConclusionId === c.id);
        return { ...c, linkedRiskNoteId: matchedNote?.id ?? null };
      });
      await updateRecord(activeRecord.id, { riskNotes: notes, conclusions });
    }
  };

  const stats = useMemo(() => {
    if (!activeRecord) return null;
    return {
      unitErrUnfixed: activeRecord.unitErrors.filter((e) => e.correctedValue === null).length,
      risks: activeRecord.riskNotes.length,
      conclusions: activeRecord.conclusions.length,
    };
  }, [activeRecord]);

  if (!activeRecord) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-muted">
        {loading ? "加载中..." : "记录不存在"}
      </div>
    );
  }

  const rec = activeRecord;

  return (
    <div className="flex-1 h-screen overflow-hidden flex flex-col">
      <header className="border-b border-border bg-bg-secondary px-6 py-4 flex items-center gap-4 shrink-0">
        <button
          onClick={() => nav(-1)}
          className="p-2 rounded-md hover:bg-bg-tertiary text-text-secondary hover:text-accent transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-xl font-bold text-text-primary truncate">
              {rec.fixtureName}
            </h1>
            <StatusBadge status={rec.status} />
            {rec.hasDuplicate && (
              <span className="tag border bg-warning-bg border-warning/40 text-warning">
                ⚠ 重复导入
              </span>
            )}
            {rec.isTransparentOcclusionMisread && (
              <span className="tag border bg-danger-bg border-danger/50 text-danger">
                <EyeOff className="w-3 h-3 mr-1" />
                验收：透明遮挡误读
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 mt-1 text-xs font-mono text-text-muted">
            <span>{rec.coords.fixtureId}</span>
            <span>{rec.batchNo}</span>
            <span>操作员: {rec.operator}</span>
            <span>更新: {formatDateTime(rec.updatedAt)}</span>
          </div>
        </div>
        <a
          href={api.exportUrl("json", [rec.id])}
          className="btn-secondary flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          导出
        </a>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "单位换算错误", v: rec.unitErrors.length, sub: `${stats?.unitErrUnfixed ?? 0} 待修正`, c: "text-danger" },
              { label: "风险备注", v: stats?.risks ?? 0, sub: "同轮复核项", c: "text-warning" },
              { label: "最终结论", v: stats?.conclusions ?? 0, sub: "同轮复核项", c: "text-success" },
              { label: "追溯节点", v: trace.length, sub: "来源链长度", c: "text-accent" },
            ].map((s) => (
              <div key={s.label} className="panel p-4">
                <div className="text-xs text-text-muted font-mono">{s.label}</div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className={cn("font-display text-2xl font-bold", s.c)}>{s.v}</span>
                  <span className="text-[11px] text-text-muted">{s.sub}</span>
                </div>
              </div>
            ))}
          </div>

          <div id="coord-section" className="panel p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-accent" />
                <h2 className="font-display font-semibold text-text-primary">设备坐标</h2>
                <span className="text-xs text-text-muted font-mono">同轮复核 · 1/3</span>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {(["x", "y", "z"] as const).map((axis) => (
                <div key={axis} className="bg-bg-primary border border-border rounded-md p-3">
                  <div className="text-[11px] font-mono text-text-muted uppercase">{axis} 坐标</div>
                  <div className="font-mono text-lg text-text-primary mt-1">
                    {rec.coords[axis]}
                  </div>
                </div>
              ))}
              <div className="bg-bg-primary border border-border rounded-md p-3">
                <div className="text-[11px] font-mono text-text-muted uppercase">单位</div>
                <div className="font-mono text-sm text-text-primary mt-1">
                  {UNIT_LABELS[rec.coords.unit as UnitType]}
                </div>
              </div>
            </div>

            {rec.unitErrors.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border space-y-2">
                <div className="flex items-center gap-2 text-danger text-sm font-medium">
                  <AlertOctagon className="w-4 h-4" />
                  单位换算错误 · 需修正
                </div>
                {rec.unitErrors.map((err: UnitError, i) => (
                  <div
                    key={i}
                    className="bg-danger-bg/40 border border-danger/40 rounded-md p-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium text-danger">
                        字段 {err.field.toUpperCase()}: {err.message}
                      </div>
                      {err.correctedValue !== null && (
                        <span className="tag border bg-success/15 border-success/40 text-success">
                          已修正
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-3 items-end">
                      <div>
                        <div className="text-[11px] font-mono text-text-muted">原始值</div>
                        <div className="font-mono text-sm text-text-secondary line-through">
                          {err.originalValue} {UNIT_LABELS[err.originalUnit]}
                        </div>
                      </div>
                      <div className="text-text-muted">→</div>
                      <div>
                        <div className="text-[11px] font-mono text-text-muted">应为</div>
                        <div className="font-mono text-sm text-text-primary">
                          {err.correctedValue ??
                            convertUnit(err.originalValue, err.originalUnit, err.expectedUnit).toFixed(2)}{" "}
                          {UNIT_LABELS[err.expectedUnit]}
                        </div>
                      </div>
                      {err.correctedValue === null && (
                        <button
                          onClick={() =>
                            correctUnitError(
                              i,
                              Number(
                                convertUnit(err.originalValue, err.originalUnit, err.expectedUnit).toFixed(2)
                              )
                            )
                          }
                          className="btn-primary text-sm py-1.5 flex items-center justify-center gap-1"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          一键修正
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div ref={riskRef} id="risk-section" className="panel p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileWarning className="w-4 h-4 text-warning" />
                <h2 className="font-display font-semibold text-text-primary">风险备注</h2>
                <span className="text-xs text-text-muted font-mono">同轮复核 · 2/3</span>
              </div>
              <button
                onClick={() => scrollTo("conclusion")}
                className="flex items-center gap-1 text-xs text-accent hover:underline"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                跳转最终结论
              </button>
            </div>

            {rec.riskNotes.length === 0 && (
              <div className="text-sm text-text-muted py-4">暂无风险备注</div>
            )}
            <div className="space-y-2 mb-3">
              {rec.riskNotes.map((rn: RiskNote) => (
                <div
                  key={rn.id}
                  className="bg-warning-bg/30 border border-warning/30 rounded-md p-3"
                >
                  <div className="flex items-start justify-between">
                    <p className="text-sm text-text-primary">{rn.content}</p>
                    <button
                      onClick={() => toggleLink("risk", rn.id)}
                      className={cn(
                        "ml-2 shrink-0 p-1 rounded transition-colors",
                        rn.linkedConclusionId
                          ? "bg-success/15 text-success border border-success/30"
                          : "text-text-muted hover:text-accent hover:bg-bg-tertiary"
                      )}
                      title={rn.linkedConclusionId ? "已关联结论，点击解除" : "关联到结论"}
                    >
                      <LinkIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-[11px] font-mono text-text-muted">
                    <span>{rn.author}</span>
                    <span>{formatDateTime(rn.createdAt)}</span>
                    {rn.linkedConclusionId && (
                      <span className="text-success flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        已关联结论
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                className="input-base flex-1"
                placeholder="添加风险备注（同轮复核）..."
                value={newRisk}
                onChange={(e) => setNewRisk(e.target.value)}
              />
              <button onClick={addRiskNote} className="btn-primary flex items-center gap-1">
                <Plus className="w-4 h-4" />
                添加
              </button>
            </div>
          </div>

          <div ref={conclusionRef} id="conclusion-section" className="panel p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                <h2 className="font-display font-semibold text-text-primary">最终结论</h2>
                <span className="text-xs text-text-muted font-mono">同轮复核 · 3/3</span>
              </div>
              <button
                onClick={() => scrollTo("risk")}
                className="flex items-center gap-1 text-xs text-accent hover:underline"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                跳转风险备注
              </button>
            </div>

            {rec.conclusions.length === 0 && (
              <div className="text-sm text-text-muted py-4">暂无结论</div>
            )}
            <div className="space-y-2 mb-3">
              {rec.conclusions.map((c: Conclusion) => (
                <div
                  key={c.id}
                  className={cn(
                    "rounded-md p-3 border",
                    c.status === "approved"
                      ? "bg-success/10 border-success/30"
                      : c.status === "rejected"
                      ? "bg-danger-bg border-danger/30"
                      : "bg-bg-tertiary border-border-light"
                  )}
                >
                  <div className="flex items-start justify-between mb-1">
                    <p className="text-sm text-text-primary">{c.content}</p>
                    <span
                      className={cn(
                        "tag border",
                        c.status === "approved" && "bg-success/15 border-success/40 text-success",
                        c.status === "rejected" && "bg-danger-bg border-danger/40 text-danger",
                        c.status === "pending" && "bg-bg-tertiary border-border text-text-secondary"
                      )}
                    >
                      {c.status === "approved" ? "已通过" : c.status === "rejected" ? "已驳回" : "待审核"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] font-mono text-text-muted">
                    <span>{c.author}</span>
                    <span>{formatDateTime(c.createdAt)}</span>
                    {c.linkedRiskNoteId && (
                      <span className="text-warning flex items-center gap-1">
                        <LinkIcon className="w-3 h-3" />
                        已关联风险备注
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                className="input-base flex-1"
                placeholder="添加最终结论..."
                value={newConclusion}
                onChange={(e) => setNewConclusion(e.target.value)}
              />
              <button onClick={addConclusion} className="btn-primary flex items-center gap-1">
                <Save className="w-4 h-4" />
                提交
              </button>
            </div>
          </div>

          <div className="panel p-5">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-text-secondary" />
              <h2 className="font-display font-semibold text-text-primary">历史版本</h2>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {history.map((h) => (
                <div key={h.version} className="flex items-start gap-3 p-3 bg-bg-primary/60 rounded border border-border/60">
                  <div className="w-8 h-8 rounded-full bg-bg-tertiary border border-border flex items-center justify-center text-xs font-mono text-accent shrink-0">
                    v{h.version}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-text-primary">{h.operator}</span>
                      <span className="text-[11px] font-mono text-text-muted">
                        {formatDateTime(h.timestamp)}
                      </span>
                    </div>
                    <div className="text-xs text-text-secondary mt-0.5 font-mono truncate">
                      {h.diff}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="w-80 shrink-0 border-l border-border bg-bg-secondary/50 overflow-y-auto p-5">
          <h2 className="font-display font-semibold text-text-primary mb-1 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-accent" />
            来源追溯链
          </h2>
          <p className="text-xs text-text-muted mb-4">
            {rec.isTransparentOcclusionMisread
              ? "验收路径：从结果倒查来源和处理记录"
              : "从结果一路回到来源与处理"}
          </p>
          <TraceTimeline trace={trace} />
        </aside>
      </div>
    </div>
  );
}
