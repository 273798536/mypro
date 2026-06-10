import { useEffect, useState, useMemo } from "react";
import { Search, Calendar, Filter, Plus, X, Loader2, ArrowRight, FlaskConical } from "lucide-react";
import { useStore, type CultivationRecord, type BatchTrace } from "@/store";
import { cn } from "@/lib/utils";

export default function CultivationRecords() {
  const { records, fetchRecords, createRecord, fetchBatchTrace } = useStore();

  const [batchSearch, setBatchSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [suppFilter, setSuppFilter] = useState<"" | "yes" | "no">("");
  const [showModal, setShowModal] = useState(false);
  const [tracePanel, setTracePanel] = useState<BatchTrace | null>(null);
  const [traceLoading, setTraceLoading] = useState(false);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (batchSearch && !r.batchNo.toLowerCase().includes(batchSearch.toLowerCase())) return false;
      if (dateFrom && r.measuredAt < dateFrom) return false;
      if (dateTo && r.measuredAt > dateTo + "T23:59:59") return false;
      if (suppFilter === "yes" && !r.isSupplementary) return false;
      if (suppFilter === "no" && r.isSupplementary) return false;
      return true;
    });
  }, [records, batchSearch, dateFrom, dateTo, suppFilter]);

  const handleBatchClick = async (batchNo: string) => {
    setTraceLoading(true);
    try {
      const trace = await fetchBatchTrace(batchNo);
      setTracePanel(trace);
    } catch {
      setTracePanel(null);
    } finally {
      setTraceLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-surface-dark/60 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-info" />
          <input
            type="text"
            value={batchSearch}
            onChange={(e) => setBatchSearch(e.target.value)}
            placeholder="搜索批号..."
            className="rounded-lg border border-surface-dark px-3 py-1.5 text-sm outline-none focus:border-primary"
          />
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-info" />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg border border-surface-dark px-3 py-1.5 text-sm outline-none focus:border-primary"
          />
          <span className="text-sm text-info">至</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg border border-surface-dark px-3 py-1.5 text-sm outline-none focus:border-primary"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-info" />
          <select
            value={suppFilter}
            onChange={(e) => setSuppFilter(e.target.value as typeof suppFilter)}
            className="rounded-lg border border-surface-dark px-3 py-1.5 text-sm outline-none focus:border-primary"
          >
            <option value="">全部记录</option>
            <option value="yes">仅补录</option>
            <option value="no">仅原始</option>
          </select>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="ml-auto flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-white hover:bg-primary-dark"
        >
          <Plus className="h-4 w-4" /> 新增记录
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-surface-dark/60 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-dark bg-surface">
                <th className="px-4 py-3 text-left font-medium text-info">样本编号</th>
                <th className="px-4 py-3 text-left font-medium text-info">试剂批号</th>
                <th className="px-4 py-3 text-left font-medium text-info">测量日期</th>
                <th className="px-4 py-3 text-left font-medium text-info">温度</th>
                <th className="px-4 py-3 text-left font-medium text-info">湿度</th>
                <th className="px-4 py-3 text-left font-medium text-info">光照</th>
                <th className="px-4 py-3 text-left font-medium text-info">营养液</th>
                <th className="px-4 py-3 text-left font-medium text-info">补录</th>
                <th className="px-4 py-3 text-left font-medium text-info">备注</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-info">
                    暂无培养记录
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => (
                  <tr
                    key={r.id}
                    className={cn(
                      "border-b border-surface-dark/50 transition-colors hover:bg-surface/60",
                      r.isSupplementary && "border-l-4 border-l-accent"
                    )}
                  >
                    <td className="px-4 py-3 text-primary-dark">{r.plantCode ?? r.plantId?.slice(0, 8)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleBatchClick(r.batchNo)}
                        className="text-info underline decoration-info/30 hover:text-primary"
                      >
                        {r.batchNo}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-primary-dark">{r.measuredAt?.slice(0, 10)}</td>
                    <td className="px-4 py-3 text-primary-dark">{r.temperature ?? "-"}°C</td>
                    <td className="px-4 py-3 text-primary-dark">{r.humidity ?? "-"}%</td>
                    <td className="px-4 py-3 text-primary-dark">{r.lightIntensity ?? "-"} lux</td>
                    <td className="px-4 py-3 text-primary-dark">{r.nutrientSolution ?? "-"}</td>
                    <td className="px-4 py-3">
                      {r.isSupplementary ? (
                        <span className="rounded bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">补录</span>
                      ) : (
                        <span className="text-xs text-info">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-info max-w-[150px] truncate">{r.note ?? "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <AddRecordModal onClose={() => setShowModal(false)} onSubmit={createRecord} />
      )}

      {tracePanel && (
        <TraceSlidePanel trace={tracePanel} onClose={() => setTracePanel(null)} />
      )}

      {traceLoading && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
    </div>
  );
}

function AddRecordModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (record: Partial<CultivationRecord>) => Promise<boolean>;
}) {
  const [form, setForm] = useState({
    groupId: "",
    plantId: "",
    batchNo: "",
    recordedAt: new Date().toISOString().slice(0, 16),
    measuredAt: new Date().toISOString().slice(0, 16),
    temperature: 25,
    humidity: 60,
    lightIntensity: 5000,
    nutrientSolution: "",
    isSupplementary: false,
    supplementaryTo: "",
    note: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      ...form,
      recordedAt: new Date(form.recordedAt).toISOString(),
      measuredAt: new Date(form.measuredAt).toISOString(),
      supplementaryTo: form.isSupplementary ? form.supplementaryTo : undefined,
      note: form.note || undefined,
    });
    onClose();
  };

  const set = (key: string, value: string | number | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="heading-font text-lg font-semibold text-primary-dark">新增培养记录</h3>
          <button onClick={onClose} className="text-info hover:text-primary-dark"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-info">实验组ID</label>
              <input required value={form.groupId} onChange={(e) => set("groupId", e.target.value)} className="w-full rounded-lg border border-surface-dark px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-info">样本编号</label>
              <input required value={form.plantId} onChange={(e) => set("plantId", e.target.value)} className="w-full rounded-lg border border-surface-dark px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-info">试剂批号</label>
              <input required value={form.batchNo} onChange={(e) => set("batchNo", e.target.value)} className="w-full rounded-lg border border-surface-dark px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-info">营养液</label>
              <input value={form.nutrientSolution} onChange={(e) => set("nutrientSolution", e.target.value)} className="w-full rounded-lg border border-surface-dark px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-info">温度 (°C)</label>
              <input type="number" step="0.1" value={form.temperature} onChange={(e) => set("temperature", Number(e.target.value))} className="w-full rounded-lg border border-surface-dark px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-info">湿度 (%)</label>
              <input type="number" step="0.1" value={form.humidity} onChange={(e) => set("humidity", Number(e.target.value))} className="w-full rounded-lg border border-surface-dark px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-info">光照 (lux)</label>
              <input type="number" value={form.lightIntensity} onChange={(e) => set("lightIntensity", Number(e.target.value))} className="w-full rounded-lg border border-surface-dark px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-info">记录时间</label>
              <input type="datetime-local" value={form.recordedAt} onChange={(e) => set("recordedAt", e.target.value)} className="w-full rounded-lg border border-surface-dark px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-info">测量时间</label>
            <input type="datetime-local" value={form.measuredAt} onChange={(e) => set("measuredAt", e.target.value)} className="w-full rounded-lg border border-surface-dark px-3 py-2 text-sm outline-none focus:border-primary" />
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-info">
              <input type="checkbox" checked={form.isSupplementary} onChange={(e) => set("isSupplementary", e.target.checked)} className="rounded border-surface-dark text-primary focus:ring-primary" />
              补录记录
            </label>
            {form.isSupplementary && (
              <input placeholder="补录至记录ID" value={form.supplementaryTo} onChange={(e) => set("supplementaryTo", e.target.value)} className="rounded-lg border border-surface-dark px-3 py-1.5 text-sm outline-none focus:border-primary" />
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-info">备注</label>
            <textarea value={form.note} onChange={(e) => set("note", e.target.value)} rows={2} className="w-full rounded-lg border border-surface-dark px-3 py-2 text-sm outline-none focus:border-primary" />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-lg border border-surface-dark px-4 py-2 text-sm text-info hover:bg-surface">取消</button>
            <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark">提交</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TraceSlidePanel({ trace, onClose }: { trace: BatchTrace; onClose: () => void }) {
  const primaryConclusion = trace.conclusions?.[0];
  const conclusionStatus = primaryConclusion?.conclusionStatus ?? "pending";
  const conclusionText = primaryConclusion?.conclusion ?? null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20" onClick={onClose}>
      <div className="w-full max-w-md overflow-auto bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h3 className="heading-font text-lg font-semibold text-primary-dark">
            批号追溯: {trace.batchNo}
          </h3>
          <button onClick={onClose} className="text-info hover:text-primary-dark"><X className="h-5 w-5" /></button>
        </div>

        <div className="mb-5 flex items-center gap-2 rounded-xl bg-surface p-3 text-sm">
          <FlaskConical className="h-4 w-4 text-primary" />
          <span className="font-medium text-primary-dark">{trace.batchNo}</span>
          <ArrowRight className="h-3 w-3 text-info" />
          <span className="text-info">{trace.records.length} 条记录</span>
          <ArrowRight className="h-3 w-3 text-info" />
          <span className="text-info">{trace.measurements.length} 次测量</span>
          <ArrowRight className="h-3 w-3 text-info" />
          <span className={cn(
            "rounded px-1.5 py-0.5 text-xs font-medium",
            conclusionStatus === "normal" ? "bg-primary-light/15 text-primary" :
            conclusionStatus === "abnormal" ? "bg-accent/15 text-accent" :
            "bg-pending/15 text-pending"
          )}>
            {conclusionStatus === "normal" ? "正常" : conclusionStatus === "abnormal" ? "异常" : "待定"}
          </span>
        </div>

        <div className="mb-5">
          <h4 className="mb-2 text-sm font-semibold text-primary-dark">培养记录</h4>
          <div className="space-y-2">
            {trace.records.map((r) => (
              <div key={r.id} className="rounded-xl border border-surface-dark/60 p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-primary-dark">{r.plantCode ?? r.plantId?.slice(0, 8)}</span>
                  {r.isSupplementary && <span className="rounded bg-accent/15 px-1.5 py-0.5 text-accent">补录</span>}
                </div>
                <div className="mt-1 text-info">
                  {r.temperature ?? "-"}°C / {r.humidity ?? "-"}% / {r.lightIntensity ?? "-"} lux
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-5">
          <h4 className="mb-2 text-sm font-semibold text-primary-dark">测量数据</h4>
          <div className="max-h-48 space-y-1 overflow-auto">
            {trace.measurements.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-lg px-3 py-1.5 text-xs hover:bg-surface">
                <span className="text-primary-dark">第{m.dayIndex}天 - {m.plantCode ?? m.plantId?.slice(0, 8)}</span>
                <span className="text-info">高度: {m.height}cm</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-surface-dark/60 p-4">
          <h4 className="mb-2 text-sm font-semibold text-primary-dark">结论</h4>
          <div className="mb-2 flex items-center gap-2">
            <span className="text-xs text-info">状态:</span>
            <span className={cn(
              "rounded px-1.5 py-0.5 text-xs font-medium",
              conclusionStatus === "normal" ? "bg-primary-light/15 text-primary" :
              conclusionStatus === "abnormal" ? "bg-accent/15 text-accent" :
              "bg-pending/15 text-pending"
            )}>
              {conclusionStatus === "normal" ? "正常" : conclusionStatus === "abnormal" ? "异常" : "待定"}
            </span>
          </div>
          <p className="text-sm text-primary-dark">{conclusionText ?? "暂无结论"}</p>
        </div>
      </div>
    </div>
  );
}
