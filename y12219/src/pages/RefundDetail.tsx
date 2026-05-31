import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Edit3, X } from 'lucide-react';
import { useRefundStore } from '@/store/useRefundStore';
import { formatCurrency } from '@/lib/utils';
import OrderCard from '@/components/OrderCard';
import CouponCard from '@/components/CouponCard';
import RefundBreakdownCard from '@/components/RefundBreakdownCard';
import ChangeHistoryTimeline from '@/components/ChangeHistoryTimeline';
import DiscountRollbackComparison from '@/components/DiscountRollbackComparison';

export default function RefundDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const getRecordById = useRefundStore((s) => s.getRecordById);
  const updateCourseProgress = useRefundStore((s) => s.updateCourseProgress);
  const record = getRecordById(id ?? '');

  const [showModifyForm, setShowModifyForm] = useState(false);
  const [newHours, setNewHours] = useState('');
  const [changeReason, setChangeReason] = useState('');
  const [diffPanel, setDiffPanel] = useState<{
    before: { consumedHours: number; actualRefund: number; discountRecovery: number };
    after: { consumedHours: number; actualRefund: number; discountRecovery: number };
  } | null>(null);

  if (!record) {
    return (
      <div className="min-h-screen bg-[#f5f6f8] flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-[#1a2332] mb-2">未找到该退款记录</p>
          <button
            onClick={() => navigate('/')}
            className="text-sm text-[#d4943a] hover:underline"
          >
            返回总览
          </button>
        </div>
      </div>
    );
  }

  const handleModifySubmit = () => {
    const hours = Number(newHours);
    if (!hours || hours < 0 || hours > record.progress.totalHours || !changeReason.trim()) return;

    const before = {
      consumedHours: record.progress.consumedHours,
      actualRefund: record.breakdown.actualRefund,
      discountRecovery: record.breakdown.discountRecovery,
    };

    updateCourseProgress(record.id, hours, changeReason.trim());

    const updatedRecord = useRefundStore.getState().getRecordById(record.id);
    if (updatedRecord) {
      setDiffPanel({
        before,
        after: {
          consumedHours: updatedRecord.progress.consumedHours,
          actualRefund: updatedRecord.breakdown.actualRefund,
          discountRecovery: updatedRecord.breakdown.discountRecovery,
        },
      });
    }

    setShowModifyForm(false);
    setNewHours('');
    setChangeReason('');
  };

  return (
    <div className="min-h-screen bg-[#f5f6f8]">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#1a2332]"
          >
            <ArrowLeft size={16} />
            返回
          </button>
          <ChevronRight size={14} className="text-gray-300" />
          <span className="text-sm text-gray-400">总览</span>
          <ChevronRight size={14} className="text-gray-300" />
          <span className="text-sm text-[#1a2332] font-medium">学员退款详情</span>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-[#1a2332]">
            {record.studentName} - {record.courseName}
          </h1>
          <button
            onClick={() => setShowModifyForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border border-[#d4943a] text-[#d4943a] hover:bg-[#d4943a]/5"
          >
            <Edit3 size={14} />
            模拟修改课时
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
          <OrderCard order={record.order} />
          <CouponCard coupon={record.coupon} />
          <RefundBreakdownCard breakdown={record.breakdown} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          <ChangeHistoryTimeline changes={record.changeHistory} />
          <DiscountRollbackComparison record={record} />
        </div>

        {diffPanel && (
          <div className="rounded-lg shadow-sm bg-white p-5 mb-5 border-l-4 border-l-[#d4943a]">
            <h3 className="text-base font-semibold text-[#1a2332] mb-4">课时修改影响对比</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div />
              <div className="text-center text-xs font-medium text-gray-400">修改前</div>
              <div className="text-center text-xs font-medium text-gray-400">修改后</div>

              <span className="text-gray-500">已消耗课时</span>
              <span className="text-center text-[#1a2332]">{diffPanel.before.consumedHours}课时</span>
              <span className="text-center text-[#1a2332]">{diffPanel.after.consumedHours}课时</span>

              <span className="text-gray-500">优惠追回</span>
              <span className="text-center text-[#1a2332]">{formatCurrency(diffPanel.before.discountRecovery)}</span>
              <span className="text-center text-[#1a2332]">{formatCurrency(diffPanel.after.discountRecovery)}</span>

              <span className="text-gray-500 font-medium">实退金额</span>
              <span className="text-center text-[#1a2332]">{formatCurrency(diffPanel.before.actualRefund)}</span>
              <span className={`text-center font-semibold ${diffPanel.after.actualRefund >= diffPanel.before.actualRefund ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                {formatCurrency(diffPanel.after.actualRefund)}
              </span>
            </div>
          </div>
        )}

        <div className="rounded-lg shadow-sm bg-white p-5 mb-5">
          <h3 className="text-base font-semibold text-[#1a2332] mb-4">对应关系</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 text-xs text-gray-400 font-medium">订单编号</th>
                <th className="text-center py-2 text-xs text-gray-400 font-medium">↔</th>
                <th className="text-left py-2 text-xs text-gray-400 font-medium">进度ID</th>
                <th className="text-center py-2 text-xs text-gray-400 font-medium">↔</th>
                <th className="text-left py-2 text-xs text-gray-400 font-medium">退款说明数量</th>
                <th className="text-center py-2 text-xs text-gray-400 font-medium">↔</th>
                <th className="text-left py-2 text-xs text-gray-400 font-medium">变更记录数量</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-2 text-[#1a2332]">{record.order.id}</td>
                <td className="py-2 text-center text-gray-300">↔</td>
                <td className="py-2 text-[#1a2332]">{record.progress.id}</td>
                <td className="py-2 text-center text-gray-300">↔</td>
                <td className="py-2 text-[#1a2332]">{record.explanations.length}</td>
                <td className="py-2 text-center text-gray-300">↔</td>
                <td className="py-2 text-[#1a2332]">{record.changeHistory.length}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex justify-end">
          <button
            onClick={() => navigate(`/refund/${record.id}/export`)}
            className="px-5 py-2.5 rounded-md bg-[#d4943a] text-white text-sm font-medium hover:bg-[#c4842a]"
          >
            查看退款说明与导出
          </button>
        </div>
      </div>

      {showModifyForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-[#1a2332]">模拟修改课时</h3>
              <button onClick={() => setShowModifyForm(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-500 mb-1">
                  当前已消耗课时：{record.progress.consumedHours} / {record.progress.totalHours}
                </label>
                <input
                  type="number"
                  value={newHours}
                  onChange={(e) => setNewHours(e.target.value)}
                  placeholder="输入新的已消耗课时"
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#d4943a]"
                  min={0}
                  max={record.progress.totalHours}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">修改原因</label>
                <input
                  type="text"
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  placeholder="输入修改原因"
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#d4943a]"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowModifyForm(false)}
                  className="px-4 py-2 text-sm rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={handleModifySubmit}
                  className="px-4 py-2 text-sm rounded-md bg-[#d4943a] text-white hover:bg-[#c4842a]"
                >
                  提交
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
