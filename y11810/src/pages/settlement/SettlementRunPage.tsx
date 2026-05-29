import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Play, Eye, GitCompare, CheckCircle, Download } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, Column } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { getRuns, createRun, runSettlement, confirmRun, exportRun } from "@/api/settlement";
import type { SettlementRun } from "@/../shared/types";

const statusMap: Record<string, { label: string; type: "success" | "warning" | "error" | "info" | "primary" }> = {
  pending: { label: "待运行", type: "info" },
  running: { label: "运行中", type: "primary" },
  completed: { label: "已完成", type: "success" },
  failed: { label: "失败", type: "error" },
};

export default function SettlementRunPage() {
  const navigate = useNavigate();
  const [runs, setRuns] = useState<SettlementRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [filters, setFilters] = useState({ channelId: "", startDate: "", endDate: "", status: "" });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; id?: string; action?: string }>({ open: false });
  const [formData, setFormData] = useState({ channelId: "", startDate: "", endDate: "", baseRunId: "" });

  useEffect(() => {
    loadRuns();
  }, [pagination.current, filters]);

  const loadRuns = async () => {
    setLoading(true);
    try {
      const res = await getRuns({ page: pagination.current, pageSize: pagination.pageSize, ...filters });
      setRuns(res.items);
      setPagination((p) => ({ ...p, total: res.total }));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRun = async () => {
    await createRun(formData);
    setDialogOpen(false);
    loadRuns();
  };

  const handleRunSettlement = async (id: string) => {
    await runSettlement(id);
    setConfirmDialog({ open: false });
    loadRuns();
  };

  const handleConfirmRun = async (id: string) => {
    await confirmRun(id);
    setConfirmDialog({ open: false });
    loadRuns();
  };

  const handleExport = async (id: string) => {
    const blob = await exportRun(id);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `settlement-${id}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns: Column<SettlementRun>[] = [
    { key: "batchNo", title: "批次号", width: 120 },
    { key: "channelId", title: "渠道", width: 100 },
    {
      key: "dateRange",
      title: "数据范围",
      width: 180,
      render: (row) => `${row.startDate} ~ ${row.endDate}`,
    },
    {
      key: "status",
      title: "状态",
      width: 80,
      render: (row) => (
        <StatusBadge status={statusMap[row.status].type}>{statusMap[row.status].label}</StatusBadge>
      ),
    },
    { key: "totalImpressions", title: "曝光量", width: 80, render: (r) => r.totalImpressions.toLocaleString() },
    { key: "totalClicks", title: "点击量", width: 80, render: (r) => r.totalClicks.toLocaleString() },
    { key: "totalConversions", title: "转化量", width: 80, render: (r) => r.totalConversions.toLocaleString() },
    { key: "totalAmount", title: "预估佣金", width: 100, render: (r) => `¥${r.totalAmount.toFixed(2)}` },
    { key: "deductionAmount", title: "扣减金额", width: 100, render: (r) => `¥${r.deductionAmount.toFixed(2)}` },
    { key: "finalAmount", title: "实结金额", width: 100, render: (r) => `¥${r.finalAmount.toFixed(2)}` },
    { key: "createdAt", title: "创建时间", width: 160, render: (r) => new Date(r.createdAt).toLocaleString("zh-CN") },
    {
      key: "actions",
      title: "操作",
      width: 200,
      render: (row) => (
        <div className="flex gap-1">
          {row.status === "pending" && (
            <button onClick={() => setConfirmDialog({ open: true, id: row.id, action: "run" })} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="运行结算">
              <Play className="h-4 w-4" />
            </button>
          )}
          <button onClick={() => navigate(`/settlement/runs/${row.id}`)} className="p-1 text-gray-600 hover:bg-gray-100 rounded" title="查看详情">
            <Eye className="h-4 w-4" />
          </button>
          {row.baseRunId && (
            <button onClick={() => navigate(`/settlement/runs/${row.id}?compare=${row.baseRunId}`)} className="p-1 text-purple-600 hover:bg-purple-50 rounded" title="对比分析">
              <GitCompare className="h-4 w-4" />
            </button>
          )}
          {row.status === "completed" && (
            <button onClick={() => setConfirmDialog({ open: true, id: row.id, action: "confirm" })} className="p-1 text-green-600 hover:bg-green-50 rounded" title="确认结算">
              <CheckCircle className="h-4 w-4" />
            </button>
          )}
          <button onClick={() => handleExport(row.id)} className="p-1 text-orange-600 hover:bg-orange-50 rounded" title="导出">
            <Download className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6">
      <PageHeader title="结算运行" description="管理和执行结算批次运行">
        <button onClick={() => setDialogOpen(true)} className="flex items-center gap-1 rounded bg-primary px-4 py-2 text-[14px] text-white hover:bg-primary/90">
          <Plus className="h-4 w-4" /> 新建运行
        </button>
      </PageHeader>

      <div className="mb-4 flex flex-wrap gap-3 rounded-lg border border-gray-200 bg-white p-4">
        <select value={filters.channelId} onChange={(e) => setFilters({ ...filters, channelId: e.target.value })} className="rounded border border-gray-300 px-3 py-2 text-[13px]">
          <option value="">全部渠道</option>
          <option value="douyin">抖音</option>
          <option value="xiaohongshu">小红书</option>
        </select>
        <input type="date" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} className="rounded border border-gray-300 px-3 py-2 text-[13px]" />
        <input type="date" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} className="rounded border border-gray-300 px-3 py-2 text-[13px]" />
        <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="rounded border border-gray-300 px-3 py-2 text-[13px]">
          <option value="">全部状态</option>
          {Object.entries(statusMap).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <button onClick={loadRuns} className="rounded bg-gray-100 px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-200">查询</button>
      </div>

      <DataTable columns={columns} data={runs} loading={loading} pagination={pagination} onPageChange={(page) => setPagination((p) => ({ ...p, current: page }))} />

      {dialogOpen && (
        <ConfirmDialog open={dialogOpen} title="新建结算运行" onConfirm={handleCreateRun} onCancel={() => setDialogOpen(false)} confirmText="创建" content={
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-[13px] font-medium text-gray-700">渠道</label>
              <select value={formData.channelId} onChange={(e) => setFormData({ ...formData, channelId: e.target.value })} className="w-full rounded border border-gray-300 px-3 py-2 text-[13px]">
                <option value="">请选择渠道</option>
                <option value="douyin">抖音</option>
                <option value="xiaohongshu">小红书</option>
              </select>
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-[13px] font-medium text-gray-700">开始日期</label>
                <input type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} className="w-full rounded border border-gray-300 px-3 py-2 text-[13px]" />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-[13px] font-medium text-gray-700">结束日期</label>
                <input type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} className="w-full rounded border border-gray-300 px-3 py-2 text-[13px]" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-medium text-gray-700">基线运行（可选，用于对比）</label>
              <select value={formData.baseRunId} onChange={(e) => setFormData({ ...formData, baseRunId: e.target.value })} className="w-full rounded border border-gray-300 px-3 py-2 text-[13px]">
                <option value="">无</option>
                {runs.filter(r => r.status === "completed").slice(0, 5).map(r => (
                  <option key={r.id} value={r.id}>{r.batchNo}</option>
                ))}
              </select>
            </div>
          </div>
        } />
      )}

      <ConfirmDialog open={confirmDialog.open} title={confirmDialog.action === "run" ? "确认运行结算" : "确认结算"} content={confirmDialog.action === "run" ? "确定要运行此结算批次吗？" : "确定要确认此结算吗？确认后将生成账单。"} onConfirm={() => {
        if (confirmDialog.action === "run" && confirmDialog.id) handleRunSettlement(confirmDialog.id);
        if (confirmDialog.action === "confirm" && confirmDialog.id) handleConfirmRun(confirmDialog.id);
      }} onCancel={() => setConfirmDialog({ open: false })} />
    </div>
  );
}
