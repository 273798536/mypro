import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Hash,
  CircleSlash2,
  CircleDot,
  Search,
  Filter,
  Play,
  FilePlus,
  AlertTriangle,
  CheckCircle2,
  Copy,
} from "lucide-react";
import { useParameterStore } from "@/store/useParameterStore";
import { useBatchStore } from "@/store/useBatchStore";
import { StatCard } from "@/components/StatCard";
import { ParameterRow } from "@/components/ParameterRow";
import { StatusBadge } from "@/components/StatusBadge";
import { getRelativeTime } from "@/utils/formatters";
import type { ParameterStatus, ValueType } from "@/types";

export default function Dashboard() {
  const navigate = useNavigate();
  const {
    parameters,
    filterStatus,
    filterValueType,
    searchQuery,
    selectedCategory,
    setFilterStatus,
    setFilterValueType,
    setSearchQuery,
    setSelectedCategory,
    getFilteredParameters,
    getCategories,
  } = useParameterStore();

  const { batches, getLatestBatch } = useBatchStore();

  const filteredParameters = useMemo(
    () => getFilteredParameters(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [parameters, filterStatus, filterValueType, searchQuery, selectedCategory],
  );

  const categories = useMemo(() => getCategories(), [parameters]);
  const latestBatch = getLatestBatch();

  const stats = useMemo(() => {
    const total = parameters.length;
    const emptySetCount = parameters.filter((p) => p.valueType === "empty_set").length;
    const zeroCount = parameters.filter((p) => p.valueType === "zero").length;
    const needsReviewCount = parameters.filter((p) => p.status === "needs_review").length;
    const duplicateCount = parameters.filter((p) => p.status === "duplicate").length;
    const approvedCount = parameters.filter((p) => p.status === "approved").length;
    return { total, emptySetCount, zeroCount, needsReviewCount, duplicateCount, approvedCount };
  }, [parameters]);

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="font-serif-title text-2xl font-bold text-ink-800">
          参数沙盘总览
        </h1>
        <p className="text-sm text-ink-500 mt-1">
          系统地梳理参数表中的特殊值与边界情况，让复核有据可依
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <StatCard
          icon={<Hash className="w-5 h-5" />}
          value={stats.total}
          label="总参数"
          color="default"
        />
        <StatCard
          icon={<CircleSlash2 className="w-5 h-5" />}
          value={stats.emptySetCount}
          label="空集合"
          color="empty"
        />
        <StatCard
          icon={<CircleDot className="w-5 h-5" />}
          value={stats.zeroCount}
          label="零值参数"
          color="zero"
        />
        <StatCard
          icon={<AlertTriangle className="w-5 h-5" />}
          value={stats.needsReviewCount}
          label="待重点复核"
          color="review"
        />
        <StatCard
          icon={<Copy className="w-5 h-5" />}
          value={stats.duplicateCount}
          label="重复样本"
          color="duplicate"
        />
        <StatCard
          icon={<CheckCircle2 className="w-5 h-5" />}
          value={stats.approvedCount}
          label="已通过"
          color="approved"
        />
      </div>

      {latestBatch && (
        <div className="mb-6 bg-white rounded-lg shadow-card border border-parchment-100 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-ink-100 rounded-lg">
                <Play className="w-5 h-5 text-ink-600" />
              </div>
              <div>
                <div className="text-sm font-medium text-ink-800">
                  最近运行：{latestBatch.name}
                </div>
                <div className="text-xs text-ink-400">
                  {getRelativeTime(latestBatch.runAt)} · 共 {latestBatch.totalCount} 条
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-approved-600 font-medium">
                新增 {latestBatch.newCount}
              </span>
              <span className="text-ink-500">
                跳过 {latestBatch.skippedCount}
              </span>
              {latestBatch.updatedCount > 0 && (
                <span className="text-blue-600">
                  更新 {latestBatch.updatedCount}
                </span>
              )}
              {latestBatch.errorCount > 0 && (
                <span className="text-red-500">
                  异常 {latestBatch.errorCount}
                </span>
              )}
            </div>
            <button
              onClick={() => navigate("/reports")}
              className="text-sm text-ink-600 hover:text-ink-800 transition-soft"
            >
              查看详情 →
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-card border border-parchment-100 overflow-hidden">
        <div className="p-4 border-b border-ink-100">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索参数名称、描述..."
                className="w-full pl-9 pr-3 py-2 border border-ink-200 rounded-lg text-sm text-ink-800 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-ink-300 focus:border-transparent transition-soft"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-ink-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as ParameterStatus | "all")}
                className="px-2.5 py-2 border border-ink-200 rounded-lg text-sm text-ink-700 bg-white focus:outline-none focus:ring-2 focus:ring-ink-300 focus:border-transparent transition-soft"
              >
                <option value="all">全部状态</option>
                <option value="pending">待复核</option>
                <option value="needs_review">需重点复核</option>
                <option value="approved">已通过</option>
                <option value="rejected">已驳回</option>
                <option value="duplicate">重复样本</option>
              </select>

              <select
                value={filterValueType}
                onChange={(e) =>
                  setFilterValueType(e.target.value as "all" | "empty_set" | "zero" | "normal")
                }
                className="px-2.5 py-2 border border-ink-200 rounded-lg text-sm text-ink-700 bg-white focus:outline-none focus:ring-2 focus:ring-ink-300 focus:border-transparent transition-soft"
              >
                <option value="all">全部值类型</option>
                <option value="normal">正常值</option>
                <option value="empty_set">空集合</option>
                <option value="zero">零值</option>
              </select>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-2.5 py-2 border border-ink-200 rounded-lg text-sm text-ink-700 bg-white focus:outline-none focus:ring-2 focus:ring-ink-300 focus:border-transparent transition-soft"
              >
                <option value="all">全部分类</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => navigate("/reports")}
              className="ml-auto flex items-center gap-1.5 px-3 py-2 bg-ink-800 text-white text-sm rounded-lg hover:bg-ink-900 transition-soft shadow-md"
            >
              <FilePlus className="w-4 h-4" />
              运行批次
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-ink-50/50 text-left text-xs text-ink-500 uppercase tracking-wider">
                <th className="px-4 py-2.5 font-medium">参数名称</th>
                <th className="px-4 py-2.5 font-medium">当前值</th>
                <th className="px-4 py-2.5 font-medium">状态</th>
                <th className="px-4 py-2.5 font-medium text-right">更新时间</th>
                <th className="px-3 py-2.5 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {filteredParameters.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-ink-400">
                    <div className="text-sm">暂无匹配的参数</div>
                    <div className="text-xs mt-1">试试调整筛选条件</div>
                  </td>
                </tr>
              ) : (
                filteredParameters.map((param) => (
                  <ParameterRow key={param.id} parameter={param} />
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 bg-ink-50/30 border-t border-ink-100 flex items-center justify-between text-xs text-ink-500">
          <span>
            共 {filteredParameters.length} 条参数
            {filteredParameters.length !== parameters.length &&
              ` / ${parameters.length} 条总计`}
          </span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-empty-200" />
              空集合
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-zero-200" />
              零值
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-duplicate-200" />
              重复样本
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
