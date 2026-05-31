import React, { useState } from 'react';
import { useCollectionStore } from '../store/collectionStore';
import {
  formatCurrency,
  formatDate,
  getStatusLabel,
  getStatusColor,
  getRecordTypeLabel,
  getRecordTypeColor,
} from '../utils/format';
import type { CollectionRecord } from '../types';

interface CollectionTableProps {
  onViewDetail: (record: CollectionRecord) => void;
}

export const CollectionTable: React.FC<CollectionTableProps> = ({
  onViewDetail,
}) => {
  const { getFilteredRecords, confirmRecord, updateRecordStatus } =
    useCollectionStore();
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());

  const records = getFilteredRecords();

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedRecords(new Set(records.map((r) => r.id)));
    } else {
      setSelectedRecords(new Set());
    }
  };

  const handleSelectRecord = (recordId: string) => {
    const newSelected = new Set(selectedRecords);
    if (newSelected.has(recordId)) {
      newSelected.delete(recordId);
    } else {
      newSelected.add(recordId);
    }
    setSelectedRecords(newSelected);
  };

  const handleConfirm = (recordId: string) => {
    if (window.confirm('确认该笔收款已完成？')) {
      confirmRecord(recordId, '当前用户');
    }
  };

  const handleStatusChange = (
    recordId: string,
    status: 'verified' | 'rejected' | 'supplementary'
  ) => {
    const remark = prompt('请输入备注：');
    if (remark !== null) {
      updateRecordStatus(recordId, status, remark);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={
                    selectedRecords.size === records.length &&
                    records.length > 0
                  }
                  onChange={handleSelectAll}
                  className="rounded text-blue-600"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                合同信息
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                里程碑
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                金额
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                类型/状态
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                标记
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {records.map((record) => (
              <tr
                key={record.id}
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="px-4 py-4">
                  <input
                    type="checkbox"
                    checked={selectedRecords.has(record.id)}
                    onChange={() => handleSelectRecord(record.id)}
                    className="rounded text-blue-600"
                  />
                </td>
                <td className="px-4 py-4">
                  <div className="text-sm font-medium text-gray-900">
                    {record.contract.contractNo}
                  </div>
                  <div className="text-sm text-gray-500">
                    {record.contract.contractName}
                  </div>
                  <div className="text-xs text-gray-400">
                    {record.contract.licensee}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="text-sm text-gray-900">
                    {record.milestone.milestoneNo}
                  </div>
                  <div className="text-sm text-gray-500">
                    {record.milestone.description}
                  </div>
                  <div className="text-xs text-gray-400">
                    到期: {formatDate(record.milestone.dueDate)}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="text-sm font-medium text-gray-900">
                    {formatCurrency(record.plannedAmount)}
                  </div>
                  {record.difference !== 0 && (
                    <div
                      className={`text-xs ${record.difference > 0 ? 'text-green-600' : 'text-red-600'}`}
                    >
                      差异: {record.difference > 0 ? '+' : ''}
                      {formatCurrency(record.difference)}
                    </div>
                  )}
                  <div className="text-xs text-gray-400">
                    实际: {formatCurrency(record.actualAmount)}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-col gap-1">
                    <span
                      className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${getRecordTypeColor(record.recordType)}`}
                    >
                      {getRecordTypeLabel(record.recordType)}
                    </span>
                    <span
                      className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(record.status)}`}
                    >
                      {getStatusLabel(record.status)}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-1">
                    {record.hasEvidenceMissing && (
                      <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
                        证据缺失
                      </span>
                    )}
                    {record.hasSalesSupplement && (
                      <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                        销售补报
                      </span>
                    )}
                    {record.hasInvoiceReversed && (
                      <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                        开票冲红
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => onViewDetail(record)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      详情
                    </button>
                    {record.status !== 'completed' && (
                      <button
                        onClick={() => handleConfirm(record.id)}
                        className="text-green-600 hover:text-green-800 text-sm"
                      >
                        确认收款
                      </button>
                    )}
                    {record.status === 'pending' && (
                      <>
                        <button
                          onClick={() =>
                            handleStatusChange(record.id, 'verified')
                          }
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          审核通过
                        </button>
                        <button
                          onClick={() =>
                            handleStatusChange(record.id, 'rejected')
                          }
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          拒绝
                        </button>
                        <button
                          onClick={() =>
                            handleStatusChange(record.id, 'supplementary')
                          }
                          className="text-orange-600 hover:text-orange-800 text-sm"
                        >
                          待补充
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {records.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          暂无符合条件的记录
        </div>
      )}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700">
            共 {records.length} 条记录，已选择 {selectedRecords.size} 条
          </span>
        </div>
      </div>
    </div>
  );
};
