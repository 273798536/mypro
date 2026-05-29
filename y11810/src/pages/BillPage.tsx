import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye } from 'lucide-react';
import type { Bill } from '@/api/bill';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable, type Column } from '@/components/common/DataTable';
import { StatusBadge } from '@/components/common/StatusBadge';
import { getBills } from '@/api/bill';

export default function BillPage() {
  const navigate = useNavigate();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getBills({
        page: pagination.current,
        pageSize: pagination.pageSize,
      });
      setBills(res.items);
      setPagination((prev) => ({ ...prev, total: res.total }));
    } catch (error) {
      console.error('Failed to load bills:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [pagination.current, pagination.pageSize]);

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { status: 'success' | 'warning' | 'error' | 'info'; label: string }> = {
      pending: { status: 'warning', label: '待支付' },
      paid: { status: 'success', label: '已支付' },
      overdue: { status: 'error', label: '已逾期' },
    };
    const config = statusMap[status] || { status: 'info', label: status };
    return <StatusBadge status={config.status}>{config.label}</StatusBadge>;
  };

  const columns: Column<Bill>[] = [
    { key: 'billNo', title: '账单号', width: 180 },
    { key: 'channelName', title: '渠道', width: 150 },
    { key: 'period', title: '账期', width: 150 },
    {
      key: 'totalAmount',
      title: '总金额',
      width: 120,
      render: (row) => <span className="font-medium">¥{row.totalAmount.toFixed(2)}</span>,
    },
    {
      key: 'deductionAmount',
      title: '扣减金额',
      width: 120,
      render: (row) => <span className="font-medium text-red-500">-¥{row.deductionAmount.toFixed(2)}</span>,
    },
    {
      key: 'finalAmount',
      title: '结算金额',
      width: 120,
      render: (row) => <span className="font-medium text-primary">¥{row.finalAmount.toFixed(2)}</span>,
    },
    { key: 'status', title: '状态', width: 100, render: (row) => getStatusBadge(row.status) },
    {
      key: 'createdAt',
      title: '创建时间',
      width: 180,
      render: (row) => new Date(row.createdAt).toLocaleString(),
    },
    {
      key: 'action',
      title: '操作',
      width: 100,
      render: (row) => (
        <button
          onClick={() => navigate(`/bills/${row.id}`)}
          className="flex items-center gap-1 text-[13px] text-primary hover:text-primary/80"
        >
          <Eye className="h-4 w-4" />
          详情
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="账单管理" description="查看和管理所有账单" />

      <DataTable
        columns={columns}
        data={bills}
        loading={loading}
        pagination={pagination}
        onPageChange={(page, pageSize) =>
          setPagination((prev) => ({ ...prev, current: page, pageSize }))
        }
      />
    </div>
  );
}
