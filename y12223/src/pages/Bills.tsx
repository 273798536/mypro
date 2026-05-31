import { useState } from 'react';
import { Edit3, Eye, Clock, FileText, AlertCircle, Check } from 'lucide-react';
import { useStore } from '../store/useStore';
import { filmProjects } from '../data/mockData';
import StatusBadge from '../components/StatusBadge';
import FilterBar from '../components/FilterBar';
import type { SupplierBill } from '../types';

export default function Bills() {
  const { getFilteredBills, getProjectById, setCompareMode } = useStore();
  const [selectedBill, setSelectedBill] = useState<SupplierBill | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const filteredBills = getFilteredBills();

  const handleManualCorrect = (bill: SupplierBill) => {
    const beforeSnapshot = {
      id: bill.id,
      supplierName: bill.supplierName,
      amount: bill.amount,
      expenseCategory: bill.originalCategory || bill.expenseCategory,
      remarks: bill.remarks,
    };
    const afterSnapshot = {
      id: bill.id,
      supplierName: bill.supplierName,
      amount: bill.amount,
      expenseCategory: bill.expenseCategory,
      remarks: bill.remarks,
    };
    setCompareMode(true, beforeSnapshot, afterSnapshot);
  };

  const handleViewDetail = (bill: SupplierBill) => {
    setSelectedBill(bill);
    setShowDetailModal(true);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">供应商账单</h1>
        <p className="text-slate-500 mt-1">管理和审核所有供应商账单</p>
      </div>

      <FilterBar />

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  账单编号
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  供应商
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  影片项目
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  费用科目
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  金额
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  日期
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBills.map((bill) => {
                const project = getProjectById(bill.projectId);
                return (
                  <tr
                    key={bill.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-sm text-slate-600">
                        {bill.id.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                          <FileText className="w-4 h-4 text-slate-500" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">
                            {bill.supplierName}
                          </p>
                          {bill.remarks && (
                            <p className="text-xs text-slate-400 truncate max-w-[200px]">
                              {bill.remarks}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                      {project?.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-700">{bill.expenseCategory}</span>
                        {bill.isCategoryMismatch && (
                          <span className="text-xs text-rose-500 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            串片
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-semibold text-slate-800">
                      ¥{bill.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        {bill.billDate}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={bill.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewDetail(bill)}
                          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                          title="查看详情"
                        >
                          <Eye className="w-4 h-4 text-slate-500" />
                        </button>
                        {(bill.isCategoryMismatch || bill.hasMissingFields) && (
                          <button
                            onClick={() => handleManualCorrect(bill)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors text-sm font-medium"
                          >
                            <Edit3 className="w-4 h-4" />
                            手动修正
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredBills.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>暂无符合条件的账单</p>
          </div>
        )}
      </div>

      {showDetailModal && selectedBill && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">账单详情</h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(85vh-130px)]">
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm text-slate-500 mb-1">账单编号</label>
                  <p className="font-mono text-slate-800">{selectedBill.id.toUpperCase()}</p>
                </div>
                <div>
                  <label className="block text-sm text-slate-500 mb-1">账单日期</label>
                  <p className="text-slate-800">{selectedBill.billDate}</p>
                </div>
                <div>
                  <label className="block text-sm text-slate-500 mb-1">供应商</label>
                  <p className="font-medium text-slate-800">{selectedBill.supplierName}</p>
                </div>
                <div>
                  <label className="block text-sm text-slate-500 mb-1">影片项目</label>
                  <p className="text-slate-800">
                    {filmProjects.find((p) => p.id === selectedBill.projectId)?.name}
                  </p>
                </div>
                <div>
                  <label className="block text-sm text-slate-500 mb-1">费用科目</label>
                  <p className="text-slate-800">{selectedBill.expenseCategory}</p>
                </div>
                <div>
                  <label className="block text-sm text-slate-500 mb-1">金额</label>
                  <p className="font-bold text-lg text-slate-800">
                    ¥{selectedBill.amount.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm text-slate-500 mb-2">状态标记</label>
                <div className="flex flex-wrap gap-2">
                  {selectedBill.hasMissingFields && (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-sm">
                      <AlertCircle className="w-4 h-4" />
                      缺字段
                    </span>
                  )}
                  {selectedBill.isLateSupplement && (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-700 rounded-lg text-sm">
                      <Clock className="w-4 h-4" />
                      晚补记录
                    </span>
                  )}
                  {selectedBill.isCategoryMismatch && (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-700 rounded-lg text-sm">
                      <AlertCircle className="w-4 h-4" />
                      科目串片
                    </span>
                  )}
                  {!selectedBill.hasMissingFields && !selectedBill.isLateSupplement && !selectedBill.isCategoryMismatch && (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-sm">
                      <Check className="w-4 h-4" />
                      正常
                    </span>
                  )}
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm text-slate-500 mb-2">备注</label>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-slate-700">{selectedBill.remarks || '(无备注)'}</p>
                </div>
              </div>

              {selectedBill.remarksHistory.length > 0 && (
                <div>
                  <label className="block text-sm text-slate-500 mb-3">备注修改历史</label>
                  <div className="space-y-3">
                    {selectedBill.remarksHistory.map((change) => (
                      <div
                        key={change.id}
                        className="p-4 bg-slate-50 rounded-xl border border-slate-200"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-slate-700">
                            {change.operator}
                          </span>
                          <span className="text-xs text-slate-400">{change.operatedAt}</span>
                        </div>
                        <div className="flex items-start gap-3 text-sm">
                          <span className="text-rose-600 line-through">
                            {change.oldValue || '(空)'}
                          </span>
                          <span className="text-slate-400">→</span>
                          <span className="text-emerald-600">{change.newValue}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                关闭
              </button>
              {(selectedBill.isCategoryMismatch || selectedBill.hasMissingFields) && (
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    handleManualCorrect(selectedBill);
                  }}
                  className="flex items-center gap-2 px-5 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                  手动修正
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
