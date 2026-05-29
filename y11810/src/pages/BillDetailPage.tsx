import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import type { Bill } from '@/api/bill';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Alert } from '@/components/common/Alert';
import { getBill } from '@/api/bill';

export default function BillDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{
    type: 'success' | 'error' | 'warning';
    title: string;
    description?: string;
  } | null>(null);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getBill(id);
      setBill(data);
    } catch (error) {
      console.error('Failed to load bill:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { status: 'success' | 'warning' | 'error' | 'info'; label: string }> = {
      pending: { status: 'warning', label: '待支付' },
      paid: { status: 'success', label: '已支付' },
      overdue: { status: 'error', label: '已逾期' },
    };
    const config = statusMap[status] || { status: 'info', label: status };
    return <StatusBadge status={config.status}>{config.label}</StatusBadge>;
  };

  if (!bill && !loading) {
    return <div className="text-center py-12 text-gray-500">未找到该账单</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`账单详情 - ${bill?.billNo || ''}`}
        description="查看账单详细信息"
      >
        <button
          onClick={() => navigate('/bills')}
          className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-[14px] font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          返回列表
        </button>
      </PageHeader>

      {alert && (
        <Alert type={alert.type} title={alert.title} description={alert.description} closable />
      )}

      {bill && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <p className="text-[13px] text-gray-500">状态</p>
              <div className="mt-2">{getStatusBadge(bill.status)}</div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <p className="text-[13px] text-gray-500">总金额</p>
              <p className="mt-2 text-[22px] font-semibold text-gray-900">¥{bill.totalAmount.toFixed(2)}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <p className="text-[13px] text-gray-500">扣减金额</p>
              <p className="mt-2 text-[22px] font-semibold text-red-500">-¥{bill.deductionAmount.toFixed(2)}</p>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] text-gray-500">结算金额</p>
                <p className="mt-1 text-[28px] font-semibold text-primary">¥{bill.finalAmount.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <h3 className="mb-4 text-[16px] font-semibold text-gray-900">基本信息</h3>
            <div className="grid grid-cols-2 gap-4 text-[14px]">
              <div>
                <span className="text-gray-500">账单号：</span>
                <span className="text-gray-900">{bill.billNo}</span>
              </div>
              <div>
                <span className="text-gray-500">渠道：</span>
                <span className="text-gray-900">{bill.channelName}</span>
              </div>
              <div>
                <span className="text-gray-500">账期：</span>
                <span className="text-gray-900">{bill.period}</span>
              </div>
              <div>
                <span className="text-gray-500">创建时间：</span>
                <span className="text-gray-900">{new Date(bill.createdAt).toLocaleString()}</span>
              </div>
              {bill.paidAt && (
                <div>
                  <span className="text-gray-500">支付时间：</span>
                  <span className="text-gray-900">{new Date(bill.paidAt).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
