import { useState } from 'react';
import { Edit2, Check, X, AlertCircle, Tag, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SplitResult } from '@/types';
import { roundToTwo } from '@/utils/splitEngine';

interface SplitDetailProps {
  splits: SplitResult[];
  onUpdateSplit: (id: string, updates: Partial<SplitResult>) => void;
  onMarkDispute: (id: string, reason: string) => void;
}

const statusColors: Record<SplitResult['status'], string> = {
  normal: 'bg-green-100 text-green-700',
  adjusted: 'bg-blue-100 text-blue-700',
  disputed: 'bg-red-100 text-red-700',
  pending_confirm: 'bg-amber-100 text-amber-700',
};

const statusLabels: Record<SplitResult['status'], string> = {
  normal: '正常',
  adjusted: '已修正',
  disputed: '争议',
  pending_confirm: '待确认',
};

export default function SplitDetail({
  splits,
  onUpdateSplit,
  onMarkDispute,
}: SplitDetailProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [disputeId, setDisputeId] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState('');

  const totalSplitAmount = splits.reduce((sum, s) => sum + s.splitAmount, 0);
  const totalFeeAmount = splits.reduce((sum, s) => sum + s.feeAmount, 0);
  const totalActualAmount = splits.reduce((sum, s) => sum + s.actualAmount, 0);

  const handleEdit = (split: SplitResult) => {
    setEditingId(split.id);
    setEditValue(String(split.splitAmount));
  };

  const handleSaveEdit = (id: string) => {
    const newAmount = parseFloat(editValue);
    if (!isNaN(newAmount) && newAmount >= 0) {
      const feeRate = 0.01;
      const feeAmount = roundToTwo(newAmount * feeRate);
      onUpdateSplit(id, {
        splitAmount: newAmount,
        feeAmount,
        actualAmount: roundToTwo(newAmount - feeAmount),
        status: 'adjusted',
      });
    }
    setEditingId(null);
    setEditValue('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const handleSaveDispute = (id: string) => {
    if (disputeReason.trim()) {
      onMarkDispute(id, disputeReason.trim());
    }
    setDisputeId(null);
    setDisputeReason('');
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="p-3 bg-slate-50 rounded-lg text-center">
          <p className="text-xs text-slate-500 mb-1">拆分总额</p>
          <p className="text-lg font-semibold text-slate-800">
            ¥{totalSplitAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="p-3 bg-amber-50 rounded-lg text-center">
          <p className="text-xs text-amber-600 mb-1">手续费</p>
          <p className="text-lg font-semibold text-amber-700">
            ¥{totalFeeAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="p-3 bg-green-50 rounded-lg text-center">
          <p className="text-xs text-green-600 mb-1">实际到账</p>
          <p className="text-lg font-semibold text-green-700">
            ¥{totalActualAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left text-slate-500 font-medium">发票号</th>
              <th className="px-3 py-2 text-left text-slate-500 font-medium">卖方</th>
              <th className="px-3 py-2 text-right text-slate-500 font-medium">拆分金额</th>
              <th className="px-3 py-2 text-right text-slate-500 font-medium">手续费</th>
              <th className="px-3 py-2 text-right text-slate-500 font-medium">实际到账</th>
              <th className="px-3 py-2 text-center text-slate-500 font-medium">比例</th>
              <th className="px-3 py-2 text-center text-slate-500 font-medium">来源</th>
              <th className="px-3 py-2 text-center text-slate-500 font-medium">状态</th>
              <th className="px-3 py-2 text-center text-slate-500 font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {splits.map((split) => (
              <tr
                key={split.id}
                className={cn(
                  'hover:bg-slate-50 transition-colors',
                  split.isDispute && 'bg-red-50/50'
                )}
              >
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-slate-400" />
                    <span className="font-mono text-slate-700">{split.invoiceNo}</span>
                  </div>
                </td>
                <td className="px-3 py-3 text-slate-700">{split.sellerName}</td>
                <td className="px-3 py-3 text-right">
                  {editingId === split.id ? (
                    <div className="flex items-center justify-end gap-1">
                      <input
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-28 px-2 py-1 text-right border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveEdit(split.id)}
                        className="p-1 text-green-600 hover:bg-green-50 rounded"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <span className="font-medium text-slate-800">
                      ¥{split.splitAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </td>
                <td className="px-3 py-3 text-right text-amber-600">
                  ¥{split.feeAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-3 py-3 text-right text-green-600 font-medium">
                  ¥{split.actualAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-3 py-3 text-center">
                  {split.splitRatio ? (
                    <span className="inline-flex items-center px-2 py-0.5 bg-slate-100 rounded text-xs text-slate-600">
                      {(split.splitRatio * 100).toFixed(1)}%
                    </span>
                  ) : (
                    '-'
                  )}
                </td>
                <td className="px-3 py-3 text-center">
                  <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                    <Tag className="h-3 w-3" />
                    {split.source}
                  </span>
                </td>
                <td className="px-3 py-3 text-center">
                  <span
                    className={cn(
                      'inline-flex px-2 py-0.5 text-xs font-medium rounded-full',
                      statusColors[split.status]
                    )}
                  >
                    {statusLabels[split.status]}
                  </span>
                </td>
                <td className="px-3 py-3 text-center">
                  {disputeId === split.id ? (
                    <div className="flex items-center justify-center gap-1">
                      <input
                        type="text"
                        value={disputeReason}
                        onChange={(e) => setDisputeReason(e.target.value)}
                        placeholder="争议原因"
                        className="w-32 px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveDispute(split.id)}
                        className="p-1 text-green-600 hover:bg-green-50 rounded"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDisputeId(null)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleEdit(split)}
                        className="p-1.5 text-slate-500 hover:bg-slate-100 rounded transition-colors"
                        title="调整金额"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      {!split.isDispute && (
                        <button
                          onClick={() => setDisputeId(split.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                          title="标记争议"
                        >
                          <AlertCircle className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {splits.some((s) => s.isDispute) && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm font-medium text-red-800 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            存在争议项，需人工确认后才能完成拆分
          </p>
        </div>
      )}
    </div>
  );
}
