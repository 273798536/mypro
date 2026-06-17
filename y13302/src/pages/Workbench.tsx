import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Undo2,
  Camera,
  AlertTriangle,
  StickyNote,
  Eye,
  Edit3,
  FileText,
  Send,
  RotateCcw,
  Layers,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import type { SourceType, WorkOrder } from "@/types";
import { StatusTag, SourceTag, WeightTag } from "@/components/StatusTag/StatusTag";
import ThresholdAlert from "@/components/ThresholdAlert/ThresholdAlert";
import { formatDate, sourceTypeLabel, diffWords } from "@/utils/helpers";
import { cn } from "@/lib/utils";

type Filter = SourceType | "all";

const filters: { key: Filter; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "online_ticket", label: "线上工单" },
  { key: "anomaly", label: "异常样本" },
  { key: "supplement", label: "后补说明" },
];

export default function Workbench() {
  const init = useAppStore((s) => s.init);
  const data = useAppStore((s) => s.data);
  const selectedOrderId = useAppStore((s) => s.selectedOrderId);
  const setSelectedOrderId = useAppStore((s) => s.setSelectedOrderId);
  const confirmOrder = useAppStore((s) => s.confirmOrder);
  const revokeOrder = useAppStore((s) => s.revokeOrder);
  const addScreenshot = useAppStore((s) => s.addScreenshot);
  const addSupplementNote = useAppStore((s) => s.addSupplementNote);

  const [filter, setFilter] = useState<Filter>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending">("pending");
  const [editedSummary, setEditedSummary] = useState("");
  const [note, setNote] = useState("");
  const [shotDesc, setShotDesc] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteOperator, setNoteOperator] = useState("周姐");

  useEffect(() => {
    init();
  }, [init]);

  const list = useMemo(() => {
    let res = data.work_orders.slice();
    if (filter !== "all") res = res.filter((o) => o.source_type === filter);
    if (statusFilter !== "all") res = res.filter((o) => o.status === statusFilter);
    return res.sort(
      (a, b) =>
        b.impact_weight - a.impact_weight ||
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [data.work_orders, filter, statusFilter]);

  const selected: WorkOrder | undefined = useMemo(
    () => data.work_orders.find((o) => o.id === selectedOrderId) ?? list[0],
    [data.work_orders, selectedOrderId, list]
  );

  useEffect(() => {
    if (selected) setEditedSummary(selected.confirmed_summary ?? selected.model_summary);
  }, [selected?.id]);

  const shots = selected
    ? data.screenshots.filter((s) => s.order_id === selected.id)
    : [];
  const notes = selected
    ? data.supplement_notes
        .filter((n) => n.order_id === selected.id)
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
    : [];
  const history = selected
    ? data.review_records.filter((r) => r.order_id === selected.id)
    : [];

  const currentIndex = list.findIndex((o) => o.id === selected?.id);
  const goPrev = () => {
    if (currentIndex > 0) setSelectedOrderId(list[currentIndex - 1].id);
  };
  const goNext = () => {
    if (currentIndex < list.length - 1)
      setSelectedOrderId(list[currentIndex + 1].id);
  };

  const doConfirm = () => {
    if (!selected) return;
    confirmOrder(
      selected.id,
      editedSummary.trim() || selected.model_summary,
      "周姐",
      note.trim() || "人工确认改判通过。"
    );
    setNote("");
  };

  const doRevoke = () => {
    if (!selected) return;
    if (!window.confirm("确定要撤回此工单的确认操作吗？将退回待处理状态。")) return;
    revokeOrder(
      selected.id,
      "周姐",
      note.trim() || "人工撤回，原因：需进一步核对关联工单。"
    );
    setNote("");
  };

  const doAddScreenshot = () => {
    if (!selected) return;
    if (!shotDesc.trim()) {
      alert("请填写截图说明");
      return;
    }
    const prompt = encodeURIComponent(
      shotDesc +
        ", customer service software interface screenshot, desktop UI, light theme, clean enterprise design"
    );
    addScreenshot(
      selected.id,
      `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${prompt}&image_size=landscape_4_3`,
      shotDesc.trim()
    );
    setShotDesc("");
  };

  const doAddNote = () => {
    if (!selected) return;
    if (!noteContent.trim()) {
      alert("请填写后补说明内容");
      return;
    }
    addSupplementNote(selected.id, noteContent.trim(), noteOperator.trim());
    setNoteContent("");
  };

  const diff =
    selected && editedSummary
      ? diffWords(selected.model_summary, editedSummary)
      : null;

  if (!selected) {
    return (
      <div className="card p-16 text-center">
        <FileText className="w-16 h-16 text-navy-200 mx-auto mb-4" strokeWidth={1.5} />
        <p className="text-navy-500">暂无待处理工单</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-4 animate-fade-in-up">
        <div>
          <p className="text-sm text-navy-500">逐条审阅 · 确认 / 撤回 / 截图说明</p>
          <h2 className="mt-1 text-2xl font-serif font-semibold text-navy-800">
            人工改判工作台
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goPrev}
            disabled={currentIndex <= 0}
            className="btn-secondary !px-3 disabled:opacity-40"
            title="上一条"
          >
            <ChevronLeft className="w-4 h-4" strokeWidth={2} />
          </button>
          <span className="text-sm text-navy-600 font-mono min-w-[70px] text-center">
            {currentIndex + 1} / {list.length}
          </span>
          <button
            onClick={goNext}
            disabled={currentIndex >= list.length - 1}
            className="btn-secondary !px-3 disabled:opacity-40"
            title="下一条"
          >
            <ChevronRight className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>
      </header>

      {selected.threshold_affected && <ThresholdAlert compact />}

      <div className="grid grid-cols-12 gap-5">
        {/* 左侧列表 */}
        <aside className="col-span-12 md:col-span-3 card overflow-hidden animate-fade-in-up stagger-1">
          <div className="p-3 border-b border-navy-50 space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {filters.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={cn(
                    "chip cursor-pointer transition",
                    filter === f.key
                      ? "bg-navy-600 text-white"
                      : "bg-navy-50 text-navy-600 hover:bg-navy-100"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => setStatusFilter("pending")}
                className={cn(
                  "chip cursor-pointer transition flex-1 justify-center",
                  statusFilter === "pending"
                    ? "bg-amber-500 text-white"
                    : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                )}
              >
                待处理
              </button>
              <button
                onClick={() => setStatusFilter("all")}
                className={cn(
                  "chip cursor-pointer transition flex-1 justify-center",
                  statusFilter === "all"
                    ? "bg-navy-600 text-white"
                    : "bg-navy-50 text-navy-600 hover:bg-navy-100"
                )}
              >
                全部
              </button>
            </div>
          </div>
          <div className="max-h-[calc(100vh-260px)] overflow-y-auto scrollbar-thin">
            <ul className="divide-y divide-navy-50">
              {list.length === 0 && (
                <li className="p-8 text-center text-xs text-navy-400">
                  没有符合条件的工单
                </li>
              )}
              {list.map((o) => {
                const active = o.id === selected.id;
                return (
                  <li key={o.id}>
                    <button
                      onClick={() => setSelectedOrderId(o.id)}
                      className={cn(
                        "w-full text-left p-3 transition",
                        active
                          ? "bg-navy-50 border-l-4 border-l-navy-600"
                          : "hover:bg-navy-50/60 border-l-4 border-l-transparent"
                      )}
                    >
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <StatusTag status={o.status} className="!text-[10px] !px-2 !py-0" />
                        {o.threshold_affected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse-soft" />
                        )}
                      </div>
                      <p
                        className={cn(
                          "text-xs font-medium line-clamp-2 leading-snug",
                          active ? "text-navy-800" : "text-navy-600"
                        )}
                      >
                        {o.title}
                      </p>
                      <div className="mt-1.5 flex items-center justify-between">
                        <span className="text-[10px] text-navy-400 font-mono">
                          {(o.impact_weight).toFixed(1)}
                        </span>
                        <span className="text-[10px] text-navy-400">
                          {sourceTypeLabel(o.source_type)}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>

        {/* 中间详情 */}
        <section className="col-span-12 md:col-span-6 space-y-5 animate-fade-in-up stagger-2">
          <article className="card overflow-hidden">
            <header className="p-5 border-b border-navy-50 bg-gradient-to-r from-navy-50/60 to-transparent">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusTag status={selected.status} />
                  <SourceTag source={selected.source_type} />
                  <WeightTag weight={selected.impact_weight} />
                  {selected.material_name && (
                    <span className="chip bg-crimson-50 text-crimson-700 border border-crimson-200/60">
                      <AlertTriangle
                        className="w-3 h-3"
                        strokeWidth={2}
                      />
                      原名：{selected.material_name}
                    </span>
                  )}
                </div>
                <div className="text-xs text-navy-400 font-mono">
                  置信度 {(selected.confidence * 100).toFixed(0)}% ·{" "}
                  {formatDate(selected.created_at)}
                </div>
              </div>
              <h3 className="font-serif font-semibold text-navy-800 text-lg leading-snug">
                {selected.title}
              </h3>
            </header>

            <div className="p-5 space-y-5">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-navy-50 flex items-center justify-center">
                    <FileText
                      className="w-3.5 h-3.5 text-navy-600"
                      strokeWidth={1.75}
                    />
                  </div>
                  <h4 className="text-xs font-semibold text-navy-700 uppercase tracking-wide">
                    工单原文
                  </h4>
                </div>
                <div className="rounded-xl bg-navy-50/50 border border-navy-100 p-4 text-sm text-navy-700 leading-relaxed whitespace-pre-wrap">
                  {selected.content}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-moss-50 flex items-center justify-center">
                      <Edit3
                        className="w-3.5 h-3.5 text-moss-600"
                        strokeWidth={1.75}
                      />
                    </div>
                    <h4 className="text-xs font-semibold text-navy-700 uppercase tracking-wide">
                      人工改判摘要（可编辑）
                    </h4>
                  </div>
                  <button
                    onClick={() =>
                      setEditedSummary(selected.model_summary)
                    }
                    className="text-[11px] text-navy-500 hover:text-navy-700 flex items-center gap-1 transition"
                  >
                    <RotateCcw
                      className="w-3 h-3"
                      strokeWidth={2}
                    />
                    还原模型摘要
                  </button>
                </div>
                <textarea
                  value={editedSummary}
                  onChange={(e) => setEditedSummary(e.target.value)}
                  className="input-field min-h-[100px] resize-y text-sm leading-relaxed !font-sans"
                  placeholder="在此修改摘要，确认后将作为人工改判的最终结论..."
                />
                {diff &&
                  (diff.beforeHtml !== diff.afterHtml) &&
                  editedSummary !== selected.model_summary && (
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs animate-slide-in">
                      <div className="rounded-lg bg-crimson-50/50 border border-crimson-100 p-3">
                        <p className="text-[10px] font-semibold text-crimson-700 uppercase tracking-wide mb-1.5">
                          模型摘要原文
                        </p>
                        <p
                          className="text-crimson-900/80 leading-relaxed"
                          dangerouslySetInnerHTML={{
                            __html: diff.beforeHtml,
                          }}
                        />
                      </div>
                      <div className="rounded-lg bg-moss-50/60 border border-moss-100 p-3">
                        <p className="text-[10px] font-semibold text-moss-700 uppercase tracking-wide mb-1.5">
                          人工修改后
                        </p>
                        <p
                          className="text-navy-800 leading-relaxed"
                          dangerouslySetInnerHTML={{
                            __html: diff.afterHtml,
                          }}
                        />
                      </div>
                    </div>
                  )}
              </div>

              {shots.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-lg bg-navy-50 flex items-center justify-center">
                      <Camera
                        className="w-3.5 h-3.5 text-navy-600"
                        strokeWidth={1.75}
                      />
                    </div>
                    <h4 className="text-xs font-semibold text-navy-700 uppercase tracking-wide">
                      截图说明（{shots.length}）
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {shots.map((s, i) => (
                      <figure
                        key={s.id}
                        className="rounded-xl overflow-hidden border border-navy-100 bg-white group"
                      >
                        <div className="aspect-[4/3] bg-navy-50 overflow-hidden relative">
                          <img
                            src={s.url}
                            alt={s.description}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                          <span className="absolute top-2 left-2 chip bg-black/60 text-white backdrop-blur-sm">
                            #{i + 1}
                          </span>
                        </div>
                        <figcaption className="p-2.5 text-xs text-navy-600">
                          {s.description}
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                </div>
              )}

              {notes.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center">
                      <StickyNote
                        className="w-3.5 h-3.5 text-purple-600"
                        strokeWidth={1.75}
                      />
                    </div>
                    <h4 className="text-xs font-semibold text-navy-700 uppercase tracking-wide">
                      后补说明（{notes.length}）
                    </h4>
                  </div>
                  <ul className="space-y-2">
                    {notes.map((n) => (
                      <li
                        key={n.id}
                        className="rounded-xl bg-purple-50/40 border border-purple-100 p-3"
                      >
                        <div className="flex items-center justify-between text-[11px] text-purple-700 mb-1">
                          <span className="font-medium">— {n.operator}</span>
                          <span className="font-mono text-purple-500/80">
                            {formatDate(n.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-navy-700 leading-relaxed">
                          {n.content}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </article>
        </section>

        {/* 右侧操作 */}
        <aside className="col-span-12 md:col-span-3 space-y-4 animate-fade-in-up stagger-3">
          <div className="card p-5">
            <h4 className="font-serif font-semibold text-navy-800 mb-4 flex items-center gap-2">
              <CheckCircle
                className="w-4 h-4 text-moss-600"
                strokeWidth={1.75}
              />
              改判操作
            </h4>
            <div className="space-y-2.5">
              <button
                onClick={doConfirm}
                className="btn-success w-full !py-2.5"
                disabled={selected.status === "confirmed"}
              >
                <CheckCircle className="w-4 h-4" strokeWidth={2} />
                确认改判
              </button>
              <button
                onClick={doRevoke}
                className="btn-danger w-full !py-2.5"
                disabled={selected.status === "pending"}
              >
                <Undo2 className="w-4 h-4" strokeWidth={2} />
                撤回 / 退回待处理
              </button>
            </div>
            <div className="mt-4 pt-4 border-t border-navy-50">
              <label className="block text-[11px] font-semibold text-navy-600 uppercase tracking-wide mb-1.5">
                改判备注 / 操作说明
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="input-field min-h-[80px] resize-y text-xs"
                placeholder="填写确认/撤回理由，评审复盘时可直接引用..."
              />
            </div>
          </div>

          <div className="card p-5">
            <h4 className="font-serif font-semibold text-navy-800 mb-3 flex items-center gap-2">
              <Camera
                className="w-4 h-4 text-navy-600"
                strokeWidth={1.75}
              />
              新增截图说明
            </h4>
            <div className="space-y-2.5">
              <input
                type="text"
                value={shotDesc}
                onChange={(e) => setShotDesc(e.target.value)}
                className="input-field text-xs"
                placeholder="截图描述，如：退款后台字段缺失截图"
              />
              <button
                onClick={doAddScreenshot}
                className="btn-secondary w-full text-xs"
                disabled={!shotDesc.trim()}
              >
                <Camera className="w-3.5 h-3.5" strokeWidth={2} />
                生成并关联截图
              </button>
            </div>
          </div>

          <div className="card p-5">
            <h4 className="font-serif font-semibold text-navy-800 mb-3 flex items-center gap-2">
              <StickyNote
                className="w-4 h-4 text-purple-600"
                strokeWidth={1.75}
              />
              追加后补说明
            </h4>
            <div className="space-y-2.5">
              <div className="flex gap-2">
                <span className="chip bg-purple-50 text-purple-700">操作人</span>
                <select
                  value={noteOperator}
                  onChange={(e) => setNoteOperator(e.target.value)}
                  className="input-field !py-1 text-xs !shadow-none"
                >
                  <option>周姐</option>
                  <option>标注员A</option>
                  <option>标注员B</option>
                  <option>算法值班人</option>
                </select>
              </div>
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                className="input-field min-h-[70px] resize-y text-xs"
                placeholder="补充说明内容，将关联到本工单..."
              />
              <button
                onClick={doAddNote}
                disabled={!noteContent.trim()}
                className="btn-secondary w-full text-xs"
              >
                <Send className="w-3.5 h-3.5" strokeWidth={2} />
                保存后补说明
              </button>
            </div>
          </div>

          {history.length > 0 && (
            <div className="card p-5">
              <h4 className="font-serif font-semibold text-navy-800 mb-3 flex items-center gap-2">
                <Eye className="w-4 h-4 text-navy-600" strokeWidth={1.75} />
                本条改判历史
              </h4>
              <ul className="space-y-2">
                {history.map((r) => (
                  <li
                    key={r.id}
                    className={cn(
                      "p-2.5 rounded-lg text-xs border",
                      r.action_type === "revoke"
                        ? "bg-crimson-50 border-crimson-100"
                        : r.action_type === "modify"
                        ? "bg-navy-50 border-navy-100"
                        : "bg-moss-50 border-moss-100"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-navy-700 flex items-center gap-1">
                        <Layers
                          className="w-3 h-3"
                          strokeWidth={2}
                        />
                        {r.action_type === "revoke"
                          ? "撤回"
                          : r.action_type === "modify"
                          ? "修改"
                          : "确认"}
                      </span>
                      <span className="text-[10px] text-navy-500 font-mono">
                        {formatDate(r.created_at)}
                      </span>
                    </div>
                    <p className="text-navy-600">
                      <span className="font-medium">{r.operator}</span> · {r.note}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
