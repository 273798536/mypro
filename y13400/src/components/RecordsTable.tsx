import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Paperclip,
  AlertOctagon,
  GitBranch,
  FileWarning,
  Image as ImageIcon,
  RefreshCw,
  Check,
  StickyNote,
  Download,
  Trash2,
  Plus,
  Clock,
  X,
} from "lucide-react";
import { useTopologyStore, statusLabel, statusColor, changeSourceLabel, changeSourceColor } from "../store/topologyStore";
import type { TopologyRecord, ProcessingStatus, ScreenshotRef } from "../types/topology";
import { useMemo } from "react";

const statusOptions: Array<{ v: ProcessingStatus; l: string }> = [
  { v: "pending", l: "待复核" },
  { v: "verified", l: "已通过" },
  { v: "warning", l: "需关注" },
  { v: "error", l: "有问题" },
  { v: "re_run", l: "待重跑" },
];

export default function RecordsTable() {
  const {
    getFilteredRecords,
    expandedRecordId,
    toggleExpand,
    selectedRecordIds,
    toggleSelect,
    selectAll,
    clearSelection,
    exportCSV,
  } = useTopologyStore();

  const filtered = useMemo(() => getFilteredRecords(), [getFilteredRecords]);
  const allSelected =
    filtered.length > 0 && filtered.every((r) => selectedRecordIds.includes(r.id));

  const handleExport = () => {
    const csv = useTopologyStore.getState().exportCSV();
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    a.href = url;
    a.download = `拓扑路径课堂验算_导出_${ts}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-indigo-500" />
          <h2 className="text-sm font-semibold text-slate-800">验算明细表</h2>
          <span className="text-xs text-slate-500">
            共 {filtered.length} 条 · 所有字段与统计卡片来自同一批计算结果
          </span>
          {selectedRecordIds.length > 0 && (
            <span className="text-xs inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              已选 {selectedRecordIds.length} 条
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selectedRecordIds.length > 0 && (
            <button
              onClick={clearSelection}
              className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-xs border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              <Trash2 className="h-3.5 w-3.5" /> 清空选择
            </button>
          )}
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs bg-slate-900 text-white hover:bg-slate-800 shadow-sm"
          >
            <Download className="h-3.5 w-3.5" /> 导出当前结果 CSV
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50/70 text-slate-500 text-xs border-b border-slate-100">
              <th className="w-10 py-2.5 pl-4">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() =>
                    allSelected
                      ? clearSelection()
                      : selectAll(filtered.map((r) => r.id))
                  }
                  className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
              </th>
              <th className="w-8 py-2.5"></th>
              <th className="py-2.5 pr-3 text-left font-medium">样本编号</th>
              <th className="py-2.5 pr-3 text-left font-medium">路径 / 拓扑</th>
              <th className="py-2.5 pr-3 text-right font-medium">实测值</th>
              <th className="py-2.5 pr-3 text-right font-medium">参考值</th>
              <th className="py-2.5 pr-3 text-right font-medium">偏差率</th>
              <th className="py-2.5 pr-3 text-left font-medium">参数版本</th>
              <th className="py-2.5 pr-3 text-left font-medium">材料批次</th>
              <th className="py-2.5 pr-3 text-left font-medium">变化来源</th>
              <th className="py-2.5 pr-3 text-left font-medium">状态</th>
              <th className="py-2.5 pr-3 text-left font-medium">操作人</th>
              <th className="py-2.5 pr-4 text-center font-medium">附件/重跑</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={13} className="text-center py-10 text-slate-400 text-sm">
                  筛选条件下没有匹配的记录 ·
                  <button
                    onClick={() => useTopologyStore.getState().resetFilters()}
                    className="ml-1 text-indigo-600 hover:underline"
                  >
                    重置筛选
                  </button>
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <RecordRow key={r.id} record={r} allChecked={allSelected} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RecordRow({ record, allChecked }: { record: TopologyRecord; allChecked: boolean }) {
  const { expandedRecordId, toggleExpand, selectedRecordIds, toggleSelect } =
    useTopologyStore();
  const open = expandedRecordId === record.id;
  const checked = selectedRecordIds.includes(record.id);
  const idConflict = record.sampleNo !== record.declaredSampleNo;
  const versionConflict = record.parameterVersion !== record.declaredParameterVersion;
  const hasLate = record.attachments.some((a) => a.type === "late");
  const reruns = Math.max(0, record.runHistory.length - 1);

  const deviationTone =
    record.deviationPct >= 20
      ? "text-rose-600 font-semibold"
      : record.deviationPct >= 5
        ? "text-amber-600 font-medium"
        : "text-slate-700";

  return (
    <>
      <tr
        id={`row-${record.id}`}
        className={`group transition-colors ${
          checked ? "bg-indigo-50/40" : "hover:bg-slate-50/70"
        } ${idConflict || hasLate ? "bg-amber-50/30" : ""}`}
      >
        <td className="py-2.5 pl-4 align-top">
          <input
            type="checkbox"
            checked={checked || (allChecked && !idConflict && false)}
            onChange={() => toggleSelect(record.id)}
            className="h-3.5 w-3.5 mt-1 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
        </td>
        <td className="py-2.5 align-top">
          <button
            onClick={() => toggleExpand(record.id)}
            className="h-6 w-6 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </td>
        <td className="py-2.5 pr-3 align-top">
          <div className="flex items-start gap-1.5">
            <div>
              <div className="font-mono text-xs text-slate-900">{record.sampleNo}</div>
              {idConflict && (
                <div className="mt-0.5 flex items-center gap-1 text-[11px] text-amber-700">
                  <AlertOctagon className="h-3 w-3" />
                  登记表：<span className="font-mono">{record.declaredSampleNo}</span>
                </div>
              )}
            </div>
          </div>
        </td>
        <td className="py-2.5 pr-3 align-top">
          <div className="text-xs font-mono text-slate-500">{record.pathCode}</div>
          <div className="text-sm text-slate-800">{record.topologyName}</div>
        </td>
        <td className="py-2.5 pr-3 align-top text-right tabular-nums">
          <div className="text-sm text-slate-900">
            {record.measuredValue.toFixed(2)}
            <span className="text-xs text-slate-400 ml-1">{record.unit}</span>
          </div>
          <div className="text-[11px] text-slate-400">{record.collectedAt.slice(11)}</div>
        </td>
        <td className="py-2.5 pr-3 align-top text-right tabular-nums text-sm text-slate-600">
          {record.referenceValue.toFixed(2)}
        </td>
        <td className={`py-2.5 pr-3 align-top text-right tabular-nums text-sm ${deviationTone}`}>
          <div>
            {record.deviation > 0 ? "+" : ""}
            {record.deviation.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-400">
            {record.deviationPct.toFixed(2)}%
          </div>
        </td>
        <td className="py-2.5 pr-3 align-top">
          <div className="flex items-center gap-1">
            <span className="text-xs font-mono text-slate-800">{record.parameterVersion}</span>
            {versionConflict && (
              <span
                title={`登记版本：${record.declaredParameterVersion}`}
                className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-700 border border-cyan-200"
              >
                登记 {record.declaredParameterVersion}
              </span>
            )}
          </div>
        </td>
        <td className="py-2.5 pr-3 align-top">
          <span className="text-xs font-mono text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
            {record.materialBatch}
          </span>
        </td>
        <td className="py-2.5 pr-3 align-top">
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] ring-1 ring-inset ${changeSourceColor(record.changeSource)}`}
          >
            {changeSourceLabel(record.changeSource)}
          </span>
        </td>
        <td className="py-2.5 pr-3 align-top">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ring-1 ring-inset ${statusColor(record.status)}`}
          >
            {statusLabel(record.status)}
          </span>
        </td>
        <td className="py-2.5 pr-3 align-top text-xs text-slate-600">
          {record.operator}
        </td>
        <td className="py-2.5 pr-4 align-top">
          <div className="flex items-center justify-center gap-1.5">
            <div
              className={`inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded border ${
                hasLate
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-slate-50 text-slate-600 border-slate-200"
              }`}
              title={record.attachments.map((a) => a.name).join("\n") || "无附件"}
            >
              <Paperclip className="h-3 w-3" />
              {record.attachments.length}
            </div>
            {reruns > 0 && (
              <div
                className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded border bg-indigo-50 text-indigo-700 border-indigo-200"
              >
                <RefreshCw className="h-3 w-3" />
                {reruns}
              </div>
            )}
            {idConflict && (
              <div className="inline-flex items-center text-[11px] px-1.5 py-0.5 rounded border bg-rose-50 text-rose-700 border-rose-200">
                <FileWarning className="h-3 w-3" />
              </div>
            )}
          </div>
        </td>
      </tr>
      {open && (
        <tr className="bg-slate-50/50 border-b border-slate-100">
          <td colSpan={13} className="px-4 py-4">
            <RecordDetail record={record} />
          </td>
        </tr>
      )}
    </>
  );
}

function RecordDetail({ record }: { record: TopologyRecord }) {
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div className="space-y-3">
        <ChangeExplainBlock record={record} />
        <FieldNotesBlock record={record} />
        <AttachmentsBlock record={record} />
      </div>
      <div className="space-y-3">
        <ManualNoteBlock record={record} />
        <StatusBlock record={record} />
        <RunHistoryBlock record={record} />
      </div>
    </div>
  );
}

function ChangeExplainBlock({ record }: { record: TopologyRecord }) {
  const sourceStyle = changeSourceColor(record.changeSource);
  const icons: Record<string, React.ElementType> = {
    unit: GitBranch,
    parameter: FileWarning,
    sample: Check,
    unknown: AlertOctagon,
  };
  const Icon = icons[record.changeSource] || AlertOctagon;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold text-slate-700">
          结果解释 · 变化来源追溯
        </div>
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] ring-1 ring-inset ${sourceStyle}`}>
          <Icon className="h-3 w-3" /> {changeSourceLabel(record.changeSource)}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-[11px] mb-2">
        <div className="rounded-md bg-slate-50 p-2">
          <div className="text-slate-500">实测</div>
          <div className="text-slate-800 tabular-nums font-mono mt-0.5">
            {record.measuredValue} {record.unit}
          </div>
        </div>
        <div className="rounded-md bg-slate-50 p-2">
          <div className="text-slate-500">参考</div>
          <div className="text-slate-800 tabular-nums font-mono mt-0.5">
            {record.referenceValue} {record.unit}
          </div>
        </div>
        <div className="rounded-md bg-slate-50 p-2">
          <div className="text-slate-500">偏差率</div>
          <div className={`tabular-nums font-mono mt-0.5 ${
            record.deviationPct >= 20 ? "text-rose-600" : record.deviationPct >= 5 ? "text-amber-600" : "text-emerald-600"
          }`}>
            {record.deviationPct.toFixed(2)}%
          </div>
        </div>
      </div>
      <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
        {record.changeExplanation}
      </p>
      <p className="mt-2 text-[11px] text-slate-400 italic">
        * 后续抽查通常先从本解释区追踪差异是来自单位换算、参数版本切换还是样本本身。
      </p>
    </div>
  );
}

function FieldNotesBlock({ record }: { record: TopologyRecord }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold text-slate-700">现场说明</div>
        <div className="text-[11px] text-slate-400">
          采集 {record.collectedAt.slice(11)} · 到场 {record.receivedAt.slice(11)} · 来源 {record.sourceSystem}
        </div>
      </div>
      <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap min-h-[1.5rem]">
        {record.fieldNotes || "（无）"}
      </p>
    </div>
  );
}

function AttachmentsBlock({ record }: { record: TopologyRecord }) {
  const typeMap: Record<string, { label: string; cls: string }> = {
    parameter: { label: "参数文件", cls: "bg-cyan-50 text-cyan-700 border-cyan-200" },
    screenshot: { label: "截图", cls: "bg-sky-50 text-sky-700 border-sky-200" },
    supplement: { label: "补录", cls: "bg-violet-50 text-violet-700 border-violet-200" },
    late: { label: "晚到", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  };
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
          <Paperclip className="h-3.5 w-3.5" /> 附件清单（{record.attachments.length}）
        </div>
      </div>
      {record.attachments.length === 0 ? (
        <div className="text-xs text-slate-400">无附件</div>
      ) : (
        <ul className="space-y-1.5">
          {record.attachments.map((a) => {
            const t = typeMap[a.type] || typeMap.parameter;
            return (
              <li
                key={a.id}
                className="flex items-start gap-2 rounded-md border border-slate-100 bg-slate-50/50 p-2"
              >
                <div className={`text-[10px] px-1.5 py-0.5 rounded border ${t.cls} flex-shrink-0`}>
                  {t.label}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-slate-800 font-mono truncate">{a.name}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {a.receivedAt.slice(11)} 到场
                    {a.note ? ` · ${a.note}` : ""}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ManualNoteBlock({ record }: { record: TopologyRecord }) {
  const { updateManualNote } = useTopologyStore();
  const [draft, setDraft] = useState(record.manualNote);
  const [dirty, setDirty] = useState(false);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
          <StickyNote className="h-3.5 w-3.5" /> 人工备注
        </div>
        {dirty && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                setDraft(record.manualNote);
                setDirty(false);
              }}
              className="text-[11px] px-2 py-0.5 rounded border border-slate-200 text-slate-500 hover:bg-slate-50"
            >
              还原
            </button>
            <button
              onClick={() => {
                updateManualNote(record.id, draft);
                setDirty(false);
              }}
              className="text-[11px] px-2 py-0.5 rounded bg-indigo-600 text-white hover:bg-indigo-700 inline-flex items-center gap-1"
            >
              <Check className="h-3 w-3" /> 保存
            </button>
          </div>
        )}
      </div>
      <textarea
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          setDirty(true);
        }}
        rows={3}
        placeholder="输入复核备注、结论、遗留问题等，保存后将同步到本记录。"
        className="w-full text-xs rounded-md border border-slate-200 p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 resize-none"
      />
    </div>
  );
}

function StatusBlock({ record }: { record: TopologyRecord }) {
  const { updateStatus } = useTopologyStore();
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold text-slate-700">处理状态（直接变更）</div>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ring-1 ring-inset ${statusColor(record.status)}`}>
          当前：{statusLabel(record.status)}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {statusOptions.map((o) => (
          <button
            key={o.v}
            onClick={() => updateStatus(record.id, o.v)}
            className={`text-[11px] px-2 py-1 rounded-md border transition ${
              record.status === o.v
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {o.l}
          </button>
        ))}
      </div>
    </div>
  );
}

function RunHistoryBlock({ record }: { record: TopologyRecord }) {
  const [showForm, setShowForm] = useState(false);
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> 重跑历史
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="text-[11px] px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 inline-flex items-center gap-1"
        >
          {showForm ? (
            <>
              <X className="h-3 w-3" /> 取消
            </>
          ) : (
            <>
              <Plus className="h-3 w-3" /> 登记一次重跑
            </>
          )}
        </button>
      </div>

      {showForm && (
        <ReRunForm recordId={record.id} onDone={() => setShowForm(false)} />
      )}

      {record.runHistory.length === 0 ? (
        <div className="text-xs text-slate-400 flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" /> 尚未执行验算
        </div>
      ) : (
        <ol className="relative border-l border-slate-200 ml-2 space-y-3">
          {record.runHistory.map((run, i) => (
            <li key={run.runId} className="pl-4">
              <span className="absolute -left-[7px] flex items-center justify-center h-3.5 w-3.5 rounded-full bg-white border-2 border-slate-300" />
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] ring-1 ring-inset ${statusColor(run.status)}`}>
                  {statusLabel(run.status)}
                </span>
                <span className="text-[11px] font-mono text-slate-500">{run.runId}</span>
                <span className="text-[11px] text-slate-400">
                  {run.runAt} · {run.operator}
                </span>
              </div>
              {run.diffSummary && (
                <div className="mt-1 text-[11px] text-indigo-700 bg-indigo-50/60 border border-indigo-100 rounded px-2 py-1">
                  {run.diffSummary}
                </div>
              )}
              <div className="mt-1 text-xs text-slate-600 whitespace-pre-wrap">
                {run.note || "（无备注）"}
              </div>
              {run.screenshots.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {run.screenshots.map((sc) => (
                    <div
                      key={sc.id}
                      title={sc.description}
                      className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border border-sky-200 bg-sky-50 text-sky-700"
                    >
                      <ImageIcon className="h-3 w-3" />
                      {sc.name}
                      <span className="text-sky-500">· {sc.timestamp.slice(11)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-1 text-[10px] text-slate-400">
                #{i + 1} 次 · 状态 ↔ 备注 ↔ 截图 三者已关联对齐
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function ReRunForm({ recordId, onDone }: { recordId: string; onDone: () => void }) {
  const { addReRun } = useTopologyStore();
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<ProcessingStatus>("verified");
  const [diff, setDiff] = useState("");
  const [shots, setShots] = useState<ScreenshotRef[]>([]);
  const [scName, setScName] = useState("");
  const [scDesc, setScDesc] = useState("");

  const addShot = () => {
    if (!scName.trim()) return;
    const now = new Date();
    const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
    const id = `SC-${Date.now()}`;
    setShots((p) => [...p, { id, name: scName.trim(), timestamp: ts, description: scDesc.trim() }]);
    setScName("");
    setScDesc("");
  };

  const removeShot = (id: string) =>
    setShots((p) => p.filter((x) => x.id !== id));

  const submit = () => {
    addReRun(recordId, note.trim(), status, shots, diff.trim() || undefined);
    onDone();
  };

  return (
    <div className="rounded-lg border border-indigo-200 bg-indigo-50/40 p-3 mb-3">
      <div className="text-[11px] text-indigo-700 mb-2">
        登记重跑：提交后，<b>处理状态 → 人工备注 → 截图说明</b> 三者会写入同一条历史，后续抽查可一一对应。
      </div>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div>
          <label className="text-[11px] text-slate-500 mb-1 block">结果状态</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ProcessingStatus)}
            className="w-full h-8 px-2 rounded border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          >
            {statusOptions.map((o) => (
              <option key={o.v} value={o.v}>
                {o.l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[11px] text-slate-500 mb-1 block">
            本次重跑差异摘要（可选）
          </label>
          <input
            value={diff}
            onChange={(e) => setDiff(e.target.value)}
            placeholder="如：偏差率 22.8%→2.59%"
            className="w-full h-8 px-2 rounded border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
        </div>
      </div>
      <div className="mb-2">
        <label className="text-[11px] text-slate-500 mb-1 block">人工备注</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="写下本次重跑的操作、依据、结论"
          className="w-full px-2 py-1.5 rounded border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none"
        />
      </div>
      <div className="mb-2">
        <label className="text-[11px] text-slate-500 mb-1 block">
          关联截图说明（模拟上传）
        </label>
        <div className="flex gap-1.5 mb-1.5">
          <input
            value={scName}
            onChange={(e) => setScName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addShot())}
            placeholder="截图文件名，如：复测曲线对比.png"
            className="flex-1 h-7 px-2 rounded border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
          <input
            value={scDesc}
            onChange={(e) => setScDesc(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addShot())}
            placeholder="说明（可选）"
            className="flex-1 h-7 px-2 rounded border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
          <button
            onClick={addShot}
            className="h-7 px-2 rounded bg-white border border-slate-200 text-xs text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1"
          >
            <Plus className="h-3 w-3" /> 添加
          </button>
        </div>
        {shots.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {shots.map((s) => (
              <span
                key={s.id}
                className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200"
              >
                <ImageIcon className="h-3 w-3" />
                {s.name}
                {s.description && <span className="text-sky-500">· {s.description}</span>}
                <button
                  onClick={() => removeShot(s.id)}
                  className="text-sky-400 hover:text-rose-500 ml-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex justify-end gap-1.5">
        <button
          onClick={onDone}
          className="h-7 px-2.5 rounded border border-slate-200 text-xs text-slate-600 hover:bg-white"
        >
          取消
        </button>
        <button
          onClick={submit}
          className="h-7 px-3 rounded bg-slate-900 text-white text-xs hover:bg-slate-800 inline-flex items-center gap-1"
        >
          <RefreshCw className="h-3 w-3" /> 写入历史
        </button>
      </div>
    </div>
  );
}
