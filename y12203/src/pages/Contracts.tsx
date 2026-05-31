import { useState } from 'react';
import { Plus, Edit2, GitCompare } from 'lucide-react';
import { useAppStore } from '../store';
import { formatDate, formatCurrency } from '../utils/calculator';
import { formatFieldName, formatValue, deepDiff } from '../utils/diff';
import { Contract } from '../types';

export default function Contracts() {
  const { contracts, contractVersions, updateContract } = useAppStore();
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [changeReason, setChangeReason] = useState('');
  const [selectedVersions, setSelectedVersions] = useState<{
    contractId: string;
    v1: string;
    v2: string;
  } | null>(null);

  const [formData, setFormData] = useState<Partial<Contract>>({});

  const handleEdit = (contract: Contract) => {
    setEditingContract(contract);
    setFormData({
      shareRate: contract.shareRate,
      deductible: contract.deductible,
      expiryDate: contract.expiryDate,
    });
    setShowVersionModal(true);
  };

  const handleSave = () => {
    if (!editingContract || !changeReason) return;

    updateContract(editingContract.id, formData, changeReason);
    setShowVersionModal(false);
    setEditingContract(null);
    setChangeReason('');
  };

  const handleCompare = (contractId: string) => {
    const versions = contractVersions.filter((v) => v.contractId === contractId);
    if (versions.length >= 2) {
      setSelectedVersions({
        contractId,
        v1: versions[versions.length - 2].id,
        v2: versions[versions.length - 1].id,
      });
    }
  };

  const getVersionsForContract = (contractId: string) => {
    return contractVersions.filter((v) => v.contractId === contractId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold text-gray-900">分保合同</h1>
          <p className="text-gray-500 mt-1">管理分保合同及版本历史</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary-700 text-white rounded-lg hover:bg-primary-800 transition-colors">
          <Plus className="w-4 h-4" />
          新增合同
        </button>
      </div>

      <div className="space-y-4">
        {contracts.map((contract) => {
          const versions = getVersionsForContract(contract.id);
          return (
            <div
              key={contract.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {contract.contractNo}
                    </h3>
                    <span className="px-2 py-0.5 bg-primary-100 text-primary-700 text-sm font-medium rounded">
                      {contract.version}
                    </span>
                    {contract.isActive && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">
                        有效
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {contract.reinsurer}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {versions.length >= 2 && (
                    <button
                      onClick={() => handleCompare(contract.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                    >
                      <GitCompare className="w-4 h-4" />
                      版本对比
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(contract)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    修改
                  </button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-6">
                <div>
                  <p className="text-xs text-gray-500">分保方式</p>
                  <p className="font-medium text-gray-900">
                    {contract.layerType === 'quota' ? '成数分保' : '溢额分保'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">分保比例</p>
                  <p className="font-medium text-gray-900">
                    {(contract.shareRate * 100).toFixed(0)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">免赔额</p>
                  <p className="font-medium text-gray-900">
                    {formatCurrency(contract.deductible)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">生效日期</p>
                  <p className="font-medium text-gray-900">
                    {formatDate(contract.effectiveDate)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">到期日期</p>
                  <p className="font-medium text-gray-900">
                    {formatDate(contract.expiryDate)}
                  </p>
                </div>
              </div>

              {versions.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-2">版本历史</p>
                  <div className="flex items-center gap-2">
                    {versions.map((v, idx) => (
                      <div
                        key={v.id}
                        className="flex items-center gap-1"
                      >
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            idx === versions.length - 1
                              ? 'bg-accent-100 text-accent-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {v.versionNo}
                        </span>
                        {idx < versions.length - 1 && (
                          <span className="text-gray-300">→</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showVersionModal && editingContract && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                修改合同 - {editingContract.contractNo}
              </h3>
              <p className="text-sm text-gray-500">
                当前版本: {editingContract.version}
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  分保比例
                </label>
                <input
                  type="number"
                  value={formData.shareRate ? formData.shareRate * 100 : ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      shareRate: parseFloat(e.target.value) / 100,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="输入百分比，如 35"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  免赔额
                </label>
                <input
                  type="number"
                  value={formData.deductible || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      deductible: parseFloat(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  修改原因 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="请输入修改原因"
                  rows={2}
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowVersionModal(false);
                  setEditingContract(null);
                  setChangeReason('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={!changeReason}
                className="px-4 py-2 bg-primary-700 text-white rounded-lg hover:bg-primary-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                保存新版本
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedVersions && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">版本对比</h3>
                  <p className="text-sm text-gray-500">
                    {contracts.find((c) => c.id === selectedVersions.contractId)?.contractNo}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedVersions(null)}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-6">
              {(() => {
                const v1 = contractVersions.find(
                  (v) => v.id === selectedVersions.v1
                );
                const v2 = contractVersions.find(
                  (v) => v.id === selectedVersions.v2
                );
                if (!v1 || !v2) return null;

                const diffs = deepDiff(v1.afterData, v2.afterData);

                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm font-medium text-gray-500 mb-2">
                          {v1.versionNo}
                        </p>
                        <p className="text-xs text-gray-400">
                          {v1.changeReason}
                        </p>
                      </div>
                      <div className="bg-primary-50 rounded-lg p-4">
                        <p className="text-sm font-medium text-primary-700 mb-2">
                          {v2.versionNo}
                        </p>
                        <p className="text-xs text-primary-500">
                          {v2.changeReason}
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-4">
                      <h4 className="font-medium text-gray-900 mb-3">差异详情</h4>
                      <div className="space-y-3">
                        {diffs.map((diff, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
                          >
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">
                                {formatFieldName(diff.field)}
                              </p>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="px-2 py-1 bg-red-100 text-red-700 text-sm rounded">
                                {formatValue(diff.before)}
                              </span>
                              <span className="text-gray-400">→</span>
                              <span className="px-2 py-1 bg-green-100 text-green-700 text-sm rounded">
                                {formatValue(diff.after)}
                              </span>
                            </div>
                          </div>
                        ))}
                        {diffs.length === 0 && (
                          <p className="text-gray-500 text-center py-4">
                            无差异
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
