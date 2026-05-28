import { useState } from "react";
import {
  Cog,
  Play,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Copy,
  XCircle,
  Edit3,
  Save,
  X,
  ChevronDown,
  ChevronRight,
  Layers,
  GitCompare,
  Clock,
} from "lucide-react";
import { useSettlementStore } from "@/store/settlementStore";
import { formatCurrency, formatDate, formatTicketType } from "@/utils/helpers";
import type { AnomalyType, TicketCode, RedemptionRecord, AffectedRecord } from "@/types";

export default function ProcessPage() {
  const {
    processBatches,
    importBatches,
    currentProcessBatchId,
    deductionResult,
    anomalyDetectionResult,
    changeTrackingResult,
    isProcessing,
    ticketCodes,
    redemptionRecords,
    createProcessBatch,
    runFullProcess,
    modifyRedemptionRecord,
    getCurrentProcessBatch,
  } = useSettlementStore();

  const [activeAnomalyTab, setActiveAnomalyTab] = useState<AnomalyType | "all">("all");
  const [expandedDuplicate, setExpandedDuplicate] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<RedemptionRecord | null>(null);
  const [editField, setEditField] = useState<string>("");
  const [editValue, setEditValue] = useState<string>("");

  const currentBatch = getCurrentProcessBatch();

  const handleCreateBatch = () => {
    createProcessBatch();
  };

  const handleRunProcess = () => {
    if (!currentProcessBatchId) {
      const batch = createProcessBatch();
      runFullProcess(batch.id);
    } else {
      runFullProcess(currentProcessBatchId);
    }
  };

  const handleEditRecord = (record: RedemptionRecord, field: string) => {
    setEditingRecord(record);
    setEditField(field);
    const value = record[field as keyof RedemptionRecord];
    setEditValue(String(value ?? ""));
  };

  const handleSaveEdit = () => {
    if (!editingRecord || !editField) return;

    const updates: Partial<RedemptionRecord> = {};
    if (editField === "amount") {
      updates.amount = Number(editValue);
    } else if (editField === "cinemaId") {
      updates.cinemaId = editValue;
    } else if (editField === "channelId") {
      updates.channelId = editValue;
    }

    modifyRedemptionRecord(editingRecord.id, updates);
    setEditingRecord(null);
    setEditField("");
    setEditValue("");
  };

  const anomalyTabs = [
    { key: "all" as const, label: "全部", count: anomalyDetectionResult?.totalCount ?? 0 },
    { key: "duplicate_redemption" as const, label: "重复核销", count: anomalyDetectionResult?.byType.duplicate_redemption ?? 0 },
    { key: "cross_cinema" as const, label: "跨影院使用", count: anomalyDetectionResult?.byType.cross_cinema ?? 0 },
    { key: "fee_version_mismatch" as const, label: "服务费版本错", count: anomalyDetectionResult?.byType.fee_version_mismatch ?? 0 },
  ];

  const filteredAnomalies = anomalyDetectionResult?.anomalies.filter((a) =>
    activeAnomalyTab === "all" ? true : a.type === activeAnomalyTab
  ) ?? [];

  const getAnomalySeverityClass = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  const getChangeTypeIcon = (type: AffectedRecord["changeType"]) => {
    switch (type) {
      case "added":
        return <CheckCircle size={14} className="text-accent-success" />;
      case "removed":
        return <XCircle size={14} className="text-accent-danger" />;
      case "modified":
        return <Edit3 size={14} className="text-accent-warning" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold">兑付处理</h2>
          <p className="text-sm text-ink-500 mt-1">
            去重、异常检测、渠道分摊，全链路自动化处理
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleCreateBatch}
            className="btn-secondary"
            disabled={importBatches.length === 0}
          >
            <RefreshCw size={16} />
            新建处理批次
          </button>
          <button
            onClick={handleRunProcess}
            className="btn-primary"
            disabled={isProcessing || importBatches.length === 0}
          >
            {isProcessing ? (
              <>
                <Cog size={16} className="animate-spin" />
                处理中...
              </>
            ) : (
              <>
                <Play size={16} />
                运行兑付处理
              </>
            )}
          </button>
        </div>
      </div>

      {currentBatch && (
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="font-display text-lg font-medium">当前批次</h3>
              <span className="px-3 py-1 bg-brand-50 text-brand-700 rounded text-sm font-medium">
                {currentBatch.name}
              </span>
              <span className={`inline-flex items-center gap-1.5 text-sm ${
                currentBatch.status === "exported" ? "text-green-700" :
                currentBatch.status === "reviewing" ? "text-amber-700" :
                "text-ink-500"
              }`}>
                <span className={`status-dot ${
                  currentBatch.status === "exported" ? "status-dot-success" :
                  currentBatch.status === "reviewing" ? "status-dot-pending" :
                  "status-dot-processing"
                }`} />
                {currentBatch.statusLabel}
              </span>
            </div>
            <span className="text-sm text-ink-400 font-mono">{currentBatch.id}</span>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center p-3 bg-ink-50 rounded-lg">
                <p className="text-2xl font-display font-bold text-ink-700">{importBatches.length}</p>
                <p className="text-xs text-ink-500 mt-1">数据批次</p>
              </div>
              <div className="text-center p-3 bg-ink-50 rounded-lg">
                <p className="text-2xl font-display font-bold text-ink-700">{ticketCodes.length}</p>
                <p className="text-xs text-ink-500 mt-1">票券码</p>
              </div>
              <div className="text-center p-3 bg-ink-50 rounded-lg">
                <p className="text-2xl font-display font-bold text-ink-700">{redemptionRecords.length}</p>
                <p className="text-xs text-ink-500 mt-1">核销记录</p>
              </div>
              <div className="text-center p-3 bg-ink-50 rounded-lg">
                <p className="text-2xl font-display font-bold text-ink-700">
                  {anomalyDetectionResult?.pendingCount ?? "-"}
                </p>
                <p className="text-xs text-ink-500 mt-1">待处理异常</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {deductionResult && (
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers size={18} className="text-brand-600" />
              <h3 className="font-display text-lg font-medium">券码去重结果</h3>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-ink-500">
                总记录数：<span className="font-mono font-medium text-ink-700">{deductionResult.totalCodes}</span>
              </span>
              <span className="text-ink-500">
                去重后：<span className="font-mono font-medium text-accent-success">{deductionResult.uniqueCodes}</span>
              </span>
              <span className="text-ink-500">
                重复券码：<span className="font-mono font-medium text-accent-danger">{deductionResult.duplicateCount}</span>
              </span>
            </div>
          </div>
          <div className="card-body p-0">
            {deductionResult.duplicates.length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="w-8"></th>
                    <th>券码</th>
                    <th>保留记录</th>
                    <th>重复记录</th>
                    <th>去重原因</th>
                  </tr>
                </thead>
                <tbody>
                  {deductionResult.duplicates.map((dup) => (
                    <>
                      <tr
                        key={dup.ticketCode}
                        className="cursor-pointer hover:bg-brand-50/30"
                        onClick={() => setExpandedDuplicate(expandedDuplicate === dup.ticketCode ? null : dup.ticketCode)}
                      >
                        <td>
                          {expandedDuplicate === dup.ticketCode ? (
                            <ChevronDown size={16} className="text-ink-400" />
                          ) : (
                            <ChevronRight size={16} className="text-ink-400" />
                          )}
                        </td>
                        <td>
                          <span className="font-mono font-medium">{dup.ticketCode}</span>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <CheckCircle size={14} className="text-accent-success" />
                            <span className="text-sm">
                              {dup.keptRecord.cinemaName} · {formatDate(dup.keptRecord.redemptionTime, "MM-DD HH:mm")}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-danger">
                            {dup.discardedRecords.length} 条
                          </span>
                        </td>
                        <td className="text-sm text-ink-500">{dup.reason}</td>
                      </tr>
                      {expandedDuplicate === dup.ticketCode && (
                        <tr>
                          <td colSpan={5} className="bg-ink-50 p-4">
                            <div className="space-y-2">
                              {dup.records.map((record, idx) => (
                                <div
                                  key={record.id}
                                  className={`flex items-center justify-between p-3 rounded-lg ${
                                    record.id === dup.keptRecord.id
                                      ? "bg-green-50 border border-green-200"
                                      : "bg-red-50 border border-red-200"
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    {record.id === dup.keptRecord.id ? (
                                      <CheckCircle size={16} className="text-accent-success" />
                                    ) : (
                                      <XCircle size={16} className="text-accent-danger" />
                                    )}
                                    <div>
                                      <p className="font-medium text-sm">
                                        {record.id === dup.keptRecord.id ? "保留" : "移除"} · 核销记录 #{idx + 1}
                                      </p>
                                      <p className="text-xs text-ink-500">
                                        {record.cinemaName} · {record.channelName} · {formatCurrency(record.amount)}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-mono">{formatDate(record.redemptionTime)}</p>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditRecord(record, "amount");
                                      }}
                                      className="text-xs text-brand-600 hover:text-brand-700 mt-1"
                                    >
                                      <Edit3 size={12} className="inline mr-1" />
                                      修改金额
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-12 text-center text-ink-400">
                <CheckCircle size={32} className="mx-auto mb-2 text-accent-success opacity-50" />
                <p>未发现重复券码</p>
              </div>
            )}
          </div>
        </div>
      )}

      {anomalyDetectionResult && (
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-accent-warning" />
              <h3 className="font-display text-lg font-medium">异常检测结果</h3>
            </div>
            <div className="flex gap-1 bg-ink-100 p-1 rounded-lg">
              {anomalyTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveAnomalyTab(tab.key)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    activeAnomalyTab === tab.key
                      ? "bg-white text-ink-700 shadow-sm"
                      : "text-ink-500 hover:text-ink-700"
                  }`}
                >
                  {tab.label}
                  <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                    tab.count > 0 ? "bg-red-100 text-red-700" : "bg-ink-200 text-ink-500"
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="card-body p-0">
            {filteredAnomalies.length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>异常类型</th>
                    <th>券码</th>
                    <th>影院</th>
                    <th>渠道</th>
                    <th>严重程度</th>
                    <th>状态</th>
                    <th>详情</th>
                    <th className="text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAnomalies.map((anomaly) => (
                    <tr key={anomaly.id}>
                      <td>
                        <span className={`badge ${getAnomalySeverityClass(anomaly.severity)} border`}>
                          {anomaly.typeLabel}
                        </span>
                      </td>
                      <td>
                        <span className="font-mono font-medium">{anomaly.ticketCode}</span>
                      </td>
                      <td>{anomaly.cinemaName}</td>
                      <td>{anomaly.channelName || "-"}</td>
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
                        <span className={`badge ${
                          anomaly.status === "pending" ? "badge-pending" :
                          anomaly.status === "confirmed" ? "badge-danger" :
                          "badge-success"
                        }`}>
                          {anomaly.statusLabel}
                        </span>
                      </td>
                      <td className="max-w-xs text-sm text-ink-500 truncate">
                        {anomaly.details}
                      </td>
                      <td className="text-right">
                        <button
                          onClick={() => {
                            const record = redemptionRecords.find(
                              (r) => r.id === anomaly.redemptionIds?.[0]
                            );
                            if (record) handleEditRecord(record, "amount");
                          }}
                          className="text-sm text-brand-600 hover:text-brand-700"
                        >
                          <Edit3 size={14} className="inline mr-1" />
                          修改
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-12 text-center text-ink-400">
                <CheckCircle size={32} className="mx-auto mb-2 text-accent-success opacity-50" />
                <p>未发现{activeAnomalyTab === "all" ? "" : anomalyTabs.find((t) => t.key === activeAnomalyTab)?.label}异常</p>
              </div>
            )}
          </div>
        </div>
      )}

      {changeTrackingResult && changeTrackingResult.totalImpact > 0 && (
        <div className="card border-accent-warning/30">
          <div className="card-header border-amber-200 bg-amber-50/50">
            <div className="flex items-center gap-2">
              <GitCompare size={18} className="text-amber-700" />
              <h3 className="font-display text-lg font-medium text-amber-800">变更影响追踪</h3>
              <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-xs font-medium">
                共 {changeTrackingResult.totalImpact} 条记录受影响
              </span>
            </div>
          </div>
          <div className="card-body p-0">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-8"></th>
                  <th>券码</th>
                  <th>变更类型</th>
                  <th>变更字段</th>
                  <th>原值</th>
                  <th>新值</th>
                  <th>影响说明</th>
                </tr>
              </thead>
              <tbody>
                {changeTrackingResult.affectedRecords.map((record, idx) => (
                  <tr
                    key={idx}
                    className={
                      record.changeType === "modified" ? "bg-amber-50/30" :
                      record.changeType === "added" ? "bg-green-50/30" :
                      "bg-red-50/30"
                    }
                  >
                    <td>{getChangeTypeIcon(record.changeType)}</td>
                    <td>
                      <span className="font-mono font-medium">{record.ticketCode}</span>
                    </td>
                    <td>
                      <span className={`badge ${
                        record.changeType === "added" ? "badge-success" :
                        record.changeType === "removed" ? "badge-danger" :
                        "badge-warning"
                      }`}>
                        {record.changeType === "added" ? "新增" :
                         record.changeType === "removed" ? "删除" : "修改"}
                      </span>
                    </td>
                    <td>
                      {record.changedFields.map((f) => (
                        <span key={f} className="inline-block px-1.5 py-0.5 bg-ink-100 rounded text-xs mr-1 mb-1">
                          {f}
                        </span>
                      ))}
                    </td>
                    <td className="font-mono text-sm text-ink-500">
                      {record.changeType === "added" ? "-" :
                       record.changeType === "removed" ? JSON.stringify(record.oldValues).slice(0, 30) + "..." :
                       Object.entries(record.oldValues).map(([k, v]) => `${k}: ${v}`).join(", ")}
                    </td>
                    <td className="font-mono text-sm text-ink-700">
                      {record.changeType === "removed" ? "-" :
                       record.changeType === "added" ? JSON.stringify(record.newValues).slice(0, 30) + "..." :
                       Object.entries(record.newValues).map(([k, v]) => `${k}: ${v}`).join(", ")}
                    </td>
                    <td className="text-sm text-ink-600 max-w-xs">{record.impact}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!deductionResult && !anomalyDetectionResult && !isProcessing && (
        <div className="card">
          <div className="card-body py-16 text-center">
            <Cog size={48} className="mx-auto mb-4 text-ink-300" />
            <h3 className="font-display text-lg font-medium text-ink-600 mb-2">尚未运行兑付处理</h3>
            <p className="text-sm text-ink-500 mb-6">
              点击右上角"运行兑付处理"按钮，系统将自动执行去重、异常检测和渠道分摊
            </p>
            <button
              onClick={handleRunProcess}
              className="btn-primary"
              disabled={importBatches.length === 0}
            >
              <Play size={16} />
              运行兑付处理
            </button>
            {importBatches.length === 0 && (
              <p className="text-sm text-accent-danger mt-3">请先导入数据</p>
            )}
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h3 className="font-display text-lg font-medium">核销记录明细</h3>
        </div>
        <div className="card-body p-0 overflow-x-auto">
          {redemptionRecords.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>券码</th>
                  <th>类型</th>
                  <th>影院</th>
                  <th>核销时间</th>
                  <th>渠道</th>
                  <th>金额</th>
                  <th className="text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {redemptionRecords.slice(0, 20).map((record) => {
                  const ticket = ticketCodes.find((t) => t.code === record.ticketCode);
                  return (
                    <tr key={record.id}>
                      <td>
                        <span className="font-mono font-medium">{record.ticketCode}</span>
                      </td>
                      <td>
                        <span className="badge bg-ink-100 text-ink-700">
                          {ticket ? formatTicketType(ticket.type) : "-"}
                        </span>
                      </td>
                      <td>{record.cinemaName}</td>
                      <td className="text-ink-500 text-sm">{formatDate(record.redemptionTime)}</td>
                      <td>{record.channelName}</td>
                      <td className="font-mono">{formatCurrency(record.amount)}</td>
                      <td className="text-right space-x-2">
                        <button
                          onClick={() => handleEditRecord(record, "amount")}
                          className="text-sm text-brand-600 hover:text-brand-700"
                        >
                          <Edit3 size={14} className="inline mr-1" />
                          修改
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="py-12 text-center text-ink-400">
              <Clock size={32} className="mx-auto mb-2 opacity-50" />
              <p>暂无核销记录</p>
              <p className="text-sm mt-1">请先导入数据</p>
            </div>
          )}
        </div>
      </div>

      {editingRecord && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-semibold">修改核销记录</h3>
              <button
                onClick={() => {
                  setEditingRecord(null);
                  setEditField("");
                  setEditValue("");
                }}
                className="p-1 hover:bg-ink-100 rounded"
              >
                <X size={18} className="text-ink-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-ink-500 mb-1">券码</p>
                <p className="font-mono font-medium">{editingRecord.ticketCode}</p>
              </div>
              <div>
                <label className="block text-sm text-ink-600 mb-1">
                  {editField === "amount" ? "金额" :
                   editField === "cinemaId" ? "影院ID" :
                   editField === "channelId" ? "渠道ID" : editField}
                </label>
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full px-3 py-2 border border-ink-300 rounded focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                  autoFocus
                />
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded p-3">
                <p className="text-xs text-amber-700">
                  <AlertTriangle size={12} className="inline mr-1" />
                  修改后请重新运行兑付处理，系统会自动对比变更前后的差异并标注影响范围。
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setEditingRecord(null);
                  setEditField("");
                  setEditValue("");
                }}
                className="btn-secondary"
              >
                取消
              </button>
              <button
                onClick={handleSaveEdit}
                className="btn-primary"
              >
                <Save size={16} />
                保存修改
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
