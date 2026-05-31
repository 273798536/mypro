import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Download } from 'lucide-react';
import { useRefundStore } from '@/store/useRefundStore';
import { formatCurrency } from '@/lib/utils';
import type { RefundExplanation } from '@/types';

const typeConfig: Record<RefundExplanation['type'], { label: string; borderColor: string; bgColor: string }> = {
  '进度补录': { label: '进度补录说明', borderColor: 'border-l-[#d4943a]', bgColor: 'bg-[#d4943a]' },
  '优惠追回': { label: '优惠追回说明', borderColor: 'border-l-red-500', bgColor: 'bg-red-500' },
  '资料已发': { label: '资料已发说明', borderColor: 'border-l-blue-500', bgColor: 'bg-blue-500' },
};

export default function RefundExport() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const getRecordById = useRefundStore((s) => s.getRecordById);
  const record = getRecordById(id ?? '');

  if (!record) {
    return (
      <div className="min-h-screen bg-[#f5f6f8] flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-[#1a2332] mb-2">未找到该退款记录</p>
          <button onClick={() => navigate('/')} className="text-sm text-[#d4943a] hover:underline">
            返回总览
          </button>
        </div>
      </div>
    );
  }

  const groupedExplanations = (['进度补录', '优惠追回', '资料已发'] as const).map((type) => ({
    type,
    config: typeConfig[type],
    items: record.explanations.filter((e) => e.type === type),
  }));

  const handleExport = () => {
    const lines: string[] = [];

    lines.push('=== 退款说明 ===');
    lines.push('');
    lines.push(`学员姓名：${record.studentName}`);
    lines.push(`课程名称：${record.courseName}`);
    lines.push('');
    lines.push('--- 订单信息 ---');
    lines.push(`订单编号：${record.order.id}`);
    lines.push(`订单金额：${formatCurrency(record.order.orderAmount)}`);
    lines.push(`实付金额：${formatCurrency(record.order.paidAmount)}`);
    lines.push(`支付方式：${record.order.payMethod}`);
    lines.push(`下单日期：${record.order.orderDate}`);
    lines.push('');
    lines.push('--- 退款拆分 ---');
    lines.push(`课时费退款：${formatCurrency(record.breakdown.courseFeeRefund)}`);
    lines.push(`资料扣费：${formatCurrency(record.breakdown.materialDeduction)}`);
    lines.push(`优惠追回：${formatCurrency(record.breakdown.discountRecovery)}`);
    lines.push(`进度调整：${formatCurrency(record.breakdown.progressAdjustment)}`);
    lines.push(`实退金额：${formatCurrency(record.breakdown.actualRefund)}`);
    lines.push('');

    for (const group of groupedExplanations) {
      lines.push(`--- ${group.config.label} ---`);
      if (group.items.length === 0) {
        lines.push('本项无相关说明');
      } else {
        for (const item of group.items) {
          lines.push(`标题：${item.title}`);
          lines.push(`说明：${item.description}`);
          lines.push(`金额：${formatCurrency(item.amount)}`);
          lines.push(`计算依据：${item.calculationBasis}`);
          lines.push('');
        }
      }
      lines.push('');
    }

    if (record.progress.isManuallyModified && record.changeHistory.length > 0) {
      lines.push('--- 改动影响 ---');
      const latest = record.changeHistory[record.changeHistory.length - 1];
      lines.push(`修改日期：${latest.changeDate}`);
      lines.push(`修改前已消耗课时：${latest.previousConsumedHours}课时`);
      lines.push(`修改后已消耗课时：${latest.newConsumedHours}课时`);
      lines.push(`修改原因：${latest.changeReason}`);
      lines.push(`优惠回滚修改前：${formatCurrency(latest.discountRollbackBefore)}`);
      lines.push(`优惠回滚修改后：${formatCurrency(latest.discountRollbackAfter)}`);
      lines.push(`退款影响金额：${formatCurrency(latest.refundImpactAmount)}`);
      lines.push('');
    }

    lines.push('--- 对应关系 ---');
    lines.push(`订单编号 ↔ 进度ID ↔ 说明数量 ↔ 变更记录数`);
    lines.push(`${record.order.id} ↔ ${record.progress.id} ↔ ${record.explanations.length} ↔ ${record.changeHistory.length}`);

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `退款说明_${record.studentName}_${record.courseName}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#f5f6f8]">
      <div className="max-w-5xl mx-auto px-6 py-6">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate(`/refund/${id}`)}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#1a2332]"
          >
            <ArrowLeft size={16} />
            返回
          </button>
          <ChevronRight size={14} className="text-gray-300" />
          <span className="text-sm text-gray-400">总览</span>
          <ChevronRight size={14} className="text-gray-300" />
          <span className="text-sm text-gray-400">退款详情</span>
          <ChevronRight size={14} className="text-gray-300" />
          <span className="text-sm text-[#1a2332] font-medium">退款说明与导出</span>
        </div>

        <h1 className="text-xl font-bold text-[#1a2332] mb-6">退款说明与导出</h1>

        <div className="space-y-5 mb-6">
          {groupedExplanations.map((group) => (
            <div
              key={group.type}
              className={`rounded-lg shadow-sm bg-white border-l-4 ${group.config.borderColor}`}
            >
              <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100">
                <span className={`inline-block w-2 h-2 rounded-full ${group.config.bgColor}`} />
                <h3 className="text-base font-semibold text-[#1a2332]">{group.config.label}</h3>
              </div>
              <div className="p-5">
                {group.items.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">本项无相关说明</p>
                ) : (
                  <div className="space-y-4">
                    {group.items.map((item) => (
                      <div key={item.id} className="bg-gray-50 rounded-md p-4 space-y-2">
                        <p className="text-sm font-medium text-[#1a2332]">{item.title}</p>
                        <p className="text-sm text-gray-500">{item.description}</p>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">金额</span>
                          <span className="font-medium text-[#1a2332]">{formatCurrency(item.amount)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">计算依据</span>
                          <span className="text-[#1a2332]">{item.calculationBasis}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {record.progress.isManuallyModified && record.changeHistory.length > 0 && (
          <div className="rounded-lg shadow-sm bg-white p-5 mb-5 border-l-4 border-l-[#d4943a]">
            <h3 className="text-base font-semibold text-[#1a2332] mb-4">改动影响</h3>
            {record.changeHistory.map((change) => {
              const diff = change.discountRollbackAfter - change.discountRollbackBefore;
              return (
                <div key={change.id} className="bg-gray-50 rounded-md p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">修改日期</span>
                    <span className="text-[#1a2332]">{change.changeDate}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">课时变更</span>
                    <span className="text-[#1a2332]">
                      {change.previousConsumedHours}课时 → {change.newConsumedHours}课时
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">修改原因</span>
                    <span className="text-[#1a2332]">{change.changeReason}</span>
                  </div>
                  <div className="border-t border-gray-200 my-1" />
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-xs text-gray-400">优惠回滚（修改前）</span>
                      <p className="text-[#1a2332]">{formatCurrency(change.discountRollbackBefore)}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-400">优惠回滚（修改后）</span>
                      <p className="text-[#1a2332]">{formatCurrency(change.discountRollbackAfter)}</p>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">差异金额</span>
                    <span className="font-medium text-[#d4943a]">
                      {diff >= 0 ? '+' : ''}{formatCurrency(diff)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">退款影响金额</span>
                    <span className={`font-medium ${change.refundImpactAmount >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                      {change.refundImpactAmount >= 0 ? '+' : ''}{formatCurrency(change.refundImpactAmount)}
                    </span>
                  </div>
                </div>
              );
            })}
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
                <th className="text-left py-2 text-xs text-gray-400 font-medium">说明数量</th>
                <th className="text-center py-2 text-xs text-gray-400 font-medium">↔</th>
                <th className="text-left py-2 text-xs text-gray-400 font-medium">变更记录数</th>
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
            onClick={handleExport}
            className="flex items-center gap-2 px-5 py-2.5 rounded-md bg-[#d4943a] text-white text-sm font-medium hover:bg-[#c4842a]"
          >
            <Download size={16} />
            导出退款说明
          </button>
        </div>
      </div>
    </div>
  );
}
