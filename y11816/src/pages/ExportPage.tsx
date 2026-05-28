import { useState } from "react";
import {
  FileSpreadsheet,
  Download,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  GitCompare,
  Eye,
  FileText,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { useSettlementStore } from "@/store/settlementStore";
import { formatCurrency, formatDate } from "@/utils/helpers";

export default function ExportPage() {
  const {
    currentProcessBatchId,
    allocationResult,
    consistencyResult,
    anomalies,
    exportRecords,
    validateExport,
    exportReport,
    getCurrentProcessBatch,
  } = useSettlementStore();

  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [compareA, setCompareA] = useState<string | null>(null);
  const [compareB, setCompareB] = useState<string | null>(null);
  const [showCompare, setShowCompare] = useState(false);

  const currentBatch = getCurrentProcessBatch();

  const pendingAnomalies = anomalies.filter((a) => a.status === "pending").length;

  const handleValidate = () => {
    if (!currentProcessBatchId) return;
    setIsValidating(true);
    setTimeout(() => {
      const result = validateExport(currentProcessBatchId);
      setValidationResult({
        ...result,
        warnings: [],
      });
      setIsValidating(false);
    }, 800);
  };

  const handleExport = () => {
    if (!currentProcessBatchId || !validationResult?.isValid) return;
    setIsExporting(true);
    setTimeout(() => {
      try {
        const blob = exportReport(currentProcessBatchId);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `影城结算报表_${currentBatch?.name || currentProcessBatchId}_${new Date().toISOString().slice(0, 10)}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (e) {
        console.error("导出失败:", e);
        alert("导出失败，请重试");
      } finally {
        setIsExporting(false);
      }
    }, 1000);
  };

  const handleCompare = () => {
    if (compareA && compareB && compareA !== compareB) {
      setShowCompare(true);
    }
  };

  const sortedExportRecords = [...exportRecords].sort(
    (a, b) => b.exportTime - a.exportTime
  );

  const getFileSizeText = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold">报表导出</h2>
          <p className="text-sm text-ink-500 mt-1">
            导出前自动校验一致性，多版本对比差异
          </p>
        </div>
      </div>

      {allocationResult ? (
        <>
          <div className="card">
            <div className="card-header">
              <h3 className="font-display text-lg font-medium">导出预览</h3>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-ink-700 mb-4">报表包含内容</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 p-3 bg-ink-50 rounded-lg">
                      <div className="p-2 bg-white rounded border border-ink-200">
                        <FileText size={16} className="text-ink-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">汇总表</p>
                        <p className="text-xs text-ink-500">总金额、服务费、净额汇总</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-ink-50 rounded-lg">
                      <div className="p-2 bg-white rounded border border-ink-200">
                        <FileSpreadsheet size={16} className="text-ink-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">渠道分摊表</p>
                        <p className="text-xs text-ink-500">
                          共 {allocationResult.channelAllocations.length} 个渠道
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-ink-50 rounded-lg">
                      <div className="p-2 bg-white rounded border border-ink-200">
                        <AlertTriangle size={16} className="text-ink-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">异常记录表</p>
                        <p className="text-xs text-ink-500">
                          共 {anomalies.length} 条异常记录
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-ink-50 rounded-lg">
                      <div className="p-2 bg-white rounded border border-ink-200">
                        <Clock size={16} className="text-ink-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">核销明细表</p>
                        <p className="text-xs text-ink-500">
                          共 {allocationResult.totalTicketCount} 条核销记录
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-ink-700 mb-4">汇总数据</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-ink-50 rounded-lg">
                      <span className="text-ink-500">总金额</span>
                      <span className="font-mono font-medium text-ink-700">
                        {formatCurrency(allocationResult.totalAmount)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-ink-50 rounded-lg">
                      <span className="text-ink-500">总服务费</span>
                      <span className="font-mono font-medium text-accent-danger">
                        {formatCurrency(allocationResult.totalServiceFee)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-ink-50 rounded-lg">
                      <span className="text-ink-500">总净额</span>
                      <span className="font-mono font-medium text-accent-success">
                        {formatCurrency(allocationResult.totalNetAmount)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-ink-50 rounded-lg">
                      <span className="text-ink-500">券数</span>
                      <span className="font-mono font-medium text-ink-700">
                        {allocationResult.totalTicketCount} 张
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-ink-50 rounded-lg">
                      <span className="text-ink-500">渠道数</span>
                      <span className="font-mono font-medium text-ink-700">
                        {allocationResult.channelAllocations.length} 个
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="card">
              <div className="card-header flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={18} className="text-brand-600" />
                  <h3 className="font-display text-lg font-medium">导出前校验</h3>
                </div>
                <button
                  onClick={handleValidate}
                  disabled={isValidating || !currentProcessBatchId}
                  className="btn-secondary text-sm"
                >
                  {isValidating ? (
                    <>
                      <Clock size={14} className="animate-spin" />
                      校验中...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={14} />
                      开始校验
                    </>
                  )}
                </button>
              </div>
              <div className="card-body">
                {validationResult ? (
                  <div className="space-y-4">
                    <div
                      className={`p-4 rounded-lg flex items-start gap-3 ${
                        validationResult.isValid
                          ? "bg-green-50 border border-green-200"
                          : "bg-red-50 border border-red-200"
                      }`}
                    >
                      {validationResult.isValid ? (
                        <CheckCircle
                          size={20}
                          className="text-accent-success flex-shrink-0 mt-0.5"
                        />
                      ) : (
                        <XCircle
                          size={20}
                          className="text-accent-danger flex-shrink-0 mt-0.5"
                        />
                      )}
                      <div>
                        <p className="font-medium text-ink-700">
                          {validationResult.isValid ? "校验通过" : "校验未通过"}
                        </p>
                        <p className="text-sm text-ink-500">
                          {validationResult.isValid
                            ? "所有校验项已通过，可以安全导出"
                            : "存在问题，请先修正后再导出"}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle
                          size={14}
                          className={
                            pendingAnomalies === 0
                              ? "text-accent-success"
                              : "text-accent-danger"
                          }
                        />
                        <span>异常复核完成</span>
                        <span className="text-ink-400">
                          （{anomalies.length - pendingAnomalies}/
                          {anomalies.length}）
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle
                          size={14}
                          className={
                            allocationResult ? "text-accent-success" : "text-accent-danger"
                          }
                        />
                        <span>渠道分摊已完成</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle
                          size={14}
                          className={
                            consistencyResult?.isConsistent
                              ? "text-accent-success"
                              : "text-accent-danger"
                          }
                        />
                        <span>数据一致性检测</span>
                        {consistencyResult && !consistencyResult.isConsistent && (
                          <span className="text-ink-400">
                            （{consistencyResult.inconsistencies.length} 处不一致）
                          </span>
                        )}
                      </div>
                    </div>

                    {validationResult.errors.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-red-700 mb-2">错误项：</p>
                        <ul className="space-y-1">
                          {validationResult.errors.map((err, idx) => (
                            <li
                              key={idx}
                              className="text-sm text-red-600 flex items-start gap-2"
                            >
                              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                              {err}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-ink-400">
                    <ShieldCheck size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">点击"开始校验"检查导出条件</p>
                  </div>
                )}
              </div>
              <div className="px-6 py-4 border-t border-ink-200 bg-ink-50">
                <button
                  onClick={handleExport}
                  disabled={isExporting || !validationResult?.isValid}
                  className="w-full btn-primary"
                >
                  {isExporting ? (
                    <>
                      <Clock size={16} className="animate-spin" />
                      导出中...
                    </>
                  ) : (
                    <>
                      <Download size={16} />
                      导出 Excel 报表
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="card">
              <div className="card-header flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GitCompare size={18} className="text-brand-600" />
                  <h3 className="font-display text-lg font-medium">版本对比</h3>
                </div>
              </div>
              <div className="card-body">
                <p className="text-sm text-ink-500 mb-4">
                  选择两个导出版本进行对比，查看数据差异
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-ink-500 mb-1">版本 A</label>
                    <select
                      value={compareA || ""}
                      onChange={(e) => setCompareA(e.target.value || null)}
                      className="w-full px-3 py-2 border border-ink-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                    >
                      <option value="">请选择...</option>
                      {sortedExportRecords.map((record) => (
                        <option key={record.id} value={record.id}>
                          {record.fileName} ({formatDate(record.exportTime)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-ink-500 mb-1">版本 B</label>
                    <select
                      value={compareB || ""}
                      onChange={(e) => setCompareB(e.target.value || null)}
                      className="w-full px-3 py-2 border border-ink-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                    >
                      <option value="">请选择...</option>
                      {sortedExportRecords.map((record) => (
                        <option key={record.id} value={record.id}>
                          {record.fileName} ({formatDate(record.exportTime)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={handleCompare}
                    disabled={!compareA || !compareB || compareA === compareB}
                    className="w-full btn-secondary"
                  >
                    <GitCompare size={14} />
                    开始对比
                  </button>
                </div>

                {sortedExportRecords.length === 0 && (
                  <div className="text-center py-8 text-ink-400">
                    <FileSpreadsheet size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">暂无导出记录</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header flex items-center justify-between">
              <h3 className="font-display text-lg font-medium">导出历史</h3>
              <span className="text-sm text-ink-500">
                共 {exportRecords.length} 条记录
              </span>
            </div>
            <div className="card-body p-0">
              {sortedExportRecords.length > 0 ? (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>文件名</th>
                      <th>批次</th>
                      <th>大小</th>
                      <th>导出时间</th>
                      <th>校验状态</th>
                      <th className="text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedExportRecords.map((record) => (
                      <tr key={record.id}>
                        <td>
                          <div className="flex items-center gap-2">
                            <FileSpreadsheet
                              size={14}
                              className="text-green-600 flex-shrink-0"
                            />
                            <span className="font-medium">{record.fileName}</span>
                          </div>
                        </td>
                        <td>
                          <span className="font-mono text-xs">{record.batchId}</span>
                        </td>
                        <td className="text-sm">{getFileSizeText(record.fileSize)}</td>
                        <td className="text-ink-500 text-sm">
                          {formatDate(record.exportTime)}
                        </td>
                        <td>
                          {record.validated ? (
                            <span className="badge badge-success">已校验</span>
                          ) : (
                            <span className="badge badge-warning">未校验</span>
                          )}
                        </td>
                        <td className="text-right space-x-2">
                          <button
                            onClick={() => {
                              setCompareA(record.id);
                            }}
                            className="text-sm text-brand-600 hover:text-brand-700"
                          >
                            <GitCompare size={14} className="inline mr-1" />
                            对比
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="py-12 text-center text-ink-400">
                  <Clock size={32} className="mx-auto mb-2 opacity-50" />
                  <p>暂无导出记录</p>
                  <p className="text-sm mt-1">导出报表后将显示在此处</p>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="card">
          <div className="card-body py-16 text-center">
            <FileSpreadsheet size={48} className="mx-auto mb-4 text-ink-300" />
            <h3 className="font-display text-lg font-medium text-ink-600 mb-2">
              尚未完成渠道分摊
            </h3>
            <p className="text-sm text-ink-500">
              请先在"兑付处理"页面运行兑付处理，完成后再导出报表
            </p>
          </div>
        </div>
      )}

      {showCompare && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-8">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-ink-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <GitCompare size={18} className="text-brand-600" />
                <h3 className="font-display text-lg font-semibold">版本对比</h3>
              </div>
              <button
                onClick={() => setShowCompare(false)}
                className="p-1 hover:bg-ink-100 rounded"
              >
                <XCircle size={18} className="text-ink-400" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-ink-50 rounded-lg border border-ink-200">
                  <p className="text-xs text-ink-400 mb-1">版本 A</p>
                  <p className="font-medium">{exportRecords.find((e) => e.id === compareA)?.fileName}</p>
                  <p className="text-xs text-ink-400">
                    {formatDate(exportRecords.find((e) => e.id === compareA)?.exportTime || 0)}
                  </p>
                </div>
                <div className="p-4 bg-ink-50 rounded-lg border border-ink-200">
                  <p className="text-xs text-ink-400 mb-1">版本 B</p>
                  <p className="font-medium">{exportRecords.find((e) => e.id === compareB)?.fileName}</p>
                  <p className="text-xs text-ink-400">
                    {formatDate(exportRecords.find((e) => e.id === compareB)?.exportTime || 0)}
                  </p>
                </div>
              </div>

              <div className="text-center py-12 text-ink-400">
                <Eye size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">实际项目中此处将显示两个版本的逐行差异对比</p>
                <p className="text-xs text-ink-300 mt-1">
                  包括：新增行、删除行、修改字段等
                </p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-ink-200 bg-ink-50 flex justify-end">
              <button
                onClick={() => setShowCompare(false)}
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
