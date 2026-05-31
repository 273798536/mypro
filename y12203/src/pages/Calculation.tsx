import { useState } from 'react';
import { Calculator, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAppStore } from '../store';
import { formatCurrency, formatDateTime } from '../utils/calculator';

export default function Calculation() {
  const { claims, contracts, recoveries, calculateRecovery, recalculateRecovery } =
    useAppStore();
  const [selectedClaim, setSelectedClaim] = useState<string>('');
  const [selectedContract, setSelectedContract] = useState<string>('');
  const [calculating, setCalculating] = useState(false);

  const handleCalculate = () => {
    if (!selectedClaim || !selectedContract) return;
    setCalculating(true);

    setTimeout(() => {
      calculateRecovery(selectedClaim, selectedContract);
      setCalculating(false);
    }, 500);
  };

  const claimRecoveries = recoveries.filter(
    (r) => selectedClaim && r.claimId === selectedClaim
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold text-gray-900">摊回计算</h1>
        <p className="text-gray-500 mt-1">执行分保赔款摊回计算</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
            <Calculator className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">计算参数</h2>
            <p className="text-sm text-gray-500">选择赔案和分保合同进行摊回计算</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              选择赔案
            </label>
            <select
              value={selectedClaim}
              onChange={(e) => setSelectedClaim(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">请选择赔案</option>
              {claims.map((claim) => (
                <option key={claim.id} value={claim.id}>
                  {claim.caseNo} - {claim.insured}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              选择分保合同
            </label>
            <select
              value={selectedContract}
              onChange={(e) => setSelectedContract(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">请选择合同</option>
              {contracts.map((contract) => (
                <option key={contract.id} value={contract.id}>
                  {contract.contractNo} - {contract.reinsurer} ({contract.version})
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleCalculate}
              disabled={!selectedClaim || !selectedContract || calculating}
              className="w-full px-4 py-2 bg-primary-700 text-white rounded-lg hover:bg-primary-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {calculating ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Calculator className="w-4 h-4" />
              )}
              {calculating ? '计算中...' : '执行计算'}
            </button>
          </div>
        </div>
      </div>

      {selectedClaim && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">
              {claims.find((c) => c.id === selectedClaim)?.caseNo} 计算记录
            </h3>
          </div>

          {claimRecoveries.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      分保合同
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      合同版本
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      赔款金额
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      适用免赔
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      摊回金额
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      状态
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      计算时间
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {claimRecoveries.map((recovery) => (
                    <tr
                      key={recovery.id}
                      className={recovery.hasDeductibleError ? 'animate-pulse-red' : ''}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-medium text-gray-900">
                          {contracts.find((c) => c.id === recovery.contractId)?.contractNo}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs font-medium rounded">
                          {recovery.contractVersion}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {formatCurrency(recovery.totalLoss)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {formatCurrency(recovery.deductibleApplied)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-900">
                        {formatCurrency(recovery.recoverableAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {recovery.hasDeductibleError ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            免赔错用
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            <CheckCircle className="w-3.5 h-3.5" />
                            正常
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-sm">
                        {formatDateTime(recovery.calculatedAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {recovery.hasDeductibleError && (
                          <button
                            onClick={() => recalculateRecovery(recovery.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          >
                            <RefreshCw className="w-4 h-4" />
                            重新计算
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-12 text-center text-gray-500">
              <Calculator className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">暂无计算记录</p>
              <p className="text-sm mt-1">选择参数后点击"执行计算"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
