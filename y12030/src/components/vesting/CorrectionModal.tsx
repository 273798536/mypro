import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { useVestingStore } from '../../store/useVestingStore';

interface CorrectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  currentTotalShares: number;
}

export function CorrectionModal({
  isOpen,
  onClose,
  employeeId,
  currentTotalShares,
}: CorrectionModalProps) {
  const [fieldName, setFieldName] = useState('totalShares');
  const [newValue, setNewValue] = useState('');
  const [reason, setReason] = useState('');
  const [operator, setOperator] = useState('财务-刘总');
  const { correctVesting } = useVestingStore();
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newValue.trim() || !reason.trim()) return;

    setLoading(true);
    try {
      await correctVesting(employeeId, fieldName, newValue, reason, operator);
      onClose();
      setNewValue('');
      setReason('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg animate-[fadeIn_0.2s_ease]">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-warning-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="text-warning-600" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">归属信息修正</h3>
              <p className="text-sm text-slate-500">修正后将重新计算归属，操作将留痕</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-warning-50 border border-warning-200 rounded-lg p-4">
            <p className="text-sm text-warning-800">
              <strong>当前授予总数：</strong>
              <span className="font-mono">{currentTotalShares.toLocaleString()}</span> 股
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              修正字段
            </label>
            <select
              value={fieldName}
              onChange={(e) => setFieldName(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            >
              <option value="totalShares">授予数量 (totalShares)</option>
              <option value="agreementVersion">协议版本 (agreementVersion)</option>
              <option value="grantDate">授予日期 (grantDate)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              新值
            </label>
            <input
              type={fieldName === 'grantDate' ? 'date' : 'text'}
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder={
                fieldName === 'totalShares'
                  ? '请输入新的授予数量'
                  : fieldName === 'agreementVersion'
                  ? '例如：ESOP-Agreement-v1.1'
                  : '选择日期'
              }
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              修正原因
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="请详细说明修正原因，用于审计追踪..."
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              操作人
            </label>
            <input
              type="text"
              value={operator}
              onChange={(e) => setOperator(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <div className="flex items-center gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn btn-secondary"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading || !newValue.trim() || !reason.trim()}
              className="flex-1 btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '提交中...' : '确认修正'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
