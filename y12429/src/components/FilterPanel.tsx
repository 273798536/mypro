import React from 'react';
import { useCollectionStore } from '../store/collectionStore';
import type { MilestoneStatus, RecordType } from '../types';

export const FilterPanel: React.FC = () => {
  const { filterOptions, setFilterOptions } = useCollectionStore();

  const statusOptions: { value: MilestoneStatus; label: string }[] = [
    { value: 'pending', label: '待处理' },
    { value: 'verified', label: '已审核' },
    { value: 'rejected', label: '已拒绝' },
    { value: 'supplementary', label: '待补充' },
    { value: 'completed', label: '已完成' },
  ];

  const recordTypeOptions: { value: RecordType; label: string }[] = [
    { value: 'normal', label: '正常' },
    { value: 'sales_supplement', label: '销售补报' },
    { value: 'correction', label: '金额调整' },
  ];

  const handleStatusChange = (status: MilestoneStatus) => {
    const currentStatus = filterOptions.status || [];
    const newStatus = currentStatus.includes(status)
      ? currentStatus.filter((s) => s !== status)
      : [...currentStatus, status];
    setFilterOptions({ status: newStatus.length > 0 ? newStatus : undefined });
  };

  const handleRecordTypeChange = (type: RecordType) => {
    const currentTypes = filterOptions.recordType || [];
    const newTypes = currentTypes.includes(type)
      ? currentTypes.filter((t) => t !== type)
      : [...currentTypes, type];
    setFilterOptions({ recordType: newTypes.length > 0 ? newTypes : undefined });
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">筛选条件</h3>
        <button
          onClick={() => setFilterOptions({})}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          重置筛选
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            合同编号
          </label>
          <input
            type="text"
            value={filterOptions.contractNo || ''}
            onChange={(e) => setFilterOptions({ contractNo: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="输入合同编号"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            被许可方
          </label>
          <input
            type="text"
            value={filterOptions.licensee || ''}
            onChange={(e) => setFilterOptions({ licensee: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="输入被许可方名称"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            特殊标记
          </label>
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                checked={filterOptions.hasEvidenceMissing || false}
                onChange={(e) =>
                  setFilterOptions({
                    hasEvidenceMissing: e.target.checked ? true : undefined,
                  })
                }
                className="rounded text-blue-600"
              />
              <span className="ml-1 text-sm text-orange-600">证据缺失</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                checked={filterOptions.hasSalesSupplement || false}
                onChange={(e) =>
                  setFilterOptions({
                    hasSalesSupplement: e.target.checked ? true : undefined,
                  })
                }
                className="rounded text-blue-600"
              />
              <span className="ml-1 text-sm text-purple-600">销售补报</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                checked={filterOptions.hasInvoiceReversed || false}
                onChange={(e) =>
                  setFilterOptions({
                    hasInvoiceReversed: e.target.checked ? true : undefined,
                  })
                }
                className="rounded text-blue-600"
              />
              <span className="ml-1 text-sm text-gray-600">开票冲红</span>
            </label>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              状态
            </label>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((option) => (
                <label
                  key={option.value}
                  className="inline-flex items-center cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={(filterOptions.status || []).includes(
                      option.value
                    )}
                    onChange={() => handleStatusChange(option.value)}
                    className="rounded text-blue-600"
                  />
                  <span className="ml-1 text-sm text-gray-700">
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              记录类型
            </label>
            <div className="flex flex-wrap gap-2">
              {recordTypeOptions.map((option) => (
                <label
                  key={option.value}
                  className="inline-flex items-center cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={(filterOptions.recordType || []).includes(
                      option.value
                    )}
                    onChange={() => handleRecordTypeChange(option.value)}
                    className="rounded text-blue-600"
                  />
                  <span className="ml-1 text-sm text-gray-700">
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
