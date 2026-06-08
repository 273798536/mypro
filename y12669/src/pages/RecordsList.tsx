import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  RefreshCw,
  FileOutput,
  Search,
  RotateCcw,
  Eye,
  Edit3,
  History,
  ChevronLeft,
  ChevronRight,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  List,
} from "lucide-react";
import { useRecordsStore } from "../store/useRecordsStore";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import AnomalyBadge from "../components/AnomalyBadge";
import EmptyState from "../components/EmptyState";
import type { RecordStatus, AnomalyType } from "../../shared/types";
import { STATUS_META, ANOMALY_META } from "../../shared/constants";
import { cn } from "@/lib/utils";

export default function RecordsList() {
  const navigate = useNavigate();
  const {
    records,
    loading,
    filter,
    total,
    statistics,
    fetchRecords,
    setFilter,
  } = useRecordsStore();

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const totalPages = useMemo(() => {
    if (!filter.pageSize) return 1;
    return Math.ceil(total / filter.pageSize) || 1;
  }, [total, filter.pageSize]);

  const handleRefresh = () => {
    fetchRecords();
  };

  const handleStatusChange = (value: string) => {
    const status = value === "all" ? undefined : (value as RecordStatus);
    setFilter({ status, page: 1 });
    fetchRecords();
  };

  const handleAnomalyTypeChange = (value: string) => {
    const anomalyType = value === "all" ? undefined : (value as AnomalyType);
    setFilter({ anomalyType, page: 1 });
    fetchRecords();
  };

  const handleKeywordChange = (value: string) => {
    setFilter({ keyword: value || undefined, page: 1 });
  };

  const handleKeywordSearch = () => {
    fetchRecords();
  };

  const handleStartDateChange = (value: string) => {
    setFilter({ startDate: value || undefined, page: 1 });
    fetchRecords();
  };

  const handleEndDateChange = (value: string) => {
    setFilter({ endDate: value || undefined, page: 1 });
    fetchRecords();
  };

  const handleResetFilter = () => {
    setFilter({
      page: 1,
      pageSize: 10,
      status: undefined,
      anomalyType: undefined,
      keyword: undefined,
      startDate: undefined,
      endDate: undefined,
    });
    fetchRecords();
  };

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setFilter({ page });
    fetchRecords();
  };

  const handleRowClick = (id: string) => {
    navigate(`/records/${id}`);
  };

  const handleViewDetail = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    navigate(`/records/${id}`);
  };

  const handleCorrect = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    navigate(`/records/${id}/correct`);
  };

  const handleHistory = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    navigate(`/records/${id}/history`);
  };

  const statusOptions = [
    { value: "all", label: "全部" },
    ...Object.entries(STATUS_META).map(([value, meta]) => ({
      value,
      label: meta.label,
    })),
  ];

  const anomalyTypeOptions = [
    { value: "all", label: "全部" },
    ...Object.entries(ANOMALY_META).map(([value, meta]) => ({
      value,
      label: meta.name,
    })),
  ];

  const statsCards = [
    {
      label: "总记录数",
      value: statistics?.totalRecords ?? 0,
      icon: <List className="w-5 h-5" />,
      iconBg: "bg-primary-50",
      iconColor: "text-primary-600",
      valueColor: "text-slate-900",
    },
    {
      label: "异常",
      value: statistics?.anomalyCount ?? 0,
      icon: <AlertTriangle className="w-5 h-5" />,
      iconBg: "bg-danger-50",
      iconColor: "text-danger-500",
      valueColor: "text-danger-600",
    },
    {
      label: "已修正",
      value: statistics?.correctedCount ?? 0,
      icon: <CheckCircle2 className="w-5 h-5" />,
      iconBg: "bg-success-50",
      iconColor: "text-success-600",
      valueColor: "text-slate-900",
    },
    {
      label: "待处理",
      value: statistics?.pendingCount ?? 0,
      icon: <Clock className="w-5 h-5" />,
      iconBg: "bg-warning-50",
      iconColor: "text-warning-600",
      valueColor: "text-slate-900",
    },
  ];

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages: (number | "...")[] = [];
    const currentPage = filter.page ?? 1;

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }

    return (
      <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
        <div className="text-sm text-slate-500">
          共 {total} 条记录，第 {currentPage} / {totalPages} 页
        </div>
        <div className="flex items-center gap-1">
          <button
            className="p-2 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </button>
          {pages.map((page, idx) =>
            page === "..." ? (
              <span key={`dots-${idx}`} className="px-3 py-2 text-sm text-slate-400">
                ...
              </span>
            ) : (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={cn(
                  "min-w-[36px] h-9 px-3 rounded-lg text-sm font-medium transition-colors",
                  page === currentPage
                    ? "bg-primary-600 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                )}
              >
                {page}
              </button>
            )
          )}
          <button
            className="p-2 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-surface-secondary">
      <div className="container py-6">
        <PageHeader
          title="救援绳索角度模拟记录"
          description="复核时间参数与风险备注，修正异常记录"
          actions={
            <>
              <button
                className="btn-secondary"
                onClick={handleRefresh}
                disabled={loading}
              >
                <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                刷新
              </button>
              <button
                className="btn-primary"
                onClick={() => navigate("/export")}
              >
                <FileOutput className="w-4 h-4" />
                报告导出
              </button>
            </>
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {statsCards.map((stat) => (
            <div key={stat.label} className="card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 mb-1">{stat.label}</p>
                  <p className={cn("text-2xl font-semibold", stat.valueColor)}>
                    {stat.value}
                  </p>
                </div>
                <div
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    stat.iconBg,
                    stat.iconColor
                  )}
                >
                  {stat.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="card p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="lg:col-span-1">
              <label className="label">状态</label>
              <select
                className="input-field"
                value={filter.status ?? "all"}
                onChange={(e) => handleStatusChange(e.target.value)}
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-1">
              <label className="label">异常类型</label>
              <select
                className="input-field"
                value={filter.anomalyType ?? "all"}
                onChange={(e) => handleAnomalyTypeChange(e.target.value)}
              >
                {anomalyTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-2">
              <label className="label">关键字搜索</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    className="input-field pl-9 pr-3"
                    placeholder="搜索记录编号或风险备注"
                    value={filter.keyword ?? ""}
                    onChange={(e) => handleKeywordChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleKeywordSearch();
                    }}
                  />
                </div>
                <button className="btn-secondary" onClick={handleKeywordSearch}>
                  搜索
                </button>
              </div>
            </div>

            <div className="lg:col-span-1">
              <label className="label">开始日期</label>
              <input
                type="date"
                className="input-field"
                value={filter.startDate ?? ""}
                onChange={(e) => handleStartDateChange(e.target.value)}
              />
            </div>

            <div className="lg:col-span-1">
              <label className="label">结束日期</label>
              <input
                type="date"
                className="input-field"
                value={filter.endDate ?? ""}
                onChange={(e) => handleEndDateChange(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <button className="btn-ghost" onClick={handleResetFilter}>
              <RotateCcw className="w-4 h-4" />
              重置筛选
            </button>
          </div>
        </div>

        <div className="card overflow-hidden">
          {loading && records.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin text-primary-500" />
              <p>加载中...</p>
            </div>
          ) : records.length === 0 ? (
            <EmptyState
              icon={<FileText className="w-8 h-8 text-slate-400" />}
              title="暂无记录"
              description="没有符合筛选条件的记录，请尝试调整筛选条件"
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        记录编号
                      </th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        时间参数
                      </th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        风险备注
                      </th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        状态
                      </th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        异常类型
                      </th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        绳索角度
                      </th>
                      <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {records.map((record) => (
                      <tr
                        key={record.id}
                        className="hover:bg-slate-50 cursor-pointer transition-colors"
                        onClick={() => handleRowClick(record.id)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-slate-900">
                            {record.recordNumber}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-slate-700">
                            {record.timeParameter}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div
                            className="text-sm text-slate-600 max-w-[240px] truncate"
                            title={record.riskNote}
                          >
                            {record.riskNote || "-"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge status={record.status} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {record.anomalyType ? (
                            <AnomalyBadge anomalyType={record.anomalyType} />
                          ) : (
                            <span className="text-sm text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-slate-900">
                            {record.ropeAngle.toFixed(1)}°
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              className="p-2 rounded-lg text-slate-500 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                              title="查看详情"
                              onClick={(e) => handleViewDetail(e, record.id)}
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              className="p-2 rounded-lg text-slate-500 hover:text-warning-600 hover:bg-warning-50 transition-colors"
                              title="修正"
                              onClick={(e) => handleCorrect(e, record.id)}
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              className="p-2 rounded-lg text-slate-500 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                              title="历史"
                              onClick={(e) => handleHistory(e, record.id)}
                            >
                              <History className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {renderPagination()}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
