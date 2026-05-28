import { useState } from "react";
import {
  SearchCheck,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Filter,
  Eye,
  X,
  Clock,
  Layers,
  ThumbsUp,
  ThumbsDown,
  Calendar,
  ChevronDown,
} from "lucide-react";
import { useSettlementStore } from "@/store/settlementStore";
import { formatDate, formatCurrency, formatAnomalyType } from "@/utils/helpers";
import type {
  AnomalyType,
  AnomalyStatus,
  AnomalySeverity,
  AnomalyRecord,
  AnomalyFilter,
  DeduplicationReview,
} from "@/types";

export default function ReviewPage() {
  const { anomalies, reviewAnomaly, getDeduplicationReview, redemptionRecords, ticketCodes } =
    useSettlementStore();

  const [selectedAnomaly, setSelectedAnomaly] = useState<AnomalyRecord | null>(null);
  const [reviewAction, setReviewAction] = useState<"confirm" | "release" | null>(null);
  const [reviewReason, setReviewReason] = useState("");
  const [dedupReview, setDedupReview] = useState<DeduplicationReview | null>(null);
  const [filters, setFilters] = useState<AnomalyFilter>({
    types: [],
    status: undefined,
  });

  const [typeFilterOpen, setTypeFilterOpen] = useState(false);
  const [statusFilterOpen, setStatusFilterOpen] = useState(false);

  const anomalyTypes: { value: AnomalyType; label: string }[] = [
    { value: "duplicate_redemption", label: "重复核销" },
    { value: "cross_cinema", label: "跨影院使用" },
    { value: "fee_version_mismatch", label: "服务费版本错" },
  ];

  const statusOptions: { value: AnomalyStatus; label: string }[] = [
    { value: "pending", label: "待处理" },
    { value: "confirmed", label: "确认异常" },
    { value: "released", label: "已放行" },
  ];

  const filteredAnomalies = anomalies.filter((a) => {
    if (filters.types && filters.types.length > 0 && !filters.types.includes(a.type)) {
      return false;
    }
    if (filters.status && a.status !== filters.status) {
      return false;
    }
    if (filters.severity && a.severity !== filters.severity) {
      return false;
    }
    return true;
  });

  const pendingCount = anomalies.filter((a) => a.status === "pending").length;
  const confirmedCount = anomalies.filter((a) => a.status === "confirmed").length;
  const releasedCount = anomalies.filter((a) => a.status === "released").length;

  const handleViewDedupReview = (ticketCode: string) => {
    const review = getDeduplicationReview(ticketCode);
    if (review) {
      setDedupReview(review);
    }
  };

  const handleSubmitReview = () => {
    if (!selectedAnomaly || !reviewAction || !reviewReason.trim()) return;
    reviewAnomaly(selectedAnomaly.id, reviewAction, reviewReason);
    setSelectedAnomaly(null);
    setReviewAction(null);
    setReviewReason("");
  };

  const toggleTypeFilter = (type: AnomalyType) => {
    setFilters((prev) => {
      const currentTypes = prev.types || [];
      const newTypes = currentTypes.includes(type)
        ? currentTypes.filter((t) => t !== type)
        : [...currentTypes, type];
      return { ...prev, types: newTypes.length > 0 ? newTypes : undefined };
    });
  };

  const getSeverityClass = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case "pending":
        return "badge-pending";
      case "confirmed":
        return "badge-danger";
      case "released":
        return "badge-success";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold">异常复核</h2>
          <p className="text-sm text-ink-500 mt-1">
            逐条复核异常记录，可回看券码去重决策过程
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-ink-500">
            待处理：<span className="font-mono font-bold text-accent-danger">{pendingCount}</span>
          </span>
          <span className="text-ink-500">
            已确认：<span className="font-mono font-bold text-ink-700">{confirmedCount}</span>
          </span>
          <span className="text-ink-500">
            已放行：<span className="font-mono font-bold text-ink-700">{releasedCount}</span>
          </span>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-ink-500" />
              <span className="font-medium">筛选条件</span>
            </div>
            <button
              onClick={() => setFilters({ types: [], status: undefined })}
              className="text-sm text-ink-500 hover:text-ink-700"
            >
              重置筛选
            </button>
          </div>
        </div>
        <div className="card-body">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative">
              <button
                onClick={() => {
                  setTypeFilterOpen(!typeFilterOpen);
                  setStatusFilterOpen(false);
                }}
                className="inline-flex items-center gap-2 px-3 py-2 border border-ink-300 rounded text-sm hover:bg-ink-50"
              >
                <AlertTriangle size={14} className="text-ink-500" />
                异常类型
                {filters.types && filters.types.length > 0 && (
                  <span className="px-1.5 py-0.5 bg-brand-100 text-brand-700 rounded text-xs font-medium">
                    {filters.types.length}
                  </span>
                )}
                <ChevronDown size={14} className="text-ink-400" />
              </button>
              {typeFilterOpen && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-ink-200 rounded-lg shadow-lg py-1 z-10 min-w-[140px]">
                  {anomalyTypes.map((type) => (
                    <label
                      key={type.value}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-ink-50 cursor-pointer text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={filters.types?.includes(type.value) || false}
                        onChange={() => toggleTypeFilter(type.value)}
                        className="rounded border-ink-300 text-brand-500 focus:ring-brand-400"
                      />
                      {type.label}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => {
                  setStatusFilterOpen(!statusFilterOpen);
                  setTypeFilterOpen(false);
                }}
                className="inline-flex items-center gap-2 px-3 py-2 border border-ink-300 rounded text-sm hover:bg-ink-50"
              >
                <Clock size={14} className="text-ink-500" />
                处理状态
                {filters.status && (
                  <span className="px-1.5 py-0.5 bg-brand-100 text-brand-700 rounded text-xs font-medium">
                    {statusOptions.find((s) => s.value === filters.status)?.label}
                  </span>
                )}
                <ChevronDown size={14} className="text-ink-400" />
              </button>
              {statusFilterOpen && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-ink-200 rounded-lg shadow-lg py-1 z-10 min-w-[140px]">
                  {statusOptions.map((status) => (
                    <label
                      key={status.value}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-ink-50 cursor-pointer text-sm"
                    >
                      <input
                        type="radio"
                        name="status"
                        checked={filters.status === status.value}
                        onChange={() => setFilters((prev) => ({ ...prev, status: status.value }))}
                        className="text-brand-500 focus:ring-brand-400"
                      />
                      {status.label}
                    </label>
                  ))}
                  <div className="border-t border-ink-100 mt-1 pt-1">
                    <label
                      className="flex items-center gap-2 px-3 py-2 hover:bg-ink-50 cursor-pointer text-sm"
                    >
                      <input
                        type="radio"
                        name="status"
                        checked={!filters.status}
                        onChange={() => setFilters((prev) => ({ ...prev, status: undefined }))}
                        className="text-brand-500 focus:ring-brand-400"
                      />
                      全部
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div className="text-sm text-ink-400">
              筛选结果：<span className="font-mono font-medium text-ink-700">{filteredAnomalies.length}</span> 条
            </div>
          </div>
        </div>
      </div>

      {filteredAnomalies.length > 0 ? (
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 card">
            <div className="card-header flex items-center justify-between">
              <h3 className="font-display text-lg font-medium">异常列表</h3>
              <span className="text-sm text-ink-500">共 {filteredAnomalies.length} 条</span>
            </div>
            <div className="card-body p-0">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>异常类型</th>
                    <th>券码</th>
                    <th>影院</th>
                    <th>严重程度</th>
                    <th>状态</th>
                    <th>复核意见</th>
                    <th className="text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAnomalies.map((anomaly) => (
                    <tr
                      key={anomaly.id}
                      className={`cursor-pointer ${
                        selectedAnomaly?.id === anomaly.id ? "bg-brand-50/50" : ""
                      }`}
                      onClick={() => setSelectedAnomaly(anomaly)}
                    >
                      <td>
                        <span className={`badge ${getSeverityClass(anomaly.severity)} border`}>
                          {anomaly.typeLabel}
                        </span>
                      </td>
                      <td>
                        <span className="font-mono font-medium">{anomaly.ticketCode}</span>
                      </td>
                      <td className="text-sm">{anomaly.cinemaName}</td>
                      <td>
                        <span className={
                          anomaly.severity === "high" ? "text-accent-danger" :
                          anomaly.severity === "medium" ? "text-accent-warning" :
                          "text-accent-info"
                        }>
                          {anomaly.severity === "high" ? "高" : anomaly.severity === "medium" ? "中" : "低"}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${getStatusClass(anomaly.status)}`}>
                          {anomaly.statusLabel}
                        </span>
                      </td>
                      <td className="text-sm text-ink-500 max-w-[150px] truncate">
                        {anomaly.reviewReason || "-"}
                      </td>
                      <td className="text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                        {anomaly.type === "duplicate_redemption" && (
                          <button
                            onClick={() => handleViewDedupReview(anomaly.ticketCode)}
                            className="text-sm text-brand-600 hover:text-brand-700"
                            title="去重回看"
                          >
                            <Layers size={14} className="inline mr-1" />
                            回看
                          </button>
                        )}
                        {anomaly.status === "pending" && (
                          <button
                            onClick={() => setSelectedAnomaly(anomaly)}
                            className="text-sm text-ink-600 hover:text-ink-800"
                          >
                            <Eye size={14} className="inline mr-1" />
                            复核
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4">
            {selectedAnomaly ? (
              <div className="card">
                <div className="card-header flex items-center justify-between">
                  <h3 className="font-display text-lg font-medium">异常详情</h3>
                  <button
                    onClick={() => setSelectedAnomaly(null)}
                    className="p-1 hover:bg-ink-100 rounded"
                  >
                    <X size={16} className="text-ink-400" />
                  </button>
                </div>
                <div className="card-body space-y-4">
                  <div>
                    <p className="text-xs text-ink-400 mb-1">异常类型</p>
                    <p className="flex items-center gap-2">
                      <span className={`badge ${getSeverityClass(selectedAnomaly.severity)} border`}>
                        {selectedAnomaly.typeLabel}
                      </span>
                      <span className={`badge ${getStatusClass(selectedAnomaly.status)}`}>
                        {selectedAnomaly.statusLabel}
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-ink-400 mb-1">券码</p>
                    <p className="font-mono font-medium">{selectedAnomaly.ticketCode}</p>
                  </div>
                  <div>
                    <p className="text-xs text-ink-400 mb-1">影院</p>
                    <p>{selectedAnomaly.cinemaName}</p>
                  </div>
                  {selectedAnomaly.channelName && (
                    <div>
                      <p className="text-xs text-ink-400 mb-1">渠道</p>
                      <p>{selectedAnomaly.channelName}</p>
                    </div>
                  )}
                  {selectedAnomaly.expectedFeeVersion && (
                    <div>
                      <p className="text-xs text-ink-400 mb-1">版本信息</p>
                      <p className="text-sm">
                        应为 <span className="font-mono text-accent-success">{selectedAnomaly.expectedFeeVersion}</span>
                        ，实际 <span className="font-mono text-accent-danger">{selectedAnomaly.actualFeeVersion}</span>
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-ink-400 mb-1">异常详情</p>
                    <p className="text-sm text-ink-600 bg-ink-50 p-3 rounded-lg">
                      {selectedAnomaly.details}
                    </p>
                  </div>

                  {selectedAnomaly.type === "duplicate_redemption" && (
                    <button
                      onClick={() => handleViewDedupReview(selectedAnomaly.ticketCode)}
                      className="w-full inline-flex items-center justify-center gap-2 py-2 border border-ink-300 rounded text-sm hover:bg-ink-50"
                    >
                      <Layers size={14} />
                      查看去重回看
                    </button>
                  )}

                  {selectedAnomaly.status === "pending" && (
                    <div className="pt-4 border-t border-ink-200">
                      <p className="text-sm font-medium mb-3">复核操作</p>
                      <div className="flex gap-2 mb-3">
                        <button
                          onClick={() => setReviewAction("confirm")}
                          className={`flex-1 inline-flex items-center justify-center gap-2 py-2 rounded text-sm font-medium transition-all ${
                            reviewAction === "confirm"
                              ? "bg-red-100 text-red-700 border-2 border-red-300"
                              : "border-2 border-ink-200 text-ink-600 hover:bg-red-50 hover:border-red-200 hover:text-red-700"
                          }`}
                        >
                          <ThumbsDown size={14} />
                          确认异常
                        </button>
                        <button
                          onClick={() => setReviewAction("release")}
                          className={`flex-1 inline-flex items-center justify-center gap-2 py-2 rounded text-sm font-medium transition-all ${
                            reviewAction === "release"
                              ? "bg-green-100 text-green-700 border-2 border-green-300"
                              : "border-2 border-ink-200 text-ink-600 hover:bg-green-50 hover:border-green-200 hover:text-green-700"
                          }`}
                        >
                          <ThumbsUp size={14} />
                          放行
                        </button>
                      </div>
                      <div className="mb-3">
                        <label className="block text-xs text-ink-500 mb-1">复核理由（必填）</label>
                        <textarea
                          value={reviewReason}
                          onChange={(e) => setReviewReason(e.target.value)}
                          placeholder="请输入复核理由..."
                          rows={3}
                          className="w-full px-3 py-2 border border-ink-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent resize-none"
                        />
                      </div>
                      <button
                        onClick={handleSubmitReview}
                        disabled={!reviewAction || !reviewReason.trim()}
                        className="w-full btn-primary"
                      >
                        <CheckCircle size={16} />
                        提交复核
                      </button>
                    </div>
                  )}

                  {selectedAnomaly.status !== "pending" && selectedAnomaly.reviewReason && (
                    <div className="pt-4 border-t border-ink-200">
                      <p className="text-xs text-ink-400 mb-1">复核意见</p>
                      <p className="text-sm text-ink-600 bg-ink-50 p-3 rounded-lg">
                        {selectedAnomaly.reviewReason}
                      </p>
                      {selectedAnomaly.reviewedAt && (
                        <p className="text-xs text-ink-400 mt-2">
                          复核时间：{formatDate(selectedAnomaly.reviewedAt)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="card">
                <div className="card-body py-12 text-center">
                  <SearchCheck size={32} className="mx-auto mb-2 text-ink-300" />
                  <p className="text-ink-500">点击左侧异常记录查看详情</p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-body py-16 text-center">
            <CheckCircle size={48} className="mx-auto mb-4 text-accent-success opacity-50" />
            <h3 className="font-display text-lg font-medium text-ink-600 mb-2">
              {anomalies.length === 0 ? "暂无异常记录" : "没有符合筛选条件的异常"}
            </h3>
            <p className="text-sm text-ink-500">
              {anomalies.length === 0
                ? "请先运行兑付处理以检测异常"
                : "请调整筛选条件"}
            </p>
          </div>
        </div>
      )}

      {dedupReview && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-8">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-ink-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Layers size={18} className="text-brand-600" />
                <h3 className="font-display text-lg font-semibold">券码去重回看</h3>
                <span className="font-mono text-sm text-ink-500">{dedupReview.ticketCode}</span>
              </div>
              <button
                onClick={() => setDedupReview(null)}
                className="p-1 hover:bg-ink-100 rounded"
              >
                <X size={18} className="text-ink-400" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="mb-6 p-4 bg-brand-50 border border-brand-200 rounded-lg">
                <p className="text-sm font-medium text-brand-800 mb-1">去重决策</p>
                <p className="text-sm text-brand-700">{dedupReview.dedupDecision}</p>
                <p className="text-xs text-brand-600 mt-2">
                  决策时间：{formatDate(dedupReview.decisionTime)}
                </p>
              </div>

              <h4 className="font-medium text-ink-700 mb-3">全部核销记录（按时间排序）</h4>
              <div className="space-y-3">
                {dedupReview.allRedemptions.map((record, idx) => {
                  const isKept = record.id === dedupReview.keptRecord.id;
                  return (
                    <div
                      key={record.id}
                      className={`p-4 rounded-lg border-2 ${
                        isKept
                          ? "bg-green-50 border-green-300"
                          : "bg-red-50 border-red-200"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {isKept ? (
                            <div className="p-2 bg-green-100 rounded-lg">
                              <CheckCircle size={16} className="text-green-600" />
                            </div>
                          ) : (
                            <div className="p-2 bg-red-100 rounded-lg">
                              <XCircle size={16} className="text-red-500" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">
                              {isKept ? "保留记录" : "移除记录"} #{idx + 1}
                            </p>
                            <p className="text-sm text-ink-500">
                              核销ID：<span className="font-mono">{record.id}</span>
                            </p>
                          </div>
                        </div>
                        <span className={`badge ${isKept ? "badge-success" : "badge-danger"}`}>
                          {isKept ? "保留" : "移除"}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-ink-400 text-xs">影院</p>
                          <p>{record.cinemaName}</p>
                        </div>
                        <div>
                          <p className="text-ink-400 text-xs">渠道</p>
                          <p>{record.channelName}</p>
                        </div>
                        <div>
                          <p className="text-ink-400 text-xs">金额</p>
                          <p className="font-mono">{formatCurrency(record.amount)}</p>
                        </div>
                      </div>
                      <div className="mt-2">
                        <p className="text-ink-400 text-xs">核销时间</p>
                        <p className="font-mono text-sm">{formatDate(record.redemptionTime)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-ink-200 bg-ink-50 flex justify-end">
              <button
                onClick={() => setDedupReview(null)}
                className="btn-primary"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
