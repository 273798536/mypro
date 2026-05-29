import { useEffect, useMemo, useState } from "react";
import {
  DollarSign,
  Gift,
  RotateCcw,
  Wallet,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { useStore } from "@/store/useStore";
import StatusCard from "@/components/StatusCard";

const CHART_COLORS = ["#d4a843", "#1e3a5f", "#2a9d8f", "#e76f51", "#6c5ce7", "#00b894"];

export default function DashboardPage() {
  const {
    allocationResults,
    allocationSummary,
    allocationLoading,
    selectedVersion,
    fetchAllocationResults,
    fetchAllocationSummary,
    filterSpotId,
    filterCardNo,
    setFilterSpotId,
    setFilterCardNo,
  } = useStore();

  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<string>("totalAllocation");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const pageSize = 10;

  useEffect(() => {
    fetchAllocationResults(selectedVersion ?? undefined);
    fetchAllocationSummary(selectedVersion ?? undefined);
  }, [fetchAllocationResults, fetchAllocationSummary, selectedVersion]);

  const scenicSpots = useMemo(() => {
    const spots = new Set(allocationResults.map((r) => r.scenicSpotName));
    return Array.from(spots);
  }, [allocationResults]);

  const filtered = useMemo(() => {
    let data = allocationResults;
    if (filterSpotId) {
      data = data.filter((r) => r.scenicSpotName === filterSpotId);
    }
    if (filterCardNo) {
      data = data.filter((r) =>
        r.cardNo.toLowerCase().includes(filterCardNo.toLowerCase())
      );
    }
    return data;
  }, [allocationResults, filterSpotId, filterCardNo]);

  const sorted = useMemo(() => {
    const data = [...filtered];
    data.sort((a, b) => {
      const aVal = a[sortKey as keyof typeof a];
      const bVal = b[sortKey as keyof typeof b];
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      return sortDir === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
    return data;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paged = sorted.slice((page - 1) * pageSize, page * pageSize);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, r) => ({
        entryCount: acc.entryCount + r.entryCount,
        baseAllocation: acc.baseAllocation + r.baseAllocation,
        subsidyAmount: acc.subsidyAmount + r.subsidyAmount,
        refundAdjustment: acc.refundAdjustment + r.refundAdjustment,
        totalAllocation: acc.totalAllocation + r.totalAllocation,
      }),
      {
        entryCount: 0,
        baseAllocation: 0,
        subsidyAmount: 0,
        refundAdjustment: 0,
        totalAllocation: 0,
      }
    );
  }, [filtered]);

  const pieData = useMemo(() => {
    if (!allocationSummary?.scenicSpotBreakdown) return [];
    return allocationSummary.scenicSpotBreakdown.map((s) => ({
      name: s.scenicSpotName,
      value: s.amount,
    }));
  }, [allocationSummary]);

  const barData = useMemo(() => {
    const grouped: Record<
      string,
      { name: string; baseAllocation: number; subsidyAmount: number; refundAdjustment: number }
    > = {};
    allocationResults.forEach((r) => {
      if (!grouped[r.scenicSpotName]) {
        grouped[r.scenicSpotName] = {
          name: r.scenicSpotName,
          baseAllocation: 0,
          subsidyAmount: 0,
          refundAdjustment: 0,
        };
      }
      grouped[r.scenicSpotName].baseAllocation += r.baseAllocation;
      grouped[r.scenicSpotName].subsidyAmount += r.subsidyAmount;
      grouped[r.scenicSpotName].refundAdjustment += r.refundAdjustment;
    });
    return Object.values(grouped);
  }, [allocationResults]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const handleExport = (format: "excel" | "csv") => {
    const v = selectedVersion ? `?version=${selectedVersion}` : "";
    window.open(`/api/export/${format}${v}`);
  };

  if (allocationLoading && allocationResults.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        加载中...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h2 className="text-xl font-bold text-primary">分摊看板</h2>
        <p className="text-sm text-gray-500 mt-1">
          收入分摊结果总览与明细查看
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatusCard
          label="总分摊收入"
          value={`¥${(allocationSummary?.totalRevenue ?? 0).toLocaleString()}`}
          icon={<DollarSign size={18} />}
        />
        <StatusCard
          label="补贴总额"
          value={`¥${(allocationSummary?.totalSubsidy ?? 0).toLocaleString()}`}
          icon={<Gift size={18} />}
        />
        <StatusCard
          label="退款调整"
          value={`¥${(allocationSummary?.totalRefundAdjustment ?? 0).toLocaleString()}`}
          icon={<RotateCcw size={18} />}
        />
        <StatusCard
          label="净分摊额"
          value={`¥${(allocationSummary?.netAllocation ?? 0).toLocaleString()}`}
          icon={<Wallet size={18} />}
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-700 mb-4">
            各景点分摊占比
          </h3>
          {pieData.length > 0 ? (
            <PieChart width={400} height={300}>
              <Pie
                data={pieData}
                cx={200}
                cy={140}
                innerRadius={50}
                outerRadius={100}
                dataKey="value"
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(1)}%`
                }
              >
                {pieData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => `¥${value.toLocaleString()}`}
              />
            </PieChart>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-400 text-sm">
              暂无数据
            </div>
          )}
        </div>
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-700 mb-4">
            各景点分摊金额对比
          </h3>
          {barData.length > 0 ? (
            <BarChart width={400} height={300} data={barData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value: number) => `¥${value.toLocaleString()}`}
              />
              <Legend />
              <Bar
                dataKey="baseAllocation"
                name="基础分摊"
                fill="#1e3a5f"
              />
              <Bar dataKey="subsidyAmount" name="补贴" fill="#d4a843" />
              <Bar
                dataKey="refundAdjustment"
                name="退款调整"
                fill="#e74c3c"
              />
            </BarChart>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-400 text-sm">
              暂无数据
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-700">分摊明细</h3>
          <div className="flex gap-3">
            <select
              value={filterSpotId ?? ""}
              onChange={(e) => {
                setFilterSpotId(e.target.value || null);
                setPage(1);
              }}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
            >
              <option value="">全部景点</option>
              {scenicSpots.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="搜索年卡号"
                value={filterCardNo ?? ""}
                onChange={(e) => {
                  setFilterCardNo(e.target.value || null);
                  setPage(1);
                }}
                className="border border-gray-300 rounded-md pl-8 pr-3 py-1.5 text-sm w-40"
              />
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500">
                {[
                  { key: "cardNo", label: "年卡号" },
                  { key: "scenicSpotName", label: "景点" },
                  { key: "entryCount", label: "入园次数" },
                  { key: "baseAllocation", label: "基础分摊" },
                  { key: "subsidyAmount", label: "补贴金额" },
                  { key: "refundAdjustment", label: "退款调整" },
                  { key: "totalAllocation", label: "合计分摊" },
                ].map((col) => (
                  <th
                    key={col.key}
                    className="text-left py-3 px-2 cursor-pointer hover:text-primary"
                    onClick={() => handleSort(col.key)}
                  >
                    <span className="flex items-center gap-1">
                      {col.label}
                      <ArrowUpDown size={12} />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="py-2.5 px-2">{r.cardNo}</td>
                  <td className="py-2.5 px-2">{r.scenicSpotName}</td>
                  <td className="py-2.5 px-2">{r.entryCount}</td>
                  <td className="py-2.5 px-2 font-display">
                    ¥{r.baseAllocation.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-2 font-display">
                    ¥{r.subsidyAmount.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-2 font-display text-danger">
                    ¥{r.refundAdjustment.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-2 font-display font-bold text-primary">
                    ¥{r.totalAllocation.toFixed(2)}
                  </td>
                </tr>
              ))}
              {filtered.length > 0 && (
                <tr className="bg-gray-50 font-medium">
                  <td className="py-2.5 px-2">合计</td>
                  <td className="py-2.5 px-2">-</td>
                  <td className="py-2.5 px-2">{totals.entryCount}</td>
                  <td className="py-2.5 px-2 font-display">
                    ¥{totals.baseAllocation.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-2 font-display">
                    ¥{totals.subsidyAmount.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-2 font-display text-danger">
                    ¥{totals.refundAdjustment.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-2 font-display font-bold text-primary">
                    ¥{totals.totalAllocation.toFixed(2)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <span className="text-xs text-gray-500">
              共 {filtered.length} 条，第 {page}/{totalPages} 页
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="p-1.5 rounded border border-gray-300 disabled:opacity-30"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                className="p-1.5 rounded border border-gray-300 disabled:opacity-30"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">报表下载</h3>
          {selectedVersion && (
            <span className="text-xs text-gray-400">
              版本: {selectedVersion}
            </span>
          )}
        </div>
        <div className="flex gap-4 mt-4">
          <button
            onClick={() => handleExport("excel")}
            className="bg-primary text-white px-6 py-2 rounded-lg text-sm hover:bg-primary/90 flex items-center gap-2"
          >
            <Download size={14} />
            下载Excel
          </button>
          <button
            onClick={() => handleExport("csv")}
            className="border border-primary text-primary px-6 py-2 rounded-lg text-sm hover:bg-primary/5 flex items-center gap-2"
          >
            <Download size={14} />
            下载CSV
          </button>
        </div>
      </div>
    </div>
  );
}
