import { useMemo, useState } from "react";
import {
  FileBarChart,
  Plus,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  SkipForward,
  AlertCircle,
  RefreshCw,
  Play,
  FilePlus,
} from "lucide-react";
import { useBatchStore } from "@/store/useBatchStore";
import { useParameterStore } from "@/store/useParameterStore";
import { formatDateTime, formatValue, getBatchResultLabel } from "@/utils/formatters";
import { Modal } from "@/components/Modal";
import type { BatchResultType, ValueType } from "@/types";

export default function Reports() {
  const { batches, results, getResultsByBatchId, runBatch, getLatestBatch } = useBatchStore();
  const { parameters } = useParameterStore();
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);
  const [showRunModal, setShowRunModal] = useState(false);
  const [batchName, setBatchName] = useState("");
  const [resultTypeFilter, setResultTypeFilter] = useState<BatchResultType | "all">("all");

  const latestBatch = getLatestBatch();

  const sortedBatches = useMemo(() => {
    return [...batches].sort(
      (a, b) => new Date(b.runAt).getTime() - new Date(a.runAt).getTime(),
    );
  }, [batches]);

  const handleRunBatch = () => {
    if (!batchName.trim()) return;

    const sampleParams = [
      {
        name: `测试参数 ${Date.now().toString().slice(-4)}`,
        unit: "个",
        formula: "f(x) = x + 1",
        formulaExplanation: "一个简单的测试公式",
        description: "批次运行测试参数",
        value: Math.floor(Math.random() * 100),
        valueType: "normal" as ValueType,
        boundaryConditions: { min: 0 },
        category: "测试",
      },
      {
        name: "拓扑路径最大迭代次数",
        unit: "次",
        formula: "k_max = ⌈log₂(n)⌉ + 1",
        formulaExplanation: "已存在的参数",
        description: "已存在的参数，应被跳过",
        value: 12,
        valueType: "normal" as ValueType,
        boundaryConditions: { min: 1 },
        category: "算法参数",
      },
      {
        name: "空集合测试参数",
        unit: "条",
        formula: "S = ∅",
        formulaExplanation: "空集合测试",
        description: "测试空集合参数",
        value: null,
        valueType: "empty_set" as ValueType,
        boundaryConditions: {},
        category: "测试",
      },
    ];

    runBatch({
      parameters: sampleParams,
      batchName: batchName.trim(),
    });

    setShowRunModal(false);
    setBatchName("");
  };

  const toggleExpand = (batchId: string) => {
    setExpandedBatchId(expandedBatchId === batchId ? null : batchId);
  };

  const getBatchResultsFiltered = (batchId: string) => {
    const items = getResultsByBatchId(batchId);
    if (resultTypeFilter === "all") return items;
    return items.filter((r) => r.resultType === resultTypeFilter);
  };

  const resultTypeColors: Record<BatchResultType, string> = {
    new: "text-approved-600 bg-approved-50 border-approved-200",
    skipped: "text-ink-600 bg-ink-50 border-ink-200",
    updated: "text-blue-600 bg-blue-50 border-blue-200",
    error: "text-red-600 bg-red-50 border-red-200",
  };

  const resultTypeIcons: Record<BatchResultType, typeof Plus> = {
    new: Plus,
    skipped: SkipForward,
    updated: RefreshCw,
    error: AlertCircle,
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif-title text-2xl font-bold text-ink-800">
            运行报告
          </h1>
          <p className="text-sm text-ink-500 mt-1">
            批次运行结果，幂等校验，旧记录保持原计数
          </p>
        </div>
        <button
          onClick={() => setShowRunModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-ink-800 text-white text-sm rounded-lg hover:bg-ink-900 transition-soft shadow-md"
        >
          <Play className="w-4 h-4" />
          运行新批次
        </button>
      </div>

      {latestBatch && (
        <div className="mb-6 bg-gradient-to-r from-ink-800 to-ink-700 rounded-xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-ink-200 mb-1">最近一次运行</div>
              <div className="font-serif-title text-xl font-semibold">
                {latestBatch.name}
              </div>
              <div className="text-sm text-ink-300 mt-1">
                {formatDateTime(latestBatch.runAt)}
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold font-serif-title">
                  {latestBatch.totalCount}
                </div>
                <div className="text-xs text-ink-300">总数</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold font-serif-title text-approved-300">
                  {latestBatch.newCount}
                </div>
                <div className="text-xs text-ink-300">新增</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold font-serif-title text-ink-300">
                  {latestBatch.skippedCount}
                </div>
                <div className="text-xs text-ink-300">跳过</div>
              </div>
              {latestBatch.updatedCount > 0 && (
                <div className="text-center">
                  <div className="text-2xl font-bold font-serif-title text-blue-300">
                    {latestBatch.updatedCount}
                  </div>
                  <div className="text-xs text-ink-300">更新</div>
                </div>
              )}
              {latestBatch.errorCount > 0 && (
                <div className="text-center">
                  <div className="text-2xl font-bold font-serif-title text-red-300">
                    {latestBatch.errorCount}
                  </div>
                  <div className="text-xs text-ink-300">异常</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {sortedBatches.length === 0 ? (
          <div className="text-center py-16 text-ink-400 bg-white rounded-lg shadow-card border border-ink-100">
            <FileBarChart className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <div className="text-sm">暂无运行报告</div>
            <div className="text-xs mt-1">点击右上角运行新批次</div>
          </div>
        ) : (
          sortedBatches.map((batch) => {
            const isExpanded = expandedBatchId === batch.id;
            const filteredResults = getBatchResultsFiltered(batch.id);

            return (
              <div
                key={batch.id}
                className="bg-white rounded-lg shadow-card border border-ink-100 overflow-hidden transition-soft"
              >
                <div
                  className="p-4 cursor-pointer hover:bg-ink-50/50 transition-soft"
                  onClick={() => toggleExpand(batch.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-ink-100 rounded-lg">
                        <FileBarChart className="w-5 h-5 text-ink-600" />
                      </div>
                      <div>
                        <div className="font-medium text-ink-800">{batch.name}</div>
                        <div className="text-xs text-ink-400">
                          {formatDateTime(batch.runAt)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-approved-600 font-medium">
                          +{batch.newCount} 新增
                        </span>
                        <span className="text-ink-500">
                          {batch.skippedCount} 跳过
                        </span>
                        {batch.updatedCount > 0 && (
                          <span className="text-blue-600">
                            {batch.updatedCount} 更新
                          </span>
                        )}
                        {batch.errorCount > 0 && (
                          <span className="text-red-500">
                            {batch.errorCount} 异常
                          </span>
                        )}
                        <span className="text-ink-300">|</span>
                        <span className="text-ink-500">
                          共 {batch.totalCount} 条
                        </span>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-ink-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-ink-400" />
                      )}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-ink-100">
                    <div className="px-4 py-3 bg-ink-50/50 flex items-center gap-2">
                      <span className="text-xs text-ink-500">筛选：</span>
                      {(["all", "new", "skipped", "updated", "error"] as const).map(
                        (type) => (
                          <button
                            key={type}
                            onClick={(e) => {
                              e.stopPropagation();
                              setResultTypeFilter(type);
                            }}
                            className={`px-2.5 py-1 text-xs rounded-md transition-soft ${
                              resultTypeFilter === type
                                ? "bg-ink-700 text-white"
                                : "bg-white text-ink-600 border border-ink-200 hover:border-ink-300"
                            }`}
                          >
                            {type === "all" ? "全部" : getBatchResultLabel(type)}
                          </button>
                        ),
                      )}
                    </div>

                    <div className="max-h-80 overflow-y-auto">
                      {filteredResults.length === 0 ? (
                        <div className="py-8 text-center text-sm text-ink-400">
                          没有匹配的结果
                        </div>
                      ) : (
                        <div className="divide-y divide-ink-100">
                          {filteredResults.map((item) => {
                            const Icon = resultTypeIcons[item.resultType];
                            return (
                              <div
                                key={item.id}
                                className="px-4 py-3 flex items-center gap-3 hover:bg-ink-50/30 transition-soft"
                              >
                                <div
                                  className={`p-1.5 rounded-md ${resultTypeColors[item.resultType]}`}
                                >
                                  <Icon className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-ink-800">
                                    {item.parameterName}
                                  </div>
                                  <div className="text-xs text-ink-400">
                                    {item.reason}
                                  </div>
                                </div>
                                <div className="text-right">
                                  {(item.previousValue !== undefined ||
                                    item.currentValue !== undefined) && (
                                    <div className="flex items-center gap-2 text-xs">
                                      {item.previousValue !== undefined && (
                                        <span className="text-ink-400 font-mono-code line-through">
                                          {formatValue(
                                            item.previousValue,
                                            item.previousValueType ?? "normal",
                                          )}
                                        </span>
                                      )}
                                      {item.currentValue !== undefined && (
                                        <span className="text-ink-700 font-mono-code font-medium">
                                          {formatValue(
                                            item.currentValue,
                                            item.currentValueType ?? "normal",
                                          )}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  <div
                                    className={`text-xs mt-0.5 inline-block px-1.5 py-0.5 rounded ${resultTypeColors[item.resultType]}`}
                                  >
                                    {getBatchResultLabel(item.resultType)}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <Modal
        isOpen={showRunModal}
        onClose={() => setShowRunModal(false)}
        title="运行新批次"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">
              批次名称
            </label>
            <input
              type="text"
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              placeholder="例如：2024年Q2参数重跑"
              className="w-full px-3 py-2 border border-ink-200 rounded-lg text-sm text-ink-800 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-ink-300 focus:border-transparent transition-soft"
            />
          </div>

          <div className="bg-ink-50 rounded-lg p-3">
            <div className="text-xs text-ink-500 mb-2 font-medium">说明</div>
            <ul className="text-xs text-ink-600 space-y-1">
              <li>• 系统将对输入参数进行幂等校验</li>
              <li>• 已存在且值相同的参数会被跳过，不计入新计数</li>
              <li>• 旧记录保持原 id 和计数不变</li>
              <li>• 报告中会标出新增、跳过、更新和异常的内容</li>
            </ul>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setShowRunModal(false)}
              className="px-4 py-2 text-sm text-ink-600 bg-ink-50 hover:bg-ink-100 rounded-lg transition-soft"
            >
              取消
            </button>
            <button
              onClick={handleRunBatch}
              disabled={!batchName.trim()}
              className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-ink-700 hover:bg-ink-800 rounded-lg transition-soft disabled:bg-ink-300 disabled:cursor-not-allowed"
            >
              <Play className="w-4 h-4" />
              开始运行
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
