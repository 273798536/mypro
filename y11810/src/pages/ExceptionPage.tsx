import { useState, useEffect } from "react";
import { AlertTriangle, Eye, CheckSquare, PieChart } from "lucide-react";
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, Column } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { getExceptions, handleException } from "@/api/exception";
import type { ExceptionRecord } from "@/../shared/types";

const typeLabels: Record<string, string> = {
  click_missing: "点击缺失",
  click_anomaly: "异常点击",
  duplicate_conversion: "重复转化",
  rule_change: "规则变更",
  data_inconsistency: "数据不一致",
};

const COLORS = ["#EF4444", "#F59E0B", "#3B82F6", "#8B5CF6", "#10B981"];

export default function ExceptionPage() {
  const [exceptions, setExceptions] = useState<ExceptionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [filters, setFilters] = useState({ type: "", level: "", status: "", startDate: "", endDate: "" });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedException, setSelectedException] = useState<ExceptionRecord | null>(null);
  const [handleForm, setHandleForm] = useState({ status: "resolved", handleNote: "" });

  useEffect(() => {
    loadExceptions();
  }, [pagination.current, filters]);

  const loadExceptions = async () => {
    setLoading(true);
    try {
      const res = await getExceptions({ page: pagination.current, pageSize: pagination.pageSize, ...filters });
      setExceptions(res.items);
      setPagination((p) => ({ ...p, total: res.total }));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (record: ExceptionRecord) => {
    setSelectedException(record);
    setHandleForm({ status: "resolved", handleNote: "" });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (selectedException) {
      await handleException(selectedException.id, handleForm);
      setDialogOpen(false);
      loadExceptions();
    }
  };

  const statsData = [
    { name: "点击缺失", value: exceptions.filter(e => e.type === "click_missing" && e.status === "pending").length },
    { name: "异常点击", value: exceptions.filter(e => e.type === "click_anomaly" && e.status === "pending").length },
    { name: "重复转化", value: exceptions.filter(e => e.type === "duplicate_conversion" && e.status === "pending").length },
    { name: "规则变更", value: exceptions.filter(e => e.type === "rule_change" && e.status === "pending").length },
    { name: "数据不一致", value: exceptions.filter(e => e.type === "data_inconsistency" && e.status === "pending").length },
  ].filter(d => d.value > 0);

  const columns: Column<ExceptionRecord>[] = [
    {
      key: "type",
      title: "异常类型",
      width: 120,
      render: (row) => typeLabels[row.type] || row.type,
    },
    {
      key: "level",
      title: "级别",
      width: 80,
      render: (row) => (
        <StatusBadge status={row.level === "high" ? "error" : row.level === "medium" ? "warning" : "info"}>
          {row.level === "high" ? "高" : row.level === "medium" ? "中" : "低"}
        </StatusBadge>
      ),
    },
    { key: "title", title: "标题", width: 200 },
    { key: "affectedCount", title: "影响记录数", width: 100, render: (r) => r.affectedCount.toLocaleString() },
    {
      key: "status",
      title: "状态",
      width: 100,
      render: (row) => (
        <StatusBadge status={row.status === "resolved" ? "success" : row.status === "pending" ? "warning" : row.status === "processing" ? "primary" : "info"}>
          {row.status === "pending" ? "待处理" : row.status === "processing" ? "处理中" : row.status === "resolved" ? "已解决" : "已忽略"}
        </StatusBadge>
      ),
    },
    { key: "createdAt", title: "创建时间", width: 160, render: (r) => new Date(r.createdAt).toLocaleString("zh-CN") },
    {
      key: "actions",
      title: "操作",
      width: 120,
      render: (row) => (
        <div className="flex gap-1">
          {row.status === "pending" && (
            <button onClick={() => handleOpenDialog(row)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="处理">
              <CheckSquare className="h-4 w-4" />
            </button>
          )}
          <button className="p-1 text-gray-600 hover:bg-gray-100 rounded" title="查看详情">
            <Eye className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6">
      <PageHeader title="异常中心" description="监控和处理结算过程中的异常情况">
        <div className="flex items-center gap-2 text-[13px] text-gray-500">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          待处理异常: {exceptions.filter(e => e.status === "pending").length} 条
        </div>
      </PageHeader>

      <div className="mb-6 grid grid-cols-5 gap-4">
        <div className="col-span-3 grid grid-cols-4 gap-4">
          {[
            { label: "待处理", value: exceptions.filter(e => e.status === "pending").length, color: "text-orange-600" },
            { label: "处理中", value: exceptions.filter(e => e.status === "processing").length, color: "text-blue-600" },
            { label: "已解决", value: exceptions.filter(e => e.status === "resolved").length, color: "text-green-600" },
            { label: "已忽略", value: exceptions.filter(e => e.status === "ignored").length, color: "text-gray-500" },
          ].map((item, i) => (
            <div key={i} className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-[12px] text-gray-500">{item.label}</p>
              <p className={`mt-1 text-[24px] font-bold ${item.color}`}>{item.value}</p>
            </div>
          ))}
        </div>
        <div className="col-span-2 rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-2 flex items-center gap-1">
            <PieChart className="h-4 w-4 text-gray-500" />
            <p className="text-[12px] text-gray-500">未处理异常按类型分布</p>
          </div>
          {statsData.length > 0 ? (
            <ResponsiveContainer width="100%" height={120}>
              <RePieChart>
                <Pie data={statsData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={45}>
                  {statsData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </RePieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[120px] items-center justify-center text-[13px] text-gray-400">暂无未处理异常</div>
          )}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3 rounded-lg border border-gray-200 bg-white p-4">
        <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })} className="rounded border border-gray-300 px-3 py-2 text-[13px]">
          <option value="">全部类型</option>
          {Object.entries(typeLabels).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select value={filters.level} onChange={(e) => setFilters({ ...filters, level: e.target.value })} className="rounded border border-gray-300 px-3 py-2 text-[13px]">
          <option value="">全部级别</option>
          <option value="high">高</option>
          <option value="medium">中</option>
          <option value="low">低</option>
        </select>
        <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="rounded border border-gray-300 px-3 py-2 text-[13px]">
          <option value="">全部状态</option>
          <option value="pending">待处理</option>
          <option value="processing">处理中</option>
          <option value="resolved">已解决</option>
          <option value="ignored">已忽略</option>
        </select>
        <input type="date" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} className="rounded border border-gray-300 px-3 py-2 text-[13px]" />
        <input type="date" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} className="rounded border border-gray-300 px-3 py-2 text-[13px]" />
        <button onClick={loadExceptions} className="rounded bg-gray-100 px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-200">查询</button>
      </div>

      <DataTable
        columns={columns}
        data={exceptions}
        loading={loading}
        pagination={pagination}
        onPageChange={(page) => setPagination((p) => ({ ...p, current: page }))}
        expandable={{
          expandedRowRender: (row) => (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[12px] text-gray-500">异常详情</p>
                  <p className="mt-1 text-[13px] text-gray-700">{row.description}</p>
                </div>
                <div>
                  <p className="text-[12px] text-gray-500">建议处理方式</p>
                  <p className="mt-1 text-[13px] text-blue-600">{row.suggestion}</p>
                </div>
              </div>
              <div>
                <p className="text-[12px] text-gray-500">影响范围</p>
                <p className="mt-1 text-[13px] text-gray-700">影响记录数: {row.affectedCount} 条 | 关联运行批次: {row.affectedRunIds.join(", ")}</p>
              </div>
              {row.handledBy && (
                <div className="grid grid-cols-3 gap-4 rounded bg-gray-50 p-3">
                  <div>
                    <p className="text-[12px] text-gray-500">处理人</p>
                    <p className="text-[13px] text-gray-700">{row.handledBy}</p>
                  </div>
                  <div>
                    <p className="text-[12px] text-gray-500">处理时间</p>
                    <p className="text-[13px] text-gray-700">{row.handledAt && new Date(row.handledAt).toLocaleString("zh-CN")}</p>
                  </div>
                  <div>
                    <p className="text-[12px] text-gray-500">处理备注</p>
                    <p className="text-[13px] text-gray-700">{row.handleNote}</p>
                  </div>
                </div>
              )}
            </div>
          ),
        }}
      />

      <ConfirmDialog
        open={dialogOpen}
        title="处理异常"
        onConfirm={handleSubmit}
        onCancel={() => setDialogOpen(false)}
        confirmText="提交处理"
        content={
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-[13px] font-medium text-gray-700">处理状态</label>
              <select value={handleForm.status} onChange={(e) => setHandleForm({ ...handleForm, status: e.target.value })} className="w-full rounded border border-gray-300 px-3 py-2 text-[13px]">
                <option value="resolved">已解决</option>
                <option value="ignored">已忽略</option>
                <option value="processing">处理中</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-medium text-gray-700">处理备注</label>
              <textarea value={handleForm.handleNote} onChange={(e) => setHandleForm({ ...handleForm, handleNote: e.target.value })} rows={3} className="w-full rounded border border-gray-300 px-3 py-2 text-[13px]" placeholder="请输入处理备注..." />
            </div>
          </div>
        }
      />
    </div>
  );
}
