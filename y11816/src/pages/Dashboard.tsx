import { Link } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  FileUp,
  Cog,
  SearchCheck,
  Calculator,
  FileSpreadsheet,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  ArrowRight,
} from "lucide-react";
import { useSettlementStore } from "@/store/settlementStore";
import { formatCurrency, formatDate } from "@/utils/helpers";

export default function Dashboard() {
  const {
    importBatches,
    anomalies,
    allocationResult,
    processBatches,
    deductionResult,
    changeTrackingResult,
    getCurrentProcessBatch,
  } = useSettlementStore();

  const pendingAnomalies = anomalies.filter((a) => a.status === "pending");
  const duplicateAnomalies = anomalies.filter(
    (a) => a.type === "duplicate_redemption" && a.status === "pending"
  );
  const crossCinemaAnomalies = anomalies.filter(
    (a) => a.type === "cross_cinema" && a.status === "pending"
  );

  const latestBatches = processBatches.slice(0, 5);
  const currentBatch = getCurrentProcessBatch();

  const steps = [
    {
      key: "import",
      label: "数据导入",
      icon: FileUp,
      status: importBatches.length > 0 ? "done" : "current",
      count: importBatches.length,
    },
    {
      key: "process",
      label: "兑付处理",
      icon: Cog,
      status: deductionResult ? "done" : importBatches.length > 0 ? "current" : "pending",
      count: deductionResult ? 1 : 0,
    },
    {
      key: "review",
      label: "异常复核",
      icon: SearchCheck,
      status:
        pendingAnomalies.length === 0 && anomalies.length > 0
          ? "done"
          : deductionResult
          ? "current"
          : "pending",
      count: pendingAnomalies.length,
    },
    {
      key: "settlement",
      label: "渠道结算",
      icon: Calculator,
      status: allocationResult ? "done" : pendingAnomalies.length === 0 ? "current" : "pending",
      count: allocationResult ? 1 : 0,
    },
    {
      key: "export",
      label: "报表导出",
      icon: FileSpreadsheet,
      status: "pending",
      count: 0,
    },
  ];

  const getStepClass = (status: string) => {
    switch (status) {
      case "done":
        return "bg-brand-400 border-brand-400 text-ink-800";
      case "current":
        return "bg-brand-50 border-ink-300 text-brand-700 ring-4 ring-brand-400/20";
      default:
        return "bg-ink-100 border-ink-300 text-ink-400";
    }
  };

  const getLineClass = (idx: number) => {
    if (steps[idx].status === "done") {
      return "bg-brand-400";
    }
    return "bg-ink-200";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold">工作台</h2>
          <p className="text-sm text-ink-500 mt-1">掌握兑付结算全链路进度</p>
        </div>
        {currentBatch && (
          <div className="text-right">
            <p className="text-sm text-ink-500">当前处理批次</p>
            <p className="font-medium text-ink-700">{currentBatch.name}</p>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h3 className="font-display text-lg font-medium">处理进度</h3>
          <span className="text-sm text-ink-500">
            {steps.filter((s) => s.status === "done").length}/{steps.length} 步已完成
          </span>
        </div>
        <div className="card-body">
          <div className="flex items-center justify-between px-4 py-4">
            {steps.map((step, idx) => (
              <div key={step.key} className="flex-1 relative">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${getStepClass(
                      step.status
                    )}`}
                  >
                    {step.status === "done" ? (
                      <CheckCircle size={18} />
                    ) : (
                      <step.icon size={18} />
                    )}
                  </div>
                  <span
                    className={`mt-2 text-sm font-medium ${
                      step.status === "current"
                        ? "text-ink-700"
                        : step.status === "done"
                        ? "text-ink-500"
                        : "text-ink-400"
                    }`}
                  >
                    {step.label}
                  </span>
                  {step.count > 0 && (
                    <span
                      className={`mt-1 text-xs font-mono ${
                        step.status === "current" && step.key === "review"
                          ? "text-accent-danger font-medium"
                          : "text-ink-400"
                      }`}
                    >
                      {step.count} 条待处理
                    </span>
                  )}
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={`absolute top-5 left-1/2 w-full h-0.5 ${getLineClass(idx)}`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Link to="/review" className="card hover:shadow-md transition-shadow">
          <div className="card-body">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-ink-500">待复核异常</p>
                <p className="text-2xl font-display font-bold text-accent-danger mt-1">
                  {pendingAnomalies.length}
                </p>
              </div>
              <div className="p-2 bg-red-50 rounded-lg">
                <AlertTriangle size={20} className="text-accent-danger" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1 text-xs text-ink-400">
              <span className="text-accent-danger">●</span>
              重复核销 {duplicateAnomalies.length}
              <span className="text-accent-warning">●</span>
              跨影院 {crossCinemaAnomalies.length}
            </div>
          </div>
        </Link>

        <div className="card">
          <div className="card-body">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-ink-500">已导入数据批次</p>
                <p className="text-2xl font-display font-bold text-ink-700 mt-1">
                  {importBatches.length}
                </p>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg">
                <FileUp size={20} className="text-accent-info" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1 text-xs text-ink-400">
              {importBatches.filter((b) => b.isSupplementary).length > 0 && (
                <>
                  <span className="text-accent-warning">●</span>
                  含 {importBatches.filter((b) => b.isSupplementary).length} 份后补合同
                </>
              )}
            </div>
          </div>
        </div>

        {allocationResult ? (
          <div className="card">
            <div className="card-body">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-ink-500">本月总金额</p>
                  <p className="text-2xl font-display font-bold text-ink-700 mt-1">
                    {formatCurrency(allocationResult.totalAmount)}
                  </p>
                </div>
                <div className="p-2 bg-green-50 rounded-lg">
                  <TrendingUp size={20} className="text-accent-success" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1 text-xs text-ink-400">
                共 {allocationResult.totalTicketCount} 张券
              </div>
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="card-body">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-ink-500">本月总金额</p>
                  <p className="text-2xl font-display font-bold text-ink-300 mt-1">--</p>
                </div>
                <div className="p-2 bg-ink-100 rounded-lg">
                  <TrendingUp size={20} className="text-ink-300" />
                </div>
              </div>
              <div className="mt-3 text-xs text-ink-400">请先运行兑付处理</div>
            </div>
          </div>
        )}

        {allocationResult ? (
          <div className="card">
            <div className="card-body">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-ink-500">服务费合计</p>
                  <p className="text-2xl font-display font-bold text-ink-700 mt-1">
                    {formatCurrency(allocationResult.totalServiceFee)}
                  </p>
                </div>
                <div className="p-2 bg-red-50 rounded-lg">
                  <TrendingDown size={20} className="text-accent-danger" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1 text-xs text-ink-400">
                净额 {formatCurrency(allocationResult.totalNetAmount)}
              </div>
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="card-body">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-ink-500">服务费合计</p>
                  <p className="text-2xl font-display font-bold text-ink-300 mt-1">--</p>
                </div>
                <div className="p-2 bg-ink-100 rounded-lg">
                  <TrendingDown size={20} className="text-ink-300" />
                </div>
              </div>
              <div className="mt-3 text-xs text-ink-400">请先运行兑付处理</div>
            </div>
          </div>
        )}
      </div>

      {changeTrackingResult && changeTrackingResult.totalImpact > 0 && (
        <div className="card border-accent-warning/30 bg-amber-50">
          <div className="card-header border-amber-200">
            <h3 className="font-display text-lg font-medium text-amber-800">变更影响追踪</h3>
          </div>
          <div className="card-body">
            <p className="text-sm text-amber-700 mb-3">
              上次修改票券信息并重新运行处理后，以下结果发生变化：
            </p>
            <div className="flex items-center gap-4 text-sm">
              <span className="px-2 py-1 bg-white rounded border border-amber-200">
                新增{" "}
                <span className="font-mono font-bold text-accent-success">
                  {changeTrackingResult.summary.added}
                </span>{" "}
                条
              </span>
              <span className="px-2 py-1 bg-white rounded border border-amber-200">
                删除{" "}
                <span className="font-mono font-bold text-accent-danger">
                  {changeTrackingResult.summary.removed}
                </span>{" "}
                条
              </span>
              <span className="px-2 py-1 bg-white rounded border border-amber-200">
                修改{" "}
                <span className="font-mono font-bold text-accent-warning">
                  {changeTrackingResult.summary.modified}
                </span>{" "}
                条
              </span>
            </div>
            <Link
              to="/process"
              className="inline-flex items-center gap-1 mt-3 text-sm text-amber-700 hover:text-amber-900 font-medium"
            >
              查看详细变更 <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        <div className="card col-span-2">
          <div className="card-header flex items-center justify-between">
            <h3 className="font-display text-lg font-medium">最近处理批次</h3>
            <Link
              to="/process"
              className="text-sm text-brand-600 hover:text-brand-700 font-medium"
            >
              查看全部
            </Link>
          </div>
          <div className="card-body p-0">
            {latestBatches.length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>批次名称</th>
                    <th>状态</th>
                    <th className="text-right">创建时间</th>
                    <th className="text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {latestBatches.map((batch) => (
                    <tr key={batch.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{batch.name}</span>
                          <span className="text-xs text-ink-400 font-mono">
                            {batch.id}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`inline-flex items-center gap-1.5 ${
                            batch.status === "exported"
                              ? "text-green-700"
                              : batch.status === "reviewing"
                              ? "text-amber-700"
                              : "text-ink-500"
                          }`}
                        >
                          <span
                            className={`status-dot ${
                              batch.status === "exported"
                                ? "status-dot-success"
                                : batch.status === "reviewing"
                                ? "status-dot-pending"
                                : "status-dot-processing"
                            }`}
                          />
                          {batch.statusLabel}
                        </span>
                      </td>
                      <td className="text-right text-ink-500 text-sm">
                        {formatDate(batch.createdAt)}
                      </td>
                      <td className="text-right">
                        <button className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-brand-600">
                          详情 <ChevronRight size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-12 text-center text-ink-400">
                <Clock size={32} className="mx-auto mb-2 opacity-50" />
                <p>暂无处理批次</p>
                <p className="text-sm mt-1">请先导入数据</p>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="font-display text-lg font-medium">快捷操作</h3>
          </div>
          <div className="card-body">
            <div className="space-y-2">
              <Link
                to="/import"
                className="block p-3 rounded-lg hover:bg-ink-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand-50 rounded-lg">
                    <FileUp size={18} className="text-brand-600" />
                  </div>
                  <div>
                    <p className="font-medium text-ink-700">导入数据</p>
                    <p className="text-xs text-ink-500">票券码、核销记录、渠道合同</p>
                  </div>
                </div>
              </Link>

              <Link
                to="/process"
                className="block p-3 rounded-lg hover:bg-ink-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Cog size={18} className="text-accent-info" />
                  </div>
                  <div>
                    <p className="font-medium text-ink-700">运行兑付处理</p>
                    <p className="text-xs text-ink-500">去重、异常检测、分摊计算</p>
                  </div>
                </div>
              </Link>

              <Link
                to="/review"
                className="block p-3 rounded-lg hover:bg-ink-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-50 rounded-lg">
                    <SearchCheck size={18} className="text-accent-warning" />
                  </div>
                  <div>
                    <p className="font-medium text-ink-700">异常复核</p>
                    <p className="text-xs text-ink-500">逐条处理异常记录</p>
                  </div>
                </div>
              </Link>

              <Link
                to="/settlement"
                className="block p-3 rounded-lg hover:bg-ink-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <Calculator size={18} className="text-accent-success" />
                  </div>
                  <div>
                    <p className="font-medium text-ink-700">渠道结算</p>
                    <p className="text-xs text-ink-500">核对分摊明细、溯源不一致</p>
                  </div>
                </div>
              </Link>

              <Link
                to="/export"
                className="block p-3 rounded-lg hover:bg-ink-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <FileSpreadsheet size={18} className="text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-ink-700">导出报表</p>
                    <p className="text-xs text-ink-500">导出Excel结算报表</p>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
