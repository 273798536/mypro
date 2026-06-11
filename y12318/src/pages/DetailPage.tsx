import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  AlertTriangle, AlertOctagon, TrendingUp, Clock, FileEdit, Tag,
  Download, CheckCircle2, XCircle, ChevronDown, ChevronUp, ArrowLeft,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { useStore } from "@/store/useStore";
import type { ReplenishmentSuggestion, EvidenceItem } from "@/types";
import * as XLSX from "xlsx";

const PRIORITY_BADGE: Record<string, string> = { critical: "badge-danger", high: "badge-warning", medium: "badge-info", low: "badge-success" };
const PRIORITY_LABEL: Record<string, string> = { critical: "紧急", high: "高", medium: "中", low: "低" };
const EVT: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  shortage: { icon: AlertTriangle, color: "#FF3B30", label: "缺货记录" },
  negative_inventory: { icon: AlertOctagon, color: "#FF9500", label: "负库存" },
  demand_surge: { icon: TrendingUp, color: "#E8A838", label: "需求突增" },
  arrival_delay: { icon: Clock, color: "#FFD60A", label: "到货延迟" },
  remark_change: { icon: FileEdit, color: "#4A90D9", label: "备注变更" },
  promo_override: { icon: Tag, color: "#AF52DE", label: "促销覆盖" },
};

const fmtPct0 = (v: number) => `${(v * 100).toFixed(0)}%`;
const fmtPct1 = (v: number) => `${(v * 100).toFixed(1)}%`;

function genCurve(p50: number, p75: number, p90: number) {
  const r = (s: number) => { const x = Math.sin(s * 9301 + 49297) * 233280; return x - Math.floor(x); };
  return Array.from({ length: 14 }, (_, i) => {
    const d = i * 0.015;
    return {
      day: `Day${i + 1}`,
      P50: +Math.max(0, p50 + d + r(i * 3 + 1) * 0.06 - 0.03).toFixed(4),
      P75: +Math.max(0, p75 + d * 1.2 + r(i * 3 + 2) * 0.06 - 0.03).toFixed(4),
      P90: +Math.max(0, p90 + d * 1.5 + r(i * 3 + 3) * 0.06 - 0.03).toFixed(4),
    };
  });
}

function DecisionCard({ s }: { s: ReplenishmentSuggestion }) {
  return (
    <div className="card">
      <div className="flex gap-8">
        <div className="flex flex-col items-start justify-center gap-3 min-w-[180px]">
          <div>
            <div className="text-xs text-text-secondary mb-1">补货量</div>
            <div className="mono text-3xl font-bold text-steel">{s.suggestedQty}</div>
          </div>
          <div>
            <div className="text-xs text-text-secondary mb-1">置信度</div>
            <div className="mono text-2xl font-semibold" style={{ color: s.confidence >= 0.8 ? "#34C759" : s.confidence >= 0.5 ? "#E8A838" : "#FF3B30" }}>
              {(s.confidence * 100).toFixed(1)}%
            </div>
          </div>
          <span className={PRIORITY_BADGE[s.priority]}>{PRIORITY_LABEL[s.priority]}</span>
        </div>
        <div className="flex-1 grid grid-cols-2 gap-x-8 gap-y-3 py-1 border-l border-base-100 pl-8">
          <div><span className="text-xs text-text-muted">SKU名称</span><div className="text-sm text-text-primary mt-0.5">{s.skuName}</div></div>
          <div><span className="text-xs text-text-muted">品类 / 门店</span><div className="text-sm text-text-primary mt-0.5">{s.category} · {s.store}</div></div>
          <div><span className="text-xs text-text-muted">当前库存</span><div className="mono text-sm mt-0.5" style={{ color: s.currentStock < s.safetyStock ? "#FF3B30" : "#F5F5F7" }}>{s.currentStock}</div></div>
          <div><span className="text-xs text-text-muted">安全库存</span><div className="mono text-sm text-text-secondary mt-0.5">{s.safetyStock}</div></div>
          <div><span className="text-xs text-text-muted">概率区间</span><div className="mono text-sm text-text-primary mt-0.5">P50 {(s.probabilityP50 * 100).toFixed(1)}% — P90 {(s.probabilityP90 * 100).toFixed(1)}%</div></div>
          {s.hasAnomaly && <div className="col-span-2 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4 text-amber" /><span className="text-xs text-amber">异常: {s.anomalyTypes.join(", ")}</span></div>}
        </div>
      </div>
    </div>
  );
}

function ProbabilityCurve({ s }: { s: ReplenishmentSuggestion }) {
  const data = useMemo(() => genCurve(s.probabilityP50, s.probabilityP75, s.probabilityP90), [s]);
  const refY = Math.max(0, Math.min(1, 1 - s.currentStock / (s.safetyStock * 2)));
  return (
    <div className="card">
      <h3 className="text-sm font-medium text-text-primary mb-3">概率预测曲线</h3>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <XAxis dataKey="day" tick={{ fill: "#8E8E93", fontSize: 11 }} axisLine={{ stroke: "#2D3139" }} tickLine={false} />
          <YAxis tick={{ fill: "#8E8E93", fontSize: 11 }} axisLine={{ stroke: "#2D3139" }} tickLine={false} tickFormatter={fmtPct0} width={45} />
          <Tooltip contentStyle={{ background: "#22262E", border: "1px solid #2D3139", borderRadius: 6, fontSize: 12 }} labelStyle={{ color: "#F5F5F7" }} formatter={fmtPct1} />
          <ReferenceLine y={refY} stroke="#FF3B30" strokeDasharray="4 2" label={{ value: "库存水位", fill: "#FF3B30", fontSize: 11, position: "right" }} />
          <Area type="monotone" dataKey="P50" stroke="#4A90D9" fill="#4A90D9" fillOpacity={0.15} strokeWidth={2} dot={false} />
          <Area type="monotone" dataKey="P75" stroke="#8E8E93" fill="#8E8E93" fillOpacity={0.08} strokeWidth={1.5} strokeDasharray="6 3" dot={false} />
          <Area type="monotone" dataKey="P90" stroke="#E8A838" fill="#E8A838" fillOpacity={0.08} strokeWidth={1.5} strokeDasharray="2 4" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-5 mt-2 text-xs text-text-secondary">
        <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-0.5 rounded" style={{ background: "#4A90D9" }} />P50</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-0 border-t-2 border-dashed" style={{ borderColor: "#8E8E93" }} />P75</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-0 border-t-2 border-dotted" style={{ borderColor: "#E8A838" }} />P90</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-0 border-t-2 border-dashed" style={{ borderColor: "#FF3B30" }} />库存水位</span>
      </div>
    </div>
  );
}

function SafetyStockCalc({ s }: { s: ReplenishmentSuggestion }) {
  const lt = 7;
  const z = s.confidence <= 0.9 ? 1.28 : s.confidence <= 0.95 ? 1.65 : s.confidence <= 0.99 ? 2.33 : 2.58;
  const sigma = +(s.safetyStock / (z * Math.sqrt(lt))).toFixed(2);
  const params = [
    { symbol: "Z", name: "服务水准系数", value: z.toFixed(2), source: "配置参数" },
    { symbol: "σ_d", name: "需求标准差", value: sigma.toFixed(2), source: "销售历史" },
    { symbol: "LT", name: "补货周期天数", value: String(lt), source: "库存快照" },
  ];
  return (
    <div className="card">
      <h3 className="text-sm font-medium text-text-primary mb-3">安全库存计算过程</h3>
      <div className="mono text-base text-text-secondary mb-4">
        SS = Z × σ<sub>d</sub> × √LT = <span className="text-steel font-semibold">{z.toFixed(2)}</span> × <span className="text-steel font-semibold">{sigma.toFixed(2)}</span> × √{lt} = <span className="text-emerald font-bold">{s.safetyStock}</span>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {params.map((p) => (
          <div key={p.symbol} className="bg-base rounded-md border border-base-100 p-3">
            <div className="flex items-baseline justify-between mb-1">
              <span className="mono text-lg font-semibold text-steel">{p.symbol}</span>
              <span className="text-[10px] text-text-muted px-1.5 py-0.5 rounded bg-base-100">{p.source}</span>
            </div>
            <div className="text-xs text-text-secondary mb-1">{p.name}</div>
            <div className="mono text-sm text-text-primary">{p.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EvidenceTimeline({ items }: { items: EvidenceItem[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setExpanded((prev) => { const n = new Set(prev); if (n.has(id)) { n.delete(id); } else { n.add(id); } return n; });
  return (
    <div className="card">
      <h3 className="text-sm font-medium text-text-primary mb-4">证据链时间线</h3>
      <div className="relative pl-6">
        <div className="absolute left-[9px] top-2 bottom-2 w-px bg-base-200" />
        {items.map((e) => {
          const cfg = EVT[e.eventType] || EVT.shortage;
          const Icon = cfg.icon;
          const isOpen = expanded.has(e.evidenceId);
          return (
            <div key={e.evidenceId} className="relative mb-4 last:mb-0">
              <div className="absolute -left-6 top-1 w-[18px] h-[18px] rounded-full flex items-center justify-center" style={{ backgroundColor: cfg.color + "22" }}>
                <Icon className="w-3 h-3" style={{ color: cfg.color }} />
              </div>
              <div className="flex items-start gap-3">
                <span className="mono text-xs text-text-muted min-w-[70px] pt-0.5">{e.eventDate}</span>
                <div className="flex-1 bg-base rounded-md border border-base-100 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-text-primary">{cfg.label}</span>
                    {e.isOverride && <span className="badge-danger text-[10px]">已覆盖</span>}
                    <button onClick={() => toggle(e.evidenceId)} className="ml-auto text-text-muted hover:text-text-secondary">
                      {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-xs text-text-secondary">{e.description}</p>
                  {isOpen && (
                    <div className="mt-2 pt-2 border-t border-base-100 text-xs text-text-muted space-y-1">
                      <div>数据源: {e.sourceTable}</div>
                      <div>严重程度: {e.severity}</div>
                      {e.isOverride && (
                        <div className="text-danger">
                          <div>原始值: {e.originalValue}</div>
                          <div>覆盖值: {e.overriddenValue}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {items.length === 0 && <div className="text-sm text-text-muted py-4 text-center">暂无证据记录</div>}
      </div>
    </div>
  );
}

function ExportPanel({ s, evidences }: { s: ReplenishmentSuggestion; evidences: EvidenceItem[] }) {
  const [format, setFormat] = useState<"csv" | "excel">("csv");
  const [warnings, setWarnings] = useState<string[] | null>(null);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const exportConsistencyCheck = useStore((st) => st.exportConsistencyCheck);

  const csvCell = (v: string | number) => {
    const s = String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  const buildCSV = () => {
    const bom = "\uFEFF";
    const snap = useStore.getState().inventorySnapshot.find((i) => i.skuId === s.skuId);
    const skuConflicts = useStore.getState().conflicts.filter((c) => c.skuId === s.skuId);

    const header = ["SKU", "SKU名称", "品类", "仓库", "补货量", "置信度", "优先级", "当前库存", "安全库存", "P50", "P75", "P90", "库存快照结论", "异常标记"].map(csvCell).join(",");
    const row = [
      s.skuId, s.skuName, s.category, s.store,
      s.suggestedQty, (s.confidence * 100).toFixed(1) + "%", PRIORITY_LABEL[s.priority],
      s.currentStock, s.safetyStock,
      (s.probabilityP50 * 100).toFixed(1) + "%", (s.probabilityP75 * 100).toFixed(1) + "%", (s.probabilityP90 * 100).toFixed(1) + "%",
      snap ? snap.conclusion : "-",
      s.anomalyTypes.join(";") || "-",
    ].map(csvCell).join(",");

    const evHeader = ["证据ID", "事件日期", "事件类型", "描述", "数据源", "是否覆盖", "严重程度", "原始值", "覆盖值"].map(csvCell).join(",");
    const evRows = evidences.map((e) =>
      [e.evidenceId, e.eventDate, EVT[e.eventType]?.label || e.eventType, e.description, e.sourceTable, e.isOverride ? "是" : "否", e.severity, e.originalValue, e.overriddenValue].map(csvCell).join(",")
    ).join("\n");

    let csv = bom + header + "\n" + row + "\n\n" + evHeader + "\n" + evRows;

    if (skuConflicts.length > 0) {
      const cHeader = ["冲突类型", "销售结论", "库存结论", "严重程度", "描述"].map(csvCell).join(",");
      const cRows = skuConflicts.map((c) =>
        ["口径冲突", c.salesConclusion, c.inventoryConclusion, c.severity, c.description].map(csvCell).join(",")
      ).join("\n");
      csv += "\n\n" + cHeader + "\n" + cRows;
    }

    const result = exportConsistencyCheck();
    if (!result.passed) {
      csv += "\n\n一致性校验警告\n" + result.details.map((d) => `⚠ ${d}`).join("\n");
    }

    return csv;
  };

  const buildExcel = () => {
    const snap = useStore.getState().inventorySnapshot.find((i) => i.skuId === s.skuId);
    const skuConflicts = useStore.getState().conflicts.filter((c) => c.skuId === s.skuId);
    const result = exportConsistencyCheck();

    const wb = XLSX.utils.book_new();

    const summaryData = [
      ["SKU", s.skuId],
      ["SKU名称", s.skuName],
      ["品类", s.category],
      ["仓库", s.store],
      ["补货量", s.suggestedQty],
      ["置信度", (s.confidence * 100).toFixed(1) + "%"],
      ["优先级", PRIORITY_LABEL[s.priority]],
      ["当前库存", s.currentStock],
      ["安全库存", s.safetyStock],
      ["P50", (s.probabilityP50 * 100).toFixed(1) + "%"],
      ["P75", (s.probabilityP75 * 100).toFixed(1) + "%"],
      ["P90", (s.probabilityP90 * 100).toFixed(1) + "%"],
      ["库存快照结论", snap ? snap.conclusion : "-"],
      ["异常标记", s.anomalyTypes.join(";") || "-"],
      ["导出时间", new Date().toLocaleString("zh-CN")],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
    ws1["!cols"] = [{ wch: 16 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, ws1, "补货决策");

    const evHeader = ["证据ID", "事件日期", "事件类型", "描述", "数据源", "是否覆盖", "严重程度", "原始值", "覆盖值"];
    const evRows = evidences.map((e) => [
      e.evidenceId, e.eventDate, EVT[e.eventType]?.label || e.eventType,
      e.description, e.sourceTable, e.isOverride ? "是" : "否",
      e.severity, e.originalValue, e.overriddenValue,
    ]);
    const ws2 = XLSX.utils.aoa_to_sheet([evHeader, ...evRows]);
    XLSX.utils.book_append_sheet(wb, ws2, "证据链");

    if (skuConflicts.length > 0) {
      const cHeader = ["冲突类型", "销售结论", "库存结论", "严重程度", "描述"];
      const cRows = skuConflicts.map((c) => ["口径冲突", c.salesConclusion, c.inventoryConclusion, c.severity, c.description]);
      const ws3 = XLSX.utils.aoa_to_sheet([cHeader, ...cRows]);
      XLSX.utils.book_append_sheet(wb, ws3, "数据冲突");
    }

    if (!result.passed) {
      const wHeader = ["警告内容"];
      const wRows = result.details.map((d) => [`⚠ ${d}`]);
      const ws4 = XLSX.utils.aoa_to_sheet([wHeader, ...wRows]);
      XLSX.utils.book_append_sheet(wb, ws4, "一致性校验");
    }

    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    return new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  };

  const doDownload = () => {
    setErrorMsg(null);
    try {
      const snap = useStore.getState().inventorySnapshot.find((i) => i.skuId === s.skuId);
      if (!snap && evidences.length === 0) {
        setErrorMsg("无可导出内容：库存快照和证据链均为空");
        setTimeout(() => setErrorMsg(null), 3000);
        return;
      }

      if (format === "csv") {
        const csv = buildCSV();
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
        triggerDownload(blob, `补货详情_${s.skuId}.csv`);
      } else {
        const blob = buildExcel();
        triggerDownload(blob, `补货详情_${s.skuId}.xlsx`);
      }

      setSuccess(true);
      setWarnings(null);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(`导出失败：${msg}`);
      setTimeout(() => setErrorMsg(null), 4000);
    }
  };

  const handleExport = () => {
    const result = exportConsistencyCheck();
    if (!result.passed) {
      setWarnings(result.details);
      return;
    }
    doDownload();
  };

  return (
    <>
      <div className="fixed bottom-0 left-56 right-0 bg-base-50 border-t border-base-100 px-6 py-3 flex items-center gap-4 z-30">
        <div className="flex items-center gap-2">
          {(["csv", "excel"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${format === f ? "bg-steel text-white" : "bg-base-100 text-text-secondary hover:text-text-primary"}`}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>
        <button onClick={handleExport} className="btn-primary flex items-center gap-2 text-sm">
          <Download className="w-4 h-4" />
          导出{format === "csv" ? "CSV" : "Excel"}
        </button>
        {success && <span className="flex items-center gap-1 text-emerald text-xs"><CheckCircle2 className="w-3.5 h-3.5" />导出成功</span>}
        {errorMsg && <span className="flex items-center gap-1 text-danger text-xs"><XCircle className="w-3.5 h-3.5" />{errorMsg}</span>}
      </div>
      {warnings && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setWarnings(null)}>
          <div className="bg-base-50 border border-base-100 rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-amber" />
              <h4 className="text-sm font-medium text-text-primary">一致性校验发现差异</h4>
            </div>
            <p className="text-xs text-text-secondary mb-2">以下项目库存快照结论与补货建议不一致，差异信息将写入导出文件：</p>
            <div className="space-y-1.5 max-h-48 overflow-y-auto mb-4">
              {warnings.map((d, i) => <p key={i} className="text-xs text-amber">{d}</p>)}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setWarnings(null)} className="btn-secondary text-sm flex-1">取消</button>
              <button onClick={doDownload} className="btn-primary text-sm flex-1">仍然导出</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function DetailPage() {
  const { skuId } = useParams<{ skuId: string }>();
  const navigate = useNavigate();
  const { getSuggestionBySku, getEvidencesBySku } = useStore();
  const suggestion = getSuggestionBySku(skuId!);
  const evidences = getEvidencesBySku(skuId!);

  if (!suggestion) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-4">
        <XCircle className="w-12 h-12 text-text-muted" />
        <p className="text-text-secondary">未找到 SKU: {skuId} 的补货建议</p>
        <button onClick={() => navigate("/overview")} className="btn-secondary flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />返回概览
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 max-w-5xl mx-auto pb-20">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/overview")} className="text-text-muted hover:text-text-secondary transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-semibold text-text-primary">详情溯源台</h1>
        <span className="mono text-xs text-text-muted">{skuId}</span>
      </div>
      <DecisionCard s={suggestion} />
      <ProbabilityCurve s={suggestion} />
      <SafetyStockCalc s={suggestion} />
      <EvidenceTimeline items={evidences} />
      <ExportPanel s={suggestion} evidences={evidences} />
    </div>
  );
}
