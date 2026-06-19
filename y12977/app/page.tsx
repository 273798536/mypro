"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  Clock,
  CheckCircle,
  ChevronRight,
  Play,
  Database,
  ShieldCheck,
} from "lucide-react";
import { formatTime, MODE_LABEL, SEVERITY_LABEL, CATEGORY_LABEL } from "@/lib/utils";
import type { ScanBatch } from "@/lib/types";

interface SummaryData {
  totalBatches: number;
  totalDirty: number;
  totalSlow: number;
  pendingCount: number;
}

interface TrendItem {
  id: number;
  batch_no: string;
  d: string;
  dirty_rows: number;
  total_rows: number;
  slow_queries: number;
}

export default function HomePage() {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [batches, setBatches] = useState<ScanBatch[]>([]);
  const [trend, setTrend] = useState<TrendItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/batches?limit=10")
      .then((r) => r.json())
      .then((data) => {
        setSummary(data.summary);
        setBatches(data.list);
        setTrend(data.trend);
        setLoading(false);
      });
  }, []);

  const statsCards = [
    {
      label: "扫描批次",
      value: summary?.totalBatches ?? 0,
      icon: Activity,
      color: "bg-indigo-500",
      bg: "bg-indigo-50",
      text: "text-indigo-700",
    },
    {
      label: "脏行总数",
      value: summary?.totalDirty ?? 0,
      icon: AlertTriangle,
      color: "bg-rose-500",
      bg: "bg-rose-50",
      text: "text-rose-700",
    },
    {
      label: "慢查询",
      value: summary?.totalSlow ?? 0,
      icon: Clock,
      color: "bg-amber-500",
      bg: "bg-amber-50",
      text: "text-amber-700",
    },
    {
      label: "待复核",
      value: summary?.pendingCount ?? 0,
      icon: CheckCircle,
      color: "bg-emerald-500",
      bg: "bg-emerald-50",
      text: "text-emerald-700",
    },
  ];

  const PIE_COLORS = ["#f43f5e", "#f59e0b", "#0ea5e9", "#8b5cf6", "#f97316"];

  const pieData = [
    { name: "权限越权", value: 0 },
    { name: "数据缺失", value: 0 },
    { name: "值域违规", value: 0 },
    { name: "重复主键", value: 0 },
    { name: "格式错误", value: 0 },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">运行概览</h1>
        <p className="text-sm text-zinc-500 mt-1">
          数据质量脏行隔离 · 安全审计工作台 · 所有数据均来自同一批次检测记录，可追溯
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={`${card.bg} rounded-xl p-5 border border-zinc-100`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${card.text} font-medium`}>{card.label}</p>
                  <p className={`text-3xl font-bold mt-2 ${card.text}`}>
                    {card.value.toLocaleString()}
                  </p>
                </div>
                <div className={`${card.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-zinc-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-zinc-900">扫描趋势</h2>
            <span className="text-xs text-zinc-500">最近 30 批次</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="d"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickLine={false}
                />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Line
                  type="monotone"
                  dataKey="dirty_rows"
                  name="脏行数"
                  stroke="#f43f5e"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="slow_queries"
                  name="慢查询数"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-zinc-900">脏行分类</h2>
            <Link
              href="/dirty-rows"
              className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              查看明细 <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1 mt-2">
            {pieData.map((item, i) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: PIE_COLORS[i] }}
                  />
                  <span className="text-zinc-600">{item.name}</span>
                </div>
                <span className="text-zinc-500 font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-zinc-900">最近扫描批次</h2>
            <p className="text-xs text-zinc-500 mt-1">
              点击批次号可查看该批次下的脏行、备份、慢查询明细（同源数据）
            </p>
          </div>
          <Link
            href="/dirty-rows"
            className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            查看脏行明细
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-zinc-600 text-xs">批次号</th>
                <th className="text-left px-5 py-3 font-medium text-zinc-600 text-xs">模式</th>
                <th className="text-left px-5 py-3 font-medium text-zinc-600 text-xs">操作人</th>
                <th className="text-left px-5 py-3 font-medium text-zinc-600 text-xs">扫描时间</th>
                <th className="text-right px-5 py-3 font-medium text-zinc-600 text-xs">总行数</th>
                <th className="text-right px-5 py-3 font-medium text-zinc-600 text-xs">脏行</th>
                <th className="text-right px-5 py-3 font-medium text-zinc-600 text-xs">慢查询</th>
                <th className="text-left px-5 py-3 font-medium text-zinc-600 text-xs">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {batches.map((batch) => {
                const mode = MODE_LABEL[batch.scan_mode];
                return (
                  <tr key={batch.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-5 py-3">
                      <span className="font-mono text-xs text-zinc-700 font-medium">
                        {batch.batch_no}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${mode?.color}`}
                      >
                        {mode?.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-zinc-600">{batch.operator}</td>
                    <td className="px-5 py-3 text-zinc-500 text-xs">
                      {formatTime(batch.started_at)}
                    </td>
                    <td className="px-5 py-3 text-right text-zinc-600">
                      {batch.total_rows.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="text-rose-600 font-medium">
                        {batch.dirty_rows}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="text-amber-600 font-medium">
                        {batch.slow_queries}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/dirty-rows?batch_id=${batch.id}`}
                          className="text-xs text-indigo-600 hover:text-indigo-700"
                        >
                          脏行
                        </Link>
                        <span className="text-zinc-300">|</span>
                        <Link
                          href={`/compare?batch_a=${batch.id}`}
                          className="text-xs text-indigo-600 hover:text-indigo-700"
                        >
                          对比
                        </Link>
                        <span className="text-zinc-300">|</span>
                        <Link
                          href={`/slow-queries?batch_id=${batch.id}`}
                          className="text-xs text-indigo-600 hover:text-indigo-700"
                        >
                          慢查询
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-gradient-to-r from-indigo-50 to-violet-50 rounded-xl p-5 border border-indigo-100">
        <div className="flex items-start gap-4">
          <div className="bg-white p-3 rounded-lg shadow-sm">
            <ShieldCheck className="w-6 h-6 text-indigo-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-zinc-900">数据同源说明</h3>
            <p className="text-sm text-zinc-600 mt-1 leading-relaxed">
              本工作台的图表统计、脏行明细、慢查询归因、备份对比、导出文件，均来自<strong>同一批</strong>扫描记录。
              每批次扫描生成唯一批次号，关联备份记录、脏行检测结果、慢查询分析结果。
              安全审计员可顺着一条脏行 → 备份记录 → 批次 → 慢查询，完整追溯全链路。
            </p>
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1 text-xs text-zinc-500">
                <Database className="w-3 h-3" />
                <span>备份记录</span>
              </div>
              <ChevronRight className="w-3 h-3 text-zinc-400" />
              <div className="flex items-center gap-1 text-xs text-zinc-500">
                <AlertTriangle className="w-3 h-3" />
                <span>脏行检测</span>
              </div>
              <ChevronRight className="w-3 h-3 text-zinc-400" />
              <div className="flex items-center gap-1 text-xs text-zinc-500">
                <Clock className="w-3 h-3" />
                <span>慢查询归因</span>
              </div>
              <ChevronRight className="w-3 h-3 text-zinc-400" />
              <div className="flex items-center gap-1 text-xs text-zinc-500">
                <CheckCircle className="w-3 h-3" />
                <span>复核留痕</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
