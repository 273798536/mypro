import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, Download, GitCompare } from 'lucide-react';
import type { SettlementRun, DiffResult } from '@/../../shared/types';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable, type Column } from '@/components/common/DataTable';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Alert } from '@/components/common/Alert';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { getRun, confirmRun, compareRuns, exportRun } from '@/api/settlement';

export default function SettlementRunDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [run, setRun] = useState<SettlementRun | null>(null);
  const [details, setDetails] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);
  const [baseRunId, setBaseRunId] = useState('');
  const [diffResults, setDiffResults] = useState<DiffResult[]>([]);
  const [alert, setAlert] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    description?: string;
  } | null>(null);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getRun(id);
      setRun(data.run);
      setDetails(data.details || []);
    } catch (error) {
      console.error('Failed to load run:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  useEffect(() => {
    const compareId = searchParams.get('compare');
    if (compareId && id) {
      setBaseRunId(compareId);
      handleCompareWithBase(compareId);
    }
  }, [searchParams, run]);

  const handleCompareWithBase = async (baseId: string) => {
    if (!id || !baseId) return;
    try {
      const result = await compareRuns(id, baseId);
      setDiffResults(result?.diffs || []);
    } catch (error) {
      console.error('Failed to compare:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { status: 'success' | 'warning' | 'error' | 'info' | 'primary'; label: string }> = {
      pending: { status: 'info', label: '待执行' },
      running: { status: 'primary', label: '执行中' },
      completed: { status: 'success', label: '已完成' },
      failed: { status: 'error', label: '失败' },
    };
    const config = statusMap[status] || { status: 'info', label: status };
    return <StatusBadge status={config.status}>{config.label}</StatusBadge>;
  };

  const handleConfirm = async () => {
    if (!id) return;
    try {
      await confirmRun(id);
      setConfirmDialogOpen(false);
      setAlert({ type: 'success', title: '确认成功' });
      loadData();
      setTimeout(() => setAlert(null), 3000);
    } catch (error) {
      console.error('Failed to confirm:', error);
      setAlert({ type: 'error', title: '确认失败' });
    }
  };

  const handleCompare = async () => {
    if (!id || !baseRunId) return;
    try {
      const result = await compareRuns(id, baseRunId);
      setDiffResults(result?.diffs || []);
    } catch (error) {
      console.error('Failed to compare:', error);
      setAlert({ type: 'error', title: '对比失败' });
    }
  };

  const handleExport = async () => {
    if (!id) return;
    try {
      const blob = await exportRun(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `settlement-${id}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export:', error);
      setAlert({ type: 'error', title: '导出失败' });
    }
  };

  const diffColumns: Column<DiffResult>[] = [
    { key: 'field', title: '字段', width: 150 },
    { key: 'oldValue', title: '原值', width: 150 },
    { key: 'newValue', title: '新值', width: 150 },
    {
      key: 'changeType',
      title: '变更类型',
      width: 120,
      render: (row) => {
        const typeMap: Record<string, { status: 'success' | 'warning' | 'error' | 'info'; label: string }> = {
          added: { status: 'success', label: '新增' },
          removed: { status: 'error', label: '删除' },
          modified: { status: 'warning', label: '修改' },
        };
        const config = typeMap[row.changeType] || { status: 'info', label: row.changeType };
        return <StatusBadge status={config.status}>{config.label}</StatusBadge>;
      },
    },
    { key: 'reason', title: '原因' },
  ];

  if (!run && !loading) {
    return <div className="text-center py-12 text-gray-500">未找到该批次</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`结算批次详情 - ${run?.batchNo || ''}`}
        description="查看结算批次的详细信息"
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/settlement/runs')}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-[14px] font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            返回列表
          </button>
          {run?.status === 'completed' && (
            <>
              <button
                onClick={() => setCompareDialogOpen(true)}
                className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-[14px] font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <GitCompare className="h-4 w-4" />
                对比
              </button>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-[14px] font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Download className="h-4 w-4" />
                导出
              </button>
              <button
                onClick={() => setConfirmDialogOpen(true)}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-[14px] font-medium text-white hover:bg-primary/90 transition-colors"
              >
                <Check className="h-4 w-4" />
                确认结算
              </button>
            </>
          )}
        </div>
      </PageHeader>

      {alert && (
        <Alert type={alert.type} title={alert.title} description={alert.description} closable />
      )}

      {run && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <p className="text-[13px] text-gray-500">状态</p>
              <div className="mt-2">{getStatusBadge(run.status)}</div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <p className="text-[13px] text-gray-500">总曝光</p>
              <p className="mt-2 text-[22px] font-semibold text-gray-900">{(run.totalImpressions ?? 0).toLocaleString()}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <p className="text-[13px] text-gray-500">总点击</p>
              <p className="mt-2 text-[22px] font-semibold text-gray-900">{(run.totalClicks ?? 0).toLocaleString()}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <p className="text-[13px] text-gray-500">总转化</p>
              <p className="mt-2 text-[22px] font-semibold text-gray-900">{(run.totalConversions ?? 0).toLocaleString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <p className="text-[13px] text-gray-500">总金额</p>
              <p className="mt-2 text-[22px] font-semibold text-gray-900">¥{(run.totalAmount ?? 0).toFixed(2)}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <p className="text-[13px] text-gray-500">扣减金额</p>
              <p className="mt-2 text-[22px] font-semibold text-red-500">-¥{(run.deductionAmount ?? 0).toFixed(2)}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <p className="text-[13px] text-gray-500">结算金额</p>
              <p className="mt-2 text-[22px] font-semibold text-primary">¥{(run.finalAmount ?? 0).toFixed(2)}</p>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <h3 className="mb-4 text-[16px] font-semibold text-gray-900">基本信息</h3>
            <div className="grid grid-cols-2 gap-4 text-[14px]">
              <div>
                <span className="text-gray-500">批次号：</span>
                <span className="text-gray-900">{run.batchNo}</span>
              </div>
              <div>
                <span className="text-gray-500">结算周期：</span>
                <span className="text-gray-900">{run.startDate} ~ {run.endDate}</span>
              </div>
              <div>
                <span className="text-gray-500">创建时间：</span>
                <span className="text-gray-900">{new Date(run.createdAt).toLocaleString()}</span>
              </div>
              {run.completedAt && (
                <div>
                  <span className="text-gray-500">完成时间：</span>
                  <span className="text-gray-900">{new Date(run.completedAt).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          {diffResults.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
              <h3 className="mb-4 text-[16px] font-semibold text-amber-800">
                差异对比结果（与基线批次对比，共 {diffResults.length} 项变化）
              </h3>
              <DataTable columns={diffColumns} data={diffResults} />
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={confirmDialogOpen}
        title="确认结算"
        content={<p className="text-gray-600">确认后将生成账单，是否继续？</p>}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmDialogOpen(false)}
        confirmText="确认"
        confirmButtonClass="bg-primary"
      />

      <ConfirmDialog
        open={compareDialogOpen}
        title="对比基准批次"
        onConfirm={handleCompare}
        onCancel={() => {
          setCompareDialogOpen(false);
          setDiffResults([]);
          setBaseRunId('');
        }}
        confirmText="开始对比"
        content={
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-gray-700">
                选择基准批次
              </label>
              <select
                value={baseRunId}
                onChange={(e) => setBaseRunId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-[14px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">请选择</option>
              </select>
            </div>
            {diffResults.length > 0 && (
              <DataTable columns={diffColumns} data={diffResults} />
            )}
          </div>
        }
      />
    </div>
  );
}
