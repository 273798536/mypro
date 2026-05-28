import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { useRedemptionStore } from '@/store/useRedemptionStore';
import { getStatusText, formatAmount } from '@/utils/formatters';
import type { RedemptionRequest, RedemptionStatus } from '@/types';

interface EditModalProps {
  redemption: RedemptionRequest;
  onClose: () => void;
}

export default function EditModal({ redemption, onClose }: EditModalProps) {
  const { updateRedemption, confirmPartialRedemption } = useRedemptionStore();
  const [formData, setFormData] = useState({
    confirmedAmount: redemption.confirmedAmount || redemption.requestAmount,
    status: redemption.status,
    expectedSettlementDate: redemption.expectedSettlementDate,
    operator: '运营专员',
    reason: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const statusOptions: { value: RedemptionStatus; label: string }[] = [
    { value: 'pending', label: '待处理' },
    { value: 'confirmed', label: '已确认' },
    { value: 'partial_confirmed', label: '部分确认' },
    { value: 'delayed', label: '清算顺延' },
    { value: 'settled', label: '已到账' },
    { value: 'reviewing', label: '待复核' },
  ];

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (formData.confirmedAmount <= 0) {
      newErrors.confirmedAmount = '确认份额必须大于 0';
    }
    if (formData.confirmedAmount > redemption.requestAmount) {
      newErrors.confirmedAmount = '确认份额不能超过申请份额';
    }
    if (!formData.reason.trim()) {
      newErrors.reason = '请填写修正原因';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    if (formData.status === 'confirmed' && formData.confirmedAmount < redemption.requestAmount) {
      confirmPartialRedemption(
        redemption.id,
        formData.confirmedAmount,
        formData.operator,
        formData.reason
      );
    } else {
      updateRedemption(
        redemption.id,
        {
          confirmedAmount: formData.confirmedAmount,
          status: formData.status,
          expectedSettlementDate: formData.expectedSettlementDate,
        },
        formData.operator,
        formData.reason
      );
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-850 border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-auto scrollbar-thin">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <h3 className="text-lg font-semibold text-white">修正赎回数据</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 bg-slate-800 rounded-lg border border-slate-700">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span>赎回编号：</span>
              <span className="font-mono text-white">{redemption.id}</span>
              <span className="mx-2">·</span>
              <span>{redemption.customerName}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-400 mt-1">
              <span>申请份额：</span>
              <span className="font-mono text-white">{formatAmount(redemption.requestAmount)} 份</span>
              <span className="mx-2">·</span>
              <span>当前状态：</span>
              <span className="text-white">{getStatusText(redemption.status)}</span>
            </div>
          </div>

          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-200">
              修正操作将被记入操作日志，所有修改均可追溯。请谨慎填写修正原因。
            </p>
          </div>

          <div>
            <label className="label">确认份额（份）</label>
            <input
              type="number"
              value={formData.confirmedAmount}
              onChange={e => setFormData({ ...formData, confirmedAmount: Number(e.target.value) })}
              className={`input-field ${errors.confirmedAmount ? 'border-red-500' : ''}`}
            />
            {errors.confirmedAmount && (
              <p className="text-xs text-red-400 mt-1">{errors.confirmedAmount}</p>
            )}
            {formData.confirmedAmount > 0 && formData.confirmedAmount < redemption.requestAmount && (
              <p className="text-xs text-amber-400 mt-1">
                扣减 {formatAmount(redemption.requestAmount - formData.confirmedAmount)} 份，将标记为部分确认
              </p>
            )}
          </div>

          <div>
            <label className="label">状态</label>
            <select
              value={formData.status}
              onChange={e => setFormData({ ...formData, status: e.target.value as RedemptionStatus })}
              className="input-field"
            >
              {statusOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">预计到账日</label>
            <input
              type="date"
              value={formData.expectedSettlementDate}
              onChange={e => setFormData({ ...formData, expectedSettlementDate: e.target.value })}
              className="input-field"
            />
          </div>

          <div>
            <label className="label">操作人</label>
            <input
              type="text"
              value={formData.operator}
              onChange={e => setFormData({ ...formData, operator: e.target.value })}
              className="input-field"
              placeholder="请输入操作人姓名"
            />
          </div>

          <div>
            <label className="label">修正原因 <span className="text-red-400">*</span></label>
            <textarea
              value={formData.reason}
              onChange={e => setFormData({ ...formData, reason: e.target.value })}
              className={`input-field min-h-[80px] resize-none ${errors.reason ? 'border-red-500' : ''}`}
              placeholder="请详细说明修正原因..."
            />
            {errors.reason && (
              <p className="text-xs text-red-400 mt-1">{errors.reason}</p>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              取消
            </button>
            <button
              type="submit"
              className="btn-primary"
            >
              确认修正
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
