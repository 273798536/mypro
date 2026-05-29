import { useState } from 'react';
import { Calculator, RefreshCw, FileText, ChevronDown, ChevronUp, Eye, GitCompare, Download } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { useRebateStore } from '../store/rebateStore';
import { RebateTrial, TrialVersion } from '../types';

export default function TrialCalculate() {
  const { trials, dealers, agreements, calculateRebate, setSelectedTrial, setCompareVersions } = useRebateStore();
  const [selectedDealer, setSelectedDealer] = useState('');
  const [selectedAgreement, setSelectedAgreement] = useState('');
  const [period, setPeriod] = useState('2024年Q1');
  const [expandedTrial, setExpandedTrial] = useState<string | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const handleCalculate = () => {
    if (!selectedDealer || !selectedAgreement) return;
    calculateRebate(selectedDealer, selectedAgreement, period, '财务BP-张三');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'calculated':
        return <Badge variant="success">已计算</Badge>;
      case 'adjusted':
        return <Badge variant="warning">已调整</Badge>;
      case 'reviewed':
        return <Badge variant="info">已复核</Badge>;
      case 'finalized':
        return <Badge variant="purple">已确认</Badge>;
      default:
        return <Badge variant="default">草稿</Badge>;
    }
  };

  const handleViewVersion = (trial: RebateTrial, version: TrialVersion) => {
    setSelectedTrial({ ...trial, versions: [version] });
  };

  const handleCompare = (trial: RebateTrial, v1: number, v2: number) => {
    setSelectedTrial(trial);
    setCompareVersions(v1, v2);
    window.location.href = '/trial/compare';
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">返利试算</h1>
        <p className="text-gray-500 mt-1">根据返利协议自动计算返利金额，支持人工调整和多版本管理</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Calculator size={20} className="mr-2 text-blue-600" />
          新建试算
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">经销商</label>
            <select
              value={selectedDealer}
              onChange={(e) => setSelectedDealer(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">请选择经销商</option>
              {dealers.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">返利协议</label>
            <select
              value={selectedAgreement}
              onChange={(e) => setSelectedAgreement(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">请选择协议</option>
              {agreements.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">核算周期</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="2024年Q1">2024年Q1</option>
              <option value="2024年Q2">2024年Q2</option>
              <option value="2024年Q3">2024年Q3</option>
              <option value="2024年Q4">2024年Q4</option>
              <option value="2024年全年">2024年全年</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleCalculate}
              disabled={!selectedDealer || !selectedAgreement}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <Calculator size={16} className="mr-2" />
              开始试算
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">试算记录</h2>
        </div>
        
        <div className="divide-y divide-gray-100">
          {trials.map((trial) => (
            <div key={trial.id}>
              <div 
                className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => setExpandedTrial(expandedTrial === trial.id ? null : trial.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {expandedTrial === trial.id ? (
                      <ChevronUp size={20} className="text-gray-400" />
                    ) : (
                      <ChevronDown size={20} className="text-gray-400" />
                    )}
                    <div>
                      <h3 className="font-medium text-gray-900">{trial.dealerName}</h3>
                      <p className="text-sm text-gray-500">{trial.period}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-xs text-gray-500">最终返利</p>
                      <p className="text-lg font-bold text-blue-600">
                        {formatCurrency(trial.versions[trial.versions.length - 1]?.finalRebateAmount || 0)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="info">V{trial.currentVersion}</Badge>
                      {getStatusBadge(trial.status)}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">创建时间</p>
                      <p className="text-sm text-gray-700">{trial.createTime}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {trial.versions.length >= 2 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCompare(trial, 1, trial.currentVersion);
                          }}
                          className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="版本对比"
                        >
                          <GitCompare size={18} />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="导出"
                      >
                        <Download size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              {expandedTrial === trial.id && (
                <div className="px-6 pb-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">版本历史</h4>
                    <div className="space-y-3">
                      {trial.versions.slice().reverse().map((version) => (
                        <div key={version.id} className="bg-white border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <Badge variant="purple">V{version.versionNo}</Badge>
                              {getStatusBadge(version.status)}
                              <span className="text-sm text-gray-500">{version.createTime}</span>
                              <span className="text-sm text-gray-500">操作人: {version.operator}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleViewVersion(trial, version)}
                                className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors flex items-center"
                              >
                                <Eye size={14} className="mr-1" />
                                查看详情
                              </button>
                              <button
                                onClick={() => handleCompare(trial, version.versionNo, trial.currentVersion)}
                                className="px-3 py-1 text-sm text-purple-600 hover:bg-purple-50 rounded transition-colors flex items-center"
                              >
                                <GitCompare size={14} className="mr-1" />
                                对比
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-4 gap-4">
                            <div className="p-3 bg-gray-50 rounded-lg">
                              <p className="text-xs text-gray-500">计算基数</p>
                              <p className="text-lg font-semibold text-gray-900">{formatCurrency(version.baseAmount)}</p>
                            </div>
                            <div className="p-3 bg-blue-50 rounded-lg">
                              <p className="text-xs text-blue-600">计算返利</p>
                              <p className="text-lg font-semibold text-blue-600">{formatCurrency(version.calculatedRebate)}</p>
                            </div>
                            <div className="p-3 bg-orange-50 rounded-lg">
                              <p className="text-xs text-orange-600">扣减金额</p>
                              <p className="text-lg font-semibold text-orange-600">{formatCurrency(version.totalDeduction)}</p>
                            </div>
                            <div className="p-3 bg-green-50 rounded-lg">
                              <p className="text-xs text-green-600">最终返利</p>
                              <p className="text-lg font-semibold text-green-600">{formatCurrency(version.finalRebateAmount)}</p>
                            </div>
                          </div>
                          {version.correctionLogs.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <p className="text-xs text-gray-500 mb-2">修正记录:</p>
                              <div className="space-y-1">
                                {version.correctionLogs.map((log) => (
                                  <div key={log.id} className="text-xs text-gray-600 flex items-center gap-2">
                                    <RefreshCw size={12} className="text-purple-500" />
                                    <span>{log.fieldName}: {log.oldValue} → {log.newValue}</span>
                                    <span className="text-gray-400">({log.reason})</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {version.deductions.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <p className="text-xs text-gray-500 mb-2">扣减明细:</p>
                              <div className="space-y-2">
                                {version.deductions.map((ded) => (
                                  <div key={ded.id} className="text-sm flex items-center justify-between p-2 bg-orange-50 rounded">
                                    <div>
                                      <span className="font-medium text-gray-700">
                                        {ded.type === 'return' ? '退货冲减' : ded.type === 'penalty' ? '罚息' : '其他扣减'}
                                      </span>
                                      <span className="ml-2 text-gray-500">{ded.explanation}</span>
                                    </div>
                                    <span className="font-medium text-orange-600">-{formatCurrency(ded.amount)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
