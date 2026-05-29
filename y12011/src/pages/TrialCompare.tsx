import { useState, useEffect } from 'react';
import { GitCompare, ArrowUp, ArrowDown, FileDiff, Download, ArrowLeft } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { useRebateStore } from '../store/rebateStore';
import { DiffReport } from '../types';

export default function TrialCompare() {
  const { trials, selectedTrial, compareVersion1, compareVersion2, compareTrialVersions, setCompareVersions } = useRebateStore();
  const [diffReport, setDiffReport] = useState<DiffReport | null>(null);

  useEffect(() => {
    if (selectedTrial && compareVersion1 && compareVersion2) {
      const diff = compareTrialVersions(selectedTrial.id, compareVersion1, compareVersion2);
      setDiffReport(diff);
    }
  }, [selectedTrial, compareVersion1, compareVersion2, compareTrialVersions]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getFieldLabel = (field: string) => {
    const labels: Record<string, string> = {
      baseAmount: '计算基数',
      calculatedRebate: '计算返利',
      totalDeduction: '扣减金额',
      finalRebateAmount: '最终返利',
      rebateRate: '返利比例',
      rebateAmount: '返利金额'
    };
    return labels[field] || field;
  };

  if (!selectedTrial || !compareVersion1 || !compareVersion2) {
    return (
      <div className="p-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <GitCompare size={48} className="mx-auto text-gray-300 mb-4" />
          <h2 className="text-lg font-medium text-gray-700">请先选择要对比的试算版本</h2>
          <p className="text-sm text-gray-500 mt-2">前往返利试算页面，选择两个版本进行对比</p>
          <button
            onClick={() => window.location.href = '/trial/calculate'}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            前往试算页面
          </button>
        </div>
      </div>
    );
  }

  const version1 = selectedTrial.versions.find(v => v.versionNo === compareVersion1);
  const version2 = selectedTrial.versions.find(v => v.versionNo === compareVersion2);

  if (!version1 || !version2) {
    return null;
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <button
          onClick={() => window.location.href = '/trial/calculate'}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft size={16} className="mr-2" />
          返回试算
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">版本对比</h1>
            <p className="text-gray-500 mt-1">
              {selectedTrial.dealerName} - {selectedTrial.period}</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
              <Download size={16} className="mr-2" />
              导出差异报告
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              <Badge variant="info">V{version1.versionNo}</Badge>
              <span className="text-sm text-gray-500 ml-2">{version1.createTime}</span>
            </h2>
          </div>
          <div className="space-y-3">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">计算基数</p>
              <p className="text-xl font-semibold text-gray-900">{formatCurrency(version1.baseAmount)}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-600">计算返利</p>
              <p className="text-xl font-semibold text-blue-600">{formatCurrency(version1.calculatedRebate)}</p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <p className="text-xs text-orange-600">扣减金额</p>
              <p className="text-xl font-semibold text-orange-600">{formatCurrency(version1.totalDeduction)}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-xs text-green-600">最终返利</p>
              <p className="text-xl font-semibold text-green-600">{formatCurrency(version1.finalRebateAmount)}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-b from-purple-50 to-purple-100 rounded-xl p-6 flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-purple-200 rounded-full flex items-center justify-center mb-3">
            <GitCompare size={32} className="text-purple-600" />
          </div>
          <p className="text-sm font-medium text-purple-700">版本差异对比</p>
          {diffReport && (
            <>
              <div className="text-center mt-2">
                <span className={`text-2xl font-bold ${diffReport.summary.amountDifference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {diffReport.summary.amountDifference >= 0 ? '+' : ''}{formatCurrency(diffReport.summary.amountDifference)}
                </span>
                <span className="text-sm text-purple-600 ml-2">
                  {diffReport.summary.amountDifference >= 0 ? '增加' : '减少'}
                </span>
              </div>
              <p className="text-xs text-purple-500 mt-1">
                共 {diffReport.summary.totalChanges} 处变化
              </p>
            </>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              <Badge variant="success">V{version2.versionNo}</Badge>
              <span className="text-sm text-gray-500 ml-2">{version2.createTime}</span>
            </h2>
          </div>
          <div className="space-y-3">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">计算基数</p>
              <p className="text-xl font-semibold text-gray-900">{formatCurrency(version2.baseAmount)}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-600">计算返利</p>
              <p className="text-xl font-semibold text-blue-600">{formatCurrency(version2.calculatedRebate)}</p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <p className="text-xs text-orange-600">扣减金额</p>
              <p className="text-xl font-semibold text-orange-600">{formatCurrency(version2.totalDeduction)}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-xs text-green-600">最终返利</p>
              <p className="text-xl font-semibold text-green-600">{formatCurrency(version2.finalRebateAmount)}</p>
            </div>
          </div>
        </div>
      </div>

      {diffReport && diffReport.differences.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FileDiff size={20} className="mr-2 text-purple-600" />
            总体差异
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">字段</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">V{compareVersion1}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">V{compareVersion2}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">变化</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {diffReport.differences.map((diff, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900">{getFieldLabel(diff.fieldName)}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-gray-600">{typeof diff.oldValue === 'number' ? formatCurrency(diff.oldValue as number) : diff.oldValue}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-medium text-gray-900">{typeof diff.newValue === 'number' ? formatCurrency(diff.newValue as number) : diff.newValue}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className={`inline-flex items-center ${diff.changeType === 'increase' ? 'text-green-600' : 'text-red-600'}`}>
                        {diff.changeType === 'increase' ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                        <span className="font-medium ml-1">
                          {diff.changeAmount !== undefined ? formatCurrency(diff.changeAmount) : '已修改'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {diffReport && diffReport.calculationDiffs.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            计算明细差异
          </h2>
          <div className="space-y-3">
            {diffReport.calculationDiffs.map((calcDiff) => (
              <div key={calcDiff.orderNo} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-blue-600">{calcDiff.orderNo}</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {calcDiff.fieldDiffs.map((fieldDiff, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm text-gray-600">{getFieldLabel(fieldDiff.fieldName)}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-500">
                          {typeof fieldDiff.oldValue === 'number' ? formatCurrency(fieldDiff.oldValue) : fieldDiff.oldValue}
                        </span>
                        <span className="text-gray-400">→</span>
                        <span className="text-sm font-medium text-gray-900">
                          {typeof fieldDiff.newValue === 'number' ? formatCurrency(fieldDiff.newValue) : fieldDiff.newValue}
                        </span>
                        {fieldDiff.changeType === 'increase' ? (
                          <ArrowUp size={14} className="text-green-500" />
                        ) : (
                          <ArrowDown size={14} className="text-red-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {version1.correctionLogs && version1.correctionLogs.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            修正记录
          </h2>
          <div className="space-y-3">
            {version1.correctionLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-4 p-4 bg-purple-50 rounded-lg">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <FileDiff size={20} className="text-purple-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="info">{log.fieldName}</Badge>
                    <span className="text-xs text-gray-500">{log.operateTime}</span>
                  </div>
                  <p className="text-sm text-gray-700">
                    {log.oldValue} → {log.newValue}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    原因: {log.reason}
                  </p>
                  <p className="text-xs text-gray-400">操作人: {log.operator}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
