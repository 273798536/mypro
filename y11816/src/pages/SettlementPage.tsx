import { useState } from "react";
import {
  Calculator,
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  GitBranch,
  FileText,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  Clock,
} from "lucide-react";
import { useSettlementStore } from "@/store/settlementStore";
import { formatCurrency, formatDate } from "@/utils/helpers";
import type { InconsistencyRecord, InconsistencyTrace, ChannelAllocation } from "@/types";

export default function SettlementPage() {
  const {
    allocationResult,
    consistencyResult,
    currentProcessBatchId,
    checkConsistency,
    traceInconsistency,
    channelContracts,
    redemptionRecords,
    runAllocation,
  } = useSettlementStore();

  const [expandedAllocation, setExpandedAllocation] = useState<string | null>(null);
  const [expandedInconsistency, setExpandedInconsistency] = useState<string | null>(null);
  const [inconsistencyTrace, setInconsistencyTrace] = useState<InconsistencyTrace | null>(null);

  const handleCheckConsistency = () => {
    if (!currentProcessBatchId) return;
    checkConsistency(currentProcessBatchId);
  };

  const handleTraceInconsistency = (inconsistency: InconsistencyRecord) => {
    const trace = traceInconsistency(inconsistency.id);
    if (trace) {
      setInconsistencyTrace(trace);
    }
  };

  const handleRunAllocation = () => {
    if (!currentProcessBatchId) return;
    runAllocation(currentProcessBatchId);
  };

  const pendingAnomalies = useSettlementStore((state) =>
    state.anomalies.filter((a) => a.status === "pending").length
  );

  const getDifferenceClass = (diff: number) => {
    if (diff > 0) return "text-accent-danger";
    if (diff < 0) return "text-accent-success";
    return "text-ink-500";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold">渠道结算</h2>
          <p className="text-sm text-ink-500 mt-1">
            按渠道分摊服务费，溯源不一致原因
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRunAllocation}
            className="btn-secondary"
            disabled={!allocationResult}
          >
            <RefreshCw size={16} />
            重新分摊
          </button>
          <button
            onClick={handleCheckConsistency}
            className="btn-primary"
            disabled={!allocationResult}
          >
            <CheckCircle size={16} />
            一致性检测
          </button>
        </div>
      </div>

      {pendingAnomalies > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">存在待复核异常</p>
            <p className="text-sm text-amber-700">
              当前有 {pendingAnomalies} 条异常记录尚未复核完成，已确认异常的记录将从结算中剔除。建议先处理完所有异常再进行结算。
            </p>
          </div>
        </div>
      )}

      {allocationResult ? (
        <>
          <div className="grid grid-cols-4 gap-4">
            <div className="card">
              <div className="card-body">
                <p className="text-sm text-ink-500">总金额</p>
                <p className="text-2xl font-display font-bold text-ink-700 mt-1">
                  {formatCurrency(allocationResult.totalAmount)}
                </p>
                <p className="text-xs text-ink-400 mt-2">
                  共 {allocationResult.totalTicketCount} 张券
                </p>
              </div>
            </div>
            <div className="card">
              <div className="card-body">
                <p className="text-sm text-ink-500">服务费合计</p>
                <p className="text-2xl font-display font-bold text-accent-danger mt-1">
                  {formatCurrency(allocationResult.totalServiceFee)}
                </p>
                <p className="text-xs text-ink-400 mt-2">
                  综合费率 {((allocationResult.totalServiceFee / allocationResult.totalAmount) * 100).toFixed(2)}%
                </p>
              </div>
            </div>
            <div className="card">
              <div className="card-body">
                <p className="text-sm text-ink-500">应付净额</p>
                <p className="text-2xl font-display font-bold text-accent-success mt-1">
                  {formatCurrency(allocationResult.totalNetAmount)}
                </p>
                <p className="text-xs text-ink-400 mt-2">
                  总金额 - 服务费
                </p>
              </div>
            </div>
            <div className="card">
              <div className="card-body">
                <p className="text-sm text-ink-500">渠道数量</p>
                <p className="text-2xl font-display font-bold text-ink-700 mt-1">
                  {allocationResult.channelAllocations.length}
                </p>
                <p className="text-xs text-ink-400 mt-2">
                  参与结算的渠道
                </p>
              </div>
            </div>
          </div>

          {consistencyResult && (
            <div className={`card ${!consistencyResult.isConsistent ? "border-accent-danger" : "border-accent-success"}`}>
              <div className={`card-header border-b ${
                !consistencyResult.isConsistent ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {consistencyResult.isConsistent ? (
                      <CheckCircle size={18} className="text-accent-success" />
                    ) : (
                      <AlertCircle size={18} className="text-accent-danger" />
                    )}
                    <h3 className={`font-display text-lg font-medium ${
                      !consistencyResult.isConsistent ? "text-red-800" : "text-green-800"
                    }`}>
                      一致性检测结果
                    </h3>
                  </div>
                  <div className="text-sm">
                    {consistencyResult.isConsistent ? (
                      <span className="text-green-700">数据一致，可放心导出</span>
                    ) : (
                      <span className="text-red-700">
                        发现 {consistencyResult.inconsistencies.length} 处不一致，请先修正
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {!consistencyResult.isConsistent && (
                <div className="card-body p-0">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th className="w-8"></th>
                        <th>渠道</th>
                        <th>类型</th>
                        <th>分摊值</th>
                        <th>预期值</th>
                        <th>差额</th>
                        <th>原因</th>
                        <th className="text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {consistencyResult.inconsistencies.map((incons) => (
                        <>
                          <tr
                            key={incons.id}
                            className="cursor-pointer bg-red-50/30"
                            onClick={() => setExpandedInconsistency(expandedInconsistency === incons.id ? null : incons.id)}
                          >
                            <td>
                              {expandedInconsistency === incons.id ? (
                                <ChevronDown size={16} className="text-ink-400" />
                              ) : (
                                <ChevronRight size={16} className="text-ink-400" />
                              )}
                            </td>
                            <td>{incons.channelName}</td>
                            <td>
                              <span className="badge badge-danger">
                                {incons.type === "fee_mismatch" ? "服务费差额" :
                                 incons.type === "amount_mismatch" ? "金额差额" : "版本错配"}
                              </span>
                            </td>
                            <td className="font-mono">{formatCurrency(incons.allocationValue)}</td>
                            <td className="font-mono">{formatCurrency(incons.reportValue)}</td>
                            <td className={`font-mono font-medium ${getDifferenceClass(incons.difference)}`}>
                              {incons.difference > 0 ? "+" : ""}
                              {formatCurrency(incons.difference)}
                            </td>
                            <td className="text-sm text-ink-500 max-w-xs truncate">
                              {incons.rootCause}
                            </td>
                            <td className="text-right" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => handleTraceInconsistency(incons)}
                                className="text-sm text-brand-600 hover:text-brand-700"
                              >
                                <GitBranch size={14} className="inline mr-1" />
                                溯源
                              </button>
                            </td>
                          </tr>
                          {expandedInconsistency === incons.id && (
                            <tr>
                              <td colSpan={8} className="bg-ink-50 p-4">
                                <div className="text-sm text-ink-600">
                                  <p className="font-medium mb-2">问题详情：</p>
                                  <p>{incons.rootCause}</p>
                                  <p className="mt-2">
                                    <span className="text-ink-500">建议修正：</span>
                                    请检查该渠道的合同版本、费率及生效日期，确认后重新运行分摊计算。
                                  </p>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <div className="card">
            <div className="card-header flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator size={18} className="text-brand-600" />
                <h3 className="font-display text-lg font-medium">渠道分摊明细</h3>
              </div>
              <span className="text-sm text-ink-500">共 {allocationResult.channelAllocations.length} 个渠道</span>
            </div>
            <div className="card-body p-0">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="w-8"></th>
                    <th>渠道名称</th>
                    <th>券数</th>
                    <th>总金额</th>
                    <th>服务费率</th>
                    <th>服务费</th>
                    <th>净额</th>
                    <th>费率版本</th>
                  </tr>
                </thead>
                <tbody>
                  {allocationResult.channelAllocations.map((alloc) => (
                    <>
                      <tr
                        key={alloc.id}
                        className="cursor-pointer"
                        onClick={() => setExpandedAllocation(expandedAllocation === alloc.id ? null : alloc.id)}
                      >
                        <td>
                          {expandedAllocation === alloc.id ? (
                            <ChevronDown size={16} className="text-ink-400" />
                          ) : (
                            <ChevronRight size={16} className="text-ink-400" />
                          )}
                        </td>
                        <td className="font-medium">{alloc.channelName}</td>
                        <td>{alloc.ticketCount} 张</td>
                        <td className="font-mono">{formatCurrency(alloc.totalAmount)}</td>
                        <td className="font-mono">
                          {(alloc.serviceFeeRate * 100).toFixed(1)}%
                        </td>
                        <td className="font-mono text-accent-danger">
                          {formatCurrency(alloc.serviceFee)}
                        </td>
                        <td className="font-mono text-accent-success font-medium">
                          {formatCurrency(alloc.netAmount)}
                        </td>
                        <td>
                          <span className="badge bg-ink-100 text-ink-700">
                            {alloc.feeVersion}
                          </span>
                        </td>
                      </tr>
                      {expandedAllocation === alloc.id && (
                        <tr>
                          <td colSpan={8} className="bg-ink-50 p-4">
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 text-sm">
                                <Calculator size={14} className="text-ink-400" />
                                <span className="text-ink-500">计算公式：</span>
                                <code className="bg-white px-2 py-1 rounded border border-ink-200 font-mono">
                                  {alloc.calculationFormula}
                                </code>
                              </div>
                              <div>
                                <p className="text-sm text-ink-500 mb-2">关联合同：</p>
                                <div className="grid grid-cols-2 gap-3">
                                  {channelContracts
                                    .filter((c) => c.channelId === alloc.channelId)
                                    .sort((a, b) => b.validFrom - a.validFrom)
                                    .map((contract) => (
                                      <div
                                        key={contract.id}
                                        className={`p-3 rounded-lg border ${
                                          contract.feeVersion === alloc.feeVersion
                                            ? "bg-brand-50 border-brand-200"
                                            : "bg-white border-ink-200"
                                        }`}
                                      >
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="badge bg-ink-100 text-ink-700">
                                            {contract.feeVersion}
                                          </span>
                                          {contract.feeVersion === alloc.feeVersion && (
                                            <span className="text-xs text-brand-700 font-medium">
                                              当前使用
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-sm font-medium">
                                          费率 {(contract.serviceFeeRate * 100).toFixed(1)}%
                                        </p>
                                        <p className="text-xs text-ink-500">
                                          有效期：{formatDate(contract.validFrom, "YYYY-MM-DD")} 至 {formatDate(contract.validTo, "YYYY-MM-DD")}
                                        </p>
                                        {contract.isSupplementary && (
                                          <span className="badge badge-warning mt-1">后补合同</span>
                                        )}
                                      </div>
                                    ))}
                                </div>
                              </div>
                              <div className="flex justify-end gap-3 pt-2 border-t border-ink-200">
                                <div className="text-right text-sm">
                                  <span className="text-ink-500">结算单预览：</span>
                                  <button className="inline-flex items-center gap-1 ml-2 text-brand-600 hover:text-brand-700 font-medium">
                                    <FileText size={14} />
                                    查看
                                    <ArrowRight size={12} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-ink-50 font-medium">
                    <td colSpan={2} className="text-ink-600">合计</td>
                    <td className="text-ink-700">{allocationResult.totalTicketCount} 张</td>
                    <td className="font-mono text-ink-700">
                      {formatCurrency(allocationResult.totalAmount)}
                    </td>
                    <td className="text-ink-500">-</td>
                    <td className="font-mono text-accent-danger">
                      {formatCurrency(allocationResult.totalServiceFee)}
                    </td>
                    <td className="font-mono text-accent-success">
                      {formatCurrency(allocationResult.totalNetAmount)}
                    </td>
                    <td>-</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="font-display text-lg font-medium">渠道合同版本</h3>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-3 gap-4">
                {Array.from(new Set(channelContracts.map((c) => c.channelId))).map((channelId) => {
                  const contracts = channelContracts
                    .filter((c) => c.channelId === channelId)
                    .sort((a, b) => b.validFrom - a.validFrom);
                  const channelName = contracts[0]?.channelName || channelId;

                  return (
                    <div key={channelId} className="border border-ink-200 rounded-lg p-4">
                      <h4 className="font-medium mb-3">{channelName}</h4>
                      <div className="space-y-2">
                        {contracts.map((contract) => (
                          <div
                            key={contract.id}
                            className={`p-3 rounded-lg text-sm ${
                              contract.isSupplementary
                                ? "bg-amber-50 border border-amber-200"
                                : "bg-ink-50"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-mono text-xs bg-white px-2 py-0.5 rounded border border-ink-200">
                                {contract.feeVersion}
                              </span>
                              {contract.isSupplementary && (
                                <span className="badge badge-warning">后补</span>
                              )}
                            </div>
                            <p className="font-medium">
                              费率 {(contract.serviceFeeRate * 100).toFixed(1)}%
                            </p>
                            <p className="text-xs text-ink-500">
                              {formatDate(contract.validFrom, "YYYY-MM-DD")} ~ {formatDate(contract.validTo, "YYYY-MM-DD")}
                            </p>
                            <p className="text-xs text-ink-400 mt-1">
                              导入时间：{formatDate(contract.importTime, "MM-DD HH:mm")}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="card">
          <div className="card-body py-16 text-center">
            <Calculator size={48} className="mx-auto mb-4 text-ink-300" />
            <h3 className="font-display text-lg font-medium text-ink-600 mb-2">尚未执行渠道分摊</h3>
            <p className="text-sm text-ink-500 mb-6">
              请先在"兑付处理"页面运行兑付处理，系统将自动计算渠道分摊
            </p>
          </div>
        </div>
      )}

      {inconsistencyTrace && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-8">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-ink-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <GitBranch size={18} className="text-accent-danger" />
                <h3 className="font-display text-lg font-semibold">不一致溯源</h3>
              </div>
              <button
                onClick={() => setInconsistencyTrace(null)}
                className="p-1 hover:bg-ink-100 rounded"
              >
                <AlertCircle size={18} className="text-ink-400" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="font-medium text-red-800 mb-1">根本原因</p>
                <p className="text-sm text-red-700">{inconsistencyTrace.rootCause}</p>
              </div>

              <h4 className="font-medium text-ink-700 mb-3">逐笔溯源链</h4>
              {inconsistencyTrace.chain.length > 0 ? (
                <div className="space-y-3">
                  {inconsistencyTrace.chain.map((step, idx) => (
                    <div key={idx} className="relative pl-6 pb-4 border-l-2 border-ink-200 last:pb-0">
                      <div className="absolute -left-[7px] top-0 w-3 h-3 rounded-full bg-accent-danger border-2 border-white" />
                      <div className="bg-white border border-ink-200 rounded-lg p-3">
                        <p className="text-sm font-medium mb-2">{step.step}</p>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <p className="text-ink-400">实际计算值</p>
                            <p className="font-mono font-medium text-accent-danger">
                              {formatCurrency(step.value)}
                            </p>
                          </div>
                          <div>
                            <p className="text-ink-400">预期值</p>
                            <p className="font-mono font-medium text-accent-success">
                              {formatCurrency(step.expected)}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs text-ink-500 mt-2 bg-ink-50 p-2 rounded">
                          {step.source}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-ink-400">
                  <Clock size={24} className="mx-auto mb-2 opacity-50" />
                  <p>暂无详细溯源步骤</p>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-ink-200 bg-ink-50 flex justify-end">
              <button
                onClick={() => setInconsistencyTrace(null)}
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
