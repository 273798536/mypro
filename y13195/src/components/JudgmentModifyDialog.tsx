import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { X, Save, RotateCcw } from 'lucide-react';

export default function JudgmentModifyDialog() {
  const modifyDialogOpen = useStore((s) => s.modifyDialogOpen);
  const modifyDialogRecordId = useStore((s) => s.modifyDialogRecordId);
  const records = useStore((s) => s.records);
  const closeModifyDialog = useStore((s) => s.closeModifyDialog);
  const addJudgmentHistory = useStore((s) => s.addJudgmentHistory);
  const updateRecordJudgment = useStore((s) => s.updateRecordJudgment);

  const record = records.find((r) => r.id === modifyDialogRecordId) ?? null;

  const [newJudgment, setNewJudgment] = useState('');
  const [reason, setReason] = useState('');
  const [operator, setOperator] = useState('小林');

  if (!modifyDialogOpen || !record) return null;

  const handleSave = () => {
    if (!newJudgment.trim()) return;
    updateRecordJudgment(record.id, newJudgment.trim());
    addJudgmentHistory({
      recordId: record.id,
      operator,
      timestamp: new Date().toISOString(),
      previousJudgment: record.judgment,
      newJudgment: newJudgment.trim(),
      reason: reason.trim(),
    });
    closeModifyDialog();
    setNewJudgment('');
    setReason('');
    setOperator('小林');
  };

  const handleCancel = () => {
    closeModifyDialog();
    setNewJudgment('');
    setReason('');
    setOperator('小林');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-base-900/70">
      <div className="bg-base-800 border border-base-600 rounded-lg shadow-2xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-base-600">
          <div>
            <h2 className="text-lg font-medium text-white">修改判断</h2>
            <span className="text-xs text-base-400 font-mono">{record.id}</span>
          </div>
          <button
            onClick={handleCancel}
            className="text-base-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="section-title">当前判断</label>
            <div className="param-value bg-base-700 border border-base-600 rounded px-3 py-2">
              {record.judgment}
            </div>
          </div>

          <div>
            <label className="section-title">新判断</label>
            <input
              type="text"
              value={newJudgment}
              onChange={(e) => setNewJudgment(e.target.value)}
              className="w-full bg-base-700 border border-base-600 text-white rounded px-3 py-2 focus:outline-none focus:border-industrial-blue transition-colors"
              placeholder="输入新的判断结果"
            />
          </div>

          <div>
            <label className="section-title">修改原因</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-base-700 border border-base-600 text-white rounded px-3 py-2 focus:outline-none focus:border-industrial-blue transition-colors resize-none"
              rows={3}
              placeholder="输入修改原因"
            />
          </div>

          <div>
            <label className="section-title">操作人</label>
            <input
              type="text"
              value={operator}
              onChange={(e) => setOperator(e.target.value)}
              className="w-full bg-base-700 border border-base-600 text-white rounded px-3 py-2 focus:outline-none focus:border-industrial-blue transition-colors"
              placeholder="操作人姓名"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-base-600">
          <button
            onClick={handleCancel}
            className="flex items-center gap-2 px-4 py-2 text-sm text-base-300 hover:text-white bg-base-700 border border-base-600 rounded hover:bg-base-600 transition-colors"
          >
            <RotateCcw size={14} />
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={!newJudgment.trim()}
            className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-industrial-blue rounded hover:bg-industrial-blue/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save size={14} />
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
