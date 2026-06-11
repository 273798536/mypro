import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Upload,
  CheckSquare,
  Clock,
  User,
  FileText,
  ExternalLink,
  Hash,
  AlertCircle,
  CheckCircle,
  FolderCheck,
  ListTodo,
} from "lucide-react";
import { useReviewStore, useRecordsStore } from "@/store";
import { EVIDENCE_TYPES, type EvidenceType, type ReviewItem } from "@/types";

interface ReviewItemLocal extends ReviewItem {
  operator?: string;
}

function initializeDefaultReviews() {
  const reviews = useReviewStore.getState();
  if (reviews.reviews.length > 0) return;

  const records = useRecordsStore.getState().records;
  if (records.length === 0) return;

  const abnormalRecords = records.filter(
    (r) =>
      r.recordType !== "normal" ||
      r.riskLevel === "high" ||
      r.riskLevel === "critical",
  );

  if (abnormalRecords.length === 0) return;

  abnormalRecords.forEach((r) => {
    let evidenceType: EvidenceType = "现场照片";
    if (r.recordType === "old_version") evidenceType = "传感器校准证书";
    else if (r.recordType === "withdrawn") evidenceType = "现场照片";
    else if (r.recordType === "verbal") evidenceType = "官方批文";
    else if (r.riskLevel === "critical") evidenceType = "安全距离实测报告";
    else if (r.riskLevel === "high") evidenceType = "环评报告";

    reviews.addReview({
      relatedRecordId: r.id,
      status: "evidence_needed",
      evidenceType,
      note: "",
    });
  });
}

function StatusOverview() {
  const reviews = useReviewStore((s) => s.reviews);
  const stats = useMemo(() => useReviewStore.getState().getStats(), [reviews.length]);
  const { total, processed, evidenceNeeded } = stats;
  const progress = total > 0 ? Math.round((processed / total) * 100) : 0;

  return (
    <div className="eng-card p-6">
      <div className="flex items-center gap-2 mb-6">
        <ClipboardCheck className="w-5 h-5 text-deepsea-600" />
        <h2 className="text-lg font-bold text-deepsea-900">复核状态总览</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-passgreen-500 to-passgreen-600 p-6 text-white shadow-lg shadow-passgreen-200">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12" />
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-passgreen-100 text-sm font-medium mb-1">已处理</div>
                <div className="text-5xl font-bold tracking-tight">{processed}</div>
              </div>
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>
            </div>
            <div className="text-passgreen-100 text-xs mt-2">
              所有复核项均已完成审核并归档
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-alertyellow-400 to-alertyellow-500 p-6 text-white shadow-lg shadow-alertyellow-200">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12" />
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-alertyellow-100 text-sm font-medium mb-1">待补证据</div>
                <div className="text-5xl font-bold tracking-tight">{evidenceNeeded}</div>
              </div>
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <AlertTriangle className="w-8 h-8" />
              </div>
            </div>
            <div className="text-alertyellow-100 text-xs mt-2">
              需要相关人员补充提交证明材料
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm text-deepsea-600">
            <span className="font-medium">总体进度</span>
            <span className="text-deepsea-400 text-xs">
              {processed} / {total} 项
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-2xl font-bold text-deepsea-800">{progress}</span>
            <span className="text-lg text-deepsea-500 mb-0.5">%</span>
          </div>
        </div>
        <div className="relative w-full h-4 bg-deepsea-100 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${progress}%`,
              background:
                progress === 100
                  ? "linear-gradient(90deg, #86efac, #22c55e, #16a34a)"
                  : progress >= 60
                    ? "linear-gradient(90deg, #8ecbff, #2f8eff, #58adff, #86efac)"
                    : "linear-gradient(90deg, #facc15, #fb923c, #f97316)",
            }}
          />
          <div
            className="absolute inset-y-0 left-0 rounded-full opacity-30 animate-pulse"
            style={{
              width: `${progress}%`,
              background:
                progress === 100
                  ? "linear-gradient(90deg, #86efac, #22c55e)"
                  : "linear-gradient(90deg, #8ecbff, #2f8eff)",
            }}
          />
        </div>
        {total === 0 && (
          <p className="text-xs text-warnorange-600 mt-2 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            暂无复核项，请先在工作台处理数据或加载演示数据
          </p>
        )}
      </div>
    </div>
  );
}

interface EvidenceItemCardProps {
  item: ReviewItemLocal;
  onUpdate: (id: string, updates: Partial<ReviewItem>) => void;
  onSubmit: (id: string) => void;
  onJump: (recordId: string) => void;
}

function EvidenceItemCard({
  item,
  onUpdate,
  onSubmit,
  onJump,
}: EvidenceItemCardProps) {
  const [evidenceType, setEvidenceType] = useState<EvidenceType>(
    item.evidenceType ?? EVIDENCE_TYPES[0],
  );
  const [note, setNote] = useState(item.note ?? "");

  useEffect(() => {
    setEvidenceType(item.evidenceType ?? EVIDENCE_TYPES[0]);
    setNote(item.note ?? "");
  }, [item.id, item.evidenceType, item.note]);

  return (
    <div className="eng-card p-4 hover:shadow-md transition-all">
      <div className="flex items-start gap-3 mb-3">
        <div className="p-2 rounded-lg bg-warnorange-100 text-warnorange-600 shrink-0">
          <ListTodo className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <button
            onClick={() => onJump(item.relatedRecordId)}
            className="flex items-center gap-1.5 text-deepsea-700 hover:text-deepsea-900 group transition-colors"
          >
            <span className="font-mono text-sm font-bold group-hover:underline">
              {item.relatedRecordId}
            </span>
            <ExternalLink className="w-3 h-3 text-deepsea-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
          <div className="flex items-center gap-2 mt-1">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-warnorange-100 text-warnorange-700 text-xs font-medium">
              <AlertTriangle className="w-3 h-3" />
              待补证据
            </span>
            <span className="text-xs text-deepsea-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(item.updatedAt).toLocaleString("zh-CN", {
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-deepsea-600 mb-1.5">
            所需证据类型
          </label>
          <select
            value={evidenceType}
            onChange={(e) => {
              const val = e.target.value as EvidenceType;
              setEvidenceType(val);
              onUpdate(item.id, { evidenceType: val });
            }}
            className="w-full rounded-lg border border-deepsea-200 bg-white px-3 py-2 text-sm text-deepsea-800 focus:border-deepsea-500 focus:ring-2 focus:ring-deepsea-500/20 focus:outline-none transition-all"
          >
            {EVIDENCE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-deepsea-600 mb-1.5">
            补充备注
          </label>
          <textarea
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              onUpdate(item.id, { note: e.target.value });
            }}
            placeholder="请输入相关说明或补充信息..."
            rows={2}
            className="w-full rounded-lg border border-deepsea-200 bg-white px-3 py-2 text-sm text-deepsea-800 placeholder-deepsea-400 focus:border-deepsea-500 focus:ring-2 focus:ring-deepsea-500/20 focus:outline-none transition-all resize-none"
          />
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="text-xs text-deepsea-400 flex items-center gap-1">
            <Hash className="w-3 h-3" />
            {item.id}
          </div>
          <button
            onClick={() => {
              onSubmit(item.id);
            }}
            className="eng-btn-success px-4 py-1.5 text-xs"
          >
            <Upload className="w-3.5 h-3.5" />
            提交证据 & 标记处理
          </button>
        </div>
      </div>
    </div>
  );
}

function EvidenceNeededList() {
  const navigate = useNavigate();
  const reviews = useReviewStore((s) => s.reviews);
  const updateReview = useReviewStore((s) => s.updateReview);

  const evidenceNeededItems = useMemo(
    () => reviews.filter((r) => r.status === "evidence_needed"),
    [reviews],
  );

  const handleUpdate = (id: string, updates: Partial<ReviewItem>) => {
    updateReview(id, updates);
  };

  const handleSubmit = (id: string) => {
    updateReview(id, { status: "processed" });
  };

  const handleJump = (recordId: string) => {
    navigate(`/workbench?highlight=${recordId}`);
  };

  const handleMarkAllProcessed = () => {
    evidenceNeededItems.forEach((item) => {
      updateReview(item.id, { status: "processed" });
    });
  };

  return (
    <div className="eng-card flex flex-col h-full overflow-hidden">
      <div className="px-5 py-4 border-b border-deepsea-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-warnorange-100">
            <AlertTriangle className="w-4 h-4 text-warnorange-600" />
          </div>
          <div>
            <h3 className="font-bold text-deepsea-900">待补证据列表</h3>
            <p className="text-xs text-deepsea-500">
              需补充相关证明材料的复核项
            </p>
          </div>
          <span className="ml-2 px-2 py-0.5 rounded-full bg-warnorange-100 text-warnorange-700 text-xs font-bold">
            {evidenceNeededItems.length}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-3">
        {evidenceNeededItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-deepsea-400 py-12">
            <div className="w-16 h-16 rounded-2xl bg-passgreen-100 flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-passgreen-500" />
            </div>
            <p className="text-sm font-medium text-passgreen-700">太棒了！</p>
            <p className="text-xs">所有复核项均已处理完毕</p>
          </div>
        ) : (
          evidenceNeededItems.map((item) => (
            <EvidenceItemCard
              key={item.id}
              item={item}
              onUpdate={handleUpdate}
              onSubmit={handleSubmit}
              onJump={handleJump}
            />
          ))
        )}
      </div>

      {evidenceNeededItems.length > 0 && (
        <div className="px-4 py-3 border-t border-deepsea-100 bg-deepsea-50/50">
          <button
            onClick={handleMarkAllProcessed}
            className="eng-btn-secondary w-full text-sm"
          >
            <CheckSquare className="w-4 h-4" />
            一键标记全部已处理
          </button>
        </div>
      )}
    </div>
  );
}

interface ProcessedGroup {
  date: string;
  items: ReviewItemLocal[];
}

function ProcessedList() {
  const navigate = useNavigate();
  const reviews = useReviewStore((s) => s.reviews);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [allExpanded, setAllExpanded] = useState(false);

  const processedItems = useMemo(
    () => reviews.filter((r) => r.status === "processed"),
    [reviews],
  );

  const groupedByDate = useMemo(() => {
    const groups: Record<string, ReviewItemLocal[]> = {};
    processedItems.forEach((item) => {
      const date = new Date(item.updatedAt).toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      if (!groups[date]) groups[date] = [];
      groups[date].push({
        ...item,
        operator: "系统自动",
      });
    });
    const result: ProcessedGroup[] = Object.entries(groups)
      .map(([date, items]) => ({ date, items }))
      .sort(
        (a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
    return result;
  }, [processedItems]);

  const toggleDate = (date: string) => {
    setExpandedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (allExpanded) {
      setExpandedDates(new Set());
    } else {
      setExpandedDates(new Set(groupedByDate.map((g) => g.date)));
    }
    setAllExpanded(!allExpanded);
  };

  const handleJump = (recordId: string) => {
    navigate(`/workbench?highlight=${recordId}`);
  };

  return (
    <div className="eng-card flex flex-col h-full overflow-hidden">
      <div className="px-5 py-4 border-b border-deepsea-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-passgreen-100">
            <FolderCheck className="w-4 h-4 text-passgreen-600" />
          </div>
          <div>
            <h3 className="font-bold text-deepsea-900">已处理清单</h3>
            <p className="text-xs text-deepsea-500">已完成复核的记录历史</p>
          </div>
          <span className="ml-2 px-2 py-0.5 rounded-full bg-passgreen-100 text-passgreen-700 text-xs font-bold">
            {processedItems.length}
          </span>
        </div>
        {groupedByDate.length > 0 && (
          <button
            onClick={toggleAll}
            className="eng-btn-ghost px-3 py-1.5 text-xs"
          >
            {allExpanded ? (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                全部折叠
              </>
            ) : (
              <>
                <ChevronRight className="w-3.5 h-3.5" />
                全部展开
              </>
            )}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-3">
        {groupedByDate.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-deepsea-400 py-12">
            <div className="w-16 h-16 rounded-2xl bg-deepsea-100 flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-deepsea-400" />
            </div>
            <p className="text-sm font-medium text-deepsea-600">暂无处理记录</p>
            <p className="text-xs">处理完成的记录将显示在这里</p>
          </div>
        ) : (
          groupedByDate.map((group) => {
            const isExpanded = expandedDates.has(group.date);
            return (
              <div
                key={group.date}
                className="rounded-xl border border-deepsea-100 overflow-hidden"
              >
                <button
                  onClick={() => toggleDate(group.date)}
                  className="w-full px-4 py-3 flex items-center justify-between bg-deepsea-50/50 hover:bg-deepsea-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-deepsea-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-deepsea-500" />
                    )}
                    <span className="font-semibold text-deepsea-800 text-sm">
                      {group.date}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-passgreen-100 text-passgreen-700 text-xs font-medium">
                      {group.items.length} 项
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-deepsea-500">
                    <CheckCircle2 className="w-3.5 h-3.5 text-passgreen-500" />
                    已完成
                  </div>
                </button>
                {isExpanded && (
                  <div className="divide-y divide-deepsea-50 bg-white">
                    {group.items.map((item) => (
                      <div
                        key={item.id}
                        className="px-4 py-3 hover:bg-deepsea-50/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                              <button
                                onClick={() => handleJump(item.relatedRecordId)}
                                className="flex items-center gap-1 font-mono text-sm font-bold text-deepsea-700 hover:text-deepsea-900 hover:underline"
                              >
                                {item.relatedRecordId}
                                <ExternalLink className="w-3 h-3 text-deepsea-400 ml-0.5" />
                              </button>
                              {item.evidenceType && (
                                <span className="px-2 py-0.5 rounded bg-deepsea-100 text-deepsea-700 text-xs">
                                  {item.evidenceType}
                                </span>
                              )}
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-passgreen-100 text-passgreen-700 text-xs font-medium">
                                <CheckCircle className="w-3 h-3" />
                                已处理
                              </span>
                            </div>
                            {item.note && (
                              <p className="text-xs text-deepsea-600 pl-1 border-l-2 border-deepsea-200 ml-1">
                                {item.note}
                              </p>
                            )}
                          </div>
                          <div className="text-right shrink-0 space-y-1">
                            <div className="flex items-center justify-end gap-1 text-xs text-deepsea-500">
                              <Clock className="w-3 h-3" />
                              {new Date(item.updatedAt).toLocaleTimeString(
                                "zh-CN",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </div>
                            <div className="flex items-center justify-end gap-1 text-xs text-deepsea-500">
                              <User className="w-3 h-3" />
                              {item.operator || "系统自动"}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function ReviewPage() {
  const records = useRecordsStore((s) => s.records);

  useEffect(() => {
    initializeDefaultReviews();
  }, [records.length]);

  return (
    <div className="space-y-5 min-h-[calc(100vh-8rem)]">
      <StatusOverview />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5" style={{ minHeight: "600px" }}>
        <EvidenceNeededList />
        <ProcessedList />
      </div>
    </div>
  );
}
