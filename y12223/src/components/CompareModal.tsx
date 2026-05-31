import { useState } from 'react';
import { X, Check, AlertTriangle } from 'lucide-react';
import { useStore } from '../store/useStore';
import { BillSnapshot } from '../types';
import { expenseCategories } from '../data/mockData';

export default function CompareModal() {
  const { isCompareMode, beforeSnapshot, afterSnapshot, setCompareMode, updateBill, addHistoryRecord } = useStore();
  const [editedSnapshot, setEditedSnapshot] = useState<BillSnapshot | null>(null);
  const [reason, setReason] = useState('');

  if (!isCompareMode || !beforeSnapshot || !afterSnapshot) return null;

  const handleEdit = (field: keyof BillSnapshot, value: string | number) => {
    setEditedSnapshot({
      ...afterSnapshot,
      [field]: value,
    });
  };

  const getFieldDiff = (field: keyof BillSnapshot) => {
    const currentAfter = editedSnapshot || afterSnapshot;
    return beforeSnapshot[field] !== currentAfter[field];
  };

  const handleConfirm = () => {
    const finalAfter = editedSnapshot || afterSnapshot;
    
    updateBill(beforeSnapshot.id, {
      supplierName: finalAfter.supplierName,
      amount: Number(finalAfter.amount),
      expenseCategory: finalAfter.expenseCategory,
      remarks: finalAfter.remarks,
      status: 'normal',
      isCategoryMismatch: false,
      hasMissingFields: false,
    });

    addHistoryRecord({
      billId: beforeSnapshot.id,
      adjustmentType: 'manual_correction',
      beforeSnapshot: JSON.stringify(beforeSnapshot),
      afterSnapshot: JSON.stringify(finalAfter),
      operator: '张会计',
      reason: reason || '手动修正账单信息',
    });

    setCompareMode(false);
    setEditedSnapshot(null);
    setReason('');
  };

  const handleClose = () => {
    setCompareMode(false);
    setEditedSnapshot(null);
    setReason('');
  };

  const displayAfter = editedSnapshot || afterSnapshot;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-slate-800">手动修正 - 新旧对比</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-slate-50 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-rose-500" />
                <h3 className="font-semibold text-slate-700">修正前</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-500 mb-1">供应商</label>
                  <p className="text-slate-800 font-medium">{beforeSnapshot.supplierName}</p>
                </div>

                <div>
                  <label className="block text-sm text-slate-500 mb-1">金额</label>
                  <p className="text-slate-800 font-medium">¥{Number(beforeSnapshot.amount).toLocaleString()}</p>
                </div>

                <div className={getFieldDiff('expenseCategory') ? 'bg-rose-100 rounded-lg p-3 -m-3' : ''}>
                  <label className="block text-sm text-slate-500 mb-1">费用科目</label>
                  <p className="text-slate-800 font-medium">{beforeSnapshot.expenseCategory}</p>
                  {getFieldDiff('expenseCategory') && (
                    <p className="text-xs text-rose-600 mt-1">科目将被修改</p>
                  )}
                </div>

                <div className={getFieldDiff('remarks') ? 'bg-rose-100 rounded-lg p-3 -m-3' : ''}>
                  <label className="block text-sm text-slate-500 mb-1">备注</label>
                  <p className="text-slate-800">{beforeSnapshot.remarks || '(空)'}</p>
                  {getFieldDiff('remarks') && (
                    <p className="text-xs text-rose-600 mt-1">备注将被修改</p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-emerald-50 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <h3 className="font-semibold text-slate-700">修正后</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-500 mb-1">供应商</label>
                  <input
                    type="text"
                    value={displayAfter.supplierName}
                    onChange={(e) => handleEdit('supplierName', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-500 mb-1">金额</label>
                  <input
                    type="number"
                    value={displayAfter.amount}
                    onChange={(e) => handleEdit('amount', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className={getFieldDiff('expenseCategory') ? 'bg-emerald-100 rounded-lg p-3 -m-3' : ''}>
                  <label className="block text-sm text-slate-500 mb-1">费用科目</label>
                  <select
                    value={displayAfter.expenseCategory}
                    onChange={(e) => handleEdit('expenseCategory', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {expenseCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={getFieldDiff('remarks') ? 'bg-emerald-100 rounded-lg p-3 -m-3' : ''}>
                  <label className="block text-sm text-slate-500 mb-1">备注</label>
                  <textarea
                    value={displayAfter.remarks}
                    onChange={(e) => handleEdit('remarks', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              修正原因
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="请输入修正原因..."
              rows={2}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 resize-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            className="flex items-center gap-2 px-5 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors"
          >
            <Check className="w-4 h-4" />
            确认修正
          </button>
        </div>
      </div>
    </div>
  );
}
