import { useState } from 'react';
import { 
  Calculator, 
  Calendar, 
  Tag, 
  GitBranch, 
  CheckCircle2, 
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Download,
  Save,
  RotateCcw,
  Info,
  Hash
} from 'lucide-react';
import { useReserveStore } from '../store/useReserveStore';
import { formatCurrency, formatDate } from '../utils/calculationEngine';
import { exportToExcel } from '../utils/exportUtils';

export default function TrialCalculation() {
  const {
    models,
    ruleVersions,
    selectedModel,
    selectedRuleVersion,
    startDate,
    endDate,
    isCalculating,
    calculations,
    getRuleForModel,
    setSelectedModel,
    setSelectedRuleVersion,
    setDateRange,
    performTrialCalculation,
    confirmCalculation,
    calculationVersions,
  } = useReserveStore();
  
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const currentRule = getRuleForModel(selectedModel, selectedRuleVersion);
  
  const handleConfirm = () => {
    confirmCalculation();
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };
  
  const toggleExpand = (batchNo: string) => {
    setExpandedBatch(expandedBatch === batchNo ? null : batchNo);
  };
  
  return (
    <div className="space-y-6">
      {showSuccess && (
        <div className="fixed top-4 right-4 z-50 animate-slide-up">
          <div className="flex items-center gap-3 bg-emerald-500 text-white px-6 py-4 rounded-lg shadow-xl">
            <CheckCircle2 className="w-5 h-5" />
            <span>计算结果已确认并保存版本留痕</span>
          </div>
        </div>
      )}
      
      <div className="card">
        <h3 className="text-lg font-serif font-semibold text-slate-800 mb-6 flex items-center gap-2">
          <Calculator className="w-5 h-5 text-primary-600" />
          计算参数设置
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
              <Tag className="w-4 h-4" />
              选择型号
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="input-field"
            >
              {models.map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
              <GitBranch className="w-4 h-4" />
              规则版本
            </label>
            <select
              value={selectedRuleVersion}
              onChange={(e) => setSelectedRuleVersion(e.target.value)}
              className="input-field"
            >
              {ruleVersions.map(version => (
                <option key={version} value={version}>{version}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              开始日期
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setDateRange(e.target.value, endDate)}
              className="input-field"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              结束日期
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setDateRange(startDate, e.target.value)}
              className="input-field"
            />
          </div>
        </div>
        
        {currentRule && (
          <div className="mt-6 p-4 bg-primary-50 rounded-lg border border-primary-200">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-primary-900">当前准备金规则 ({currentRule.version})</p>
                <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-primary-600">计提比例:</span>
                    <span className="ml-2 font-semibold text-primary-900">{(currentRule.reserveRate * 100).toFixed(2)}%</span>
                  </div>
                  <div>
                    <span className="text-primary-600">滚动周期:</span>
                    <span className="ml-2 font-semibold text-primary-900">{currentRule.rollbackMonths}个月</span>
                  </div>
                  <div>
                    <span className="text-primary-600">生效日期:</span>
                    <span className="ml-2 font-semibold text-primary-900">{formatDate(currentRule.effectiveDate)}</span>
                  </div>
                  <div>
                    <span className="text-primary-600">创建人:</span>
                    <span className="ml-2 font-semibold text-primary-900">{currentRule.createdBy}</span>
                  </div>
                </div>
                {currentRule.changeReason && (
                  <p className="mt-2 text-sm text-primary-700">
                    <span className="font-medium">变更原因:</span> {currentRule.changeReason}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
        
        <div className="mt-6 flex items-center gap-4">
          <button
            onClick={performTrialCalculation}
            disabled={isCalculating}
            className="btn-primary flex items-center gap-2"
          >
            {isCalculating ? (
              <RotateCcw className="w-4 h-4 animate-spin" />
            ) : (
              <Calculator className="w-4 h-4" />
            )}
            {isCalculating ? '计算中...' : '执行试算'}
          </button>
          
          <button
            onClick={handleConfirm}
            disabled={calculations.length === 0 || isCalculating}
            className="btn-success flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            确认计算结果
          </button>
          
          <button
            onClick={() => exportToExcel(calculations, { includeHash: true, includeEvidence: true })}
            disabled={calculations.length === 0}
            className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            导出Excel
          </button>
          
          {calculationVersions.length > 0 && (
            <div className="ml-auto flex items-center gap-2 text-sm text-slate-500">
              <Hash className="w-4 h-4" />
              <span>已保存 {calculationVersions.length} 个历史版本</span>
            </div>
          )}
        </div>
      </div>
      
      {calculations.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-serif font-semibold text-slate-800">计算结果</h3>
              <p className="text-sm text-slate-500">共 {calculations.length} 个批次的滚动计算结果</p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="text-right">
                <p className="text-slate-500">期末准备金总额</p>
                <p className="text-2xl font-bold text-primary-800 font-serif">
                  {formatCurrency(calculations[calculations.length - 1]?.endingReserve || 0)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="table-header">
                  <th className="px-4 py-3 text-left w-10"></th>
                  <th className="px-4 py-3 text-left">批次</th>
                  <th className="px-4 py-3 text-right">期初余额</th>
                  <th className="px-4 py-3 text-right">本期计提</th>
                  <th className="px-4 py-3 text-right">本期冲回</th>
                  <th className="px-4 py-3 text-right">期末余额</th>
                  <th className="px-4 py-3 text-center">规则版本</th>
                  <th className="px-4 py-3 text-center">数据哈希</th>
                </tr>
              </thead>
              <tbody>
                {calculations.map((calc, idx) => (
                  <>
                    <tr key={calc.id} className={`table-row cursor-pointer ${expandedBatch === calc.batchNo ? 'bg-primary-50' : ''}`}
                        onClick={() => toggleExpand(calc.batchNo)}>
                      <td className="px-4 py-3">
                        {expandedBatch === calc.batchNo ? (
                          <ChevronUp className="w-4 h-4 text-primary-600" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        <div className="flex items-center gap-2">
                          {calc.batchNo}
                          {idx === 0 && (
                            <span className="badge badge-info">起始批次</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(calc.beginningReserve)}</td>
                      <td className="px-4 py-3 text-right text-emerald-600 font-medium">+{formatCurrency(calc.currentAccrual)}</td>
                      <td className="px-4 py-3 text-right text-amber-600 font-medium">-{formatCurrency(calc.currentWriteBack)}</td>
                      <td className={`px-4 py-3 text-right font-bold ${calc.endingReserve < 0 ? 'text-rose-600' : 'text-primary-800'}`}>
                        {formatCurrency(calc.endingReserve)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="badge badge-info">{calc.ruleVersion}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs font-mono text-slate-500" title={calc.dataSnapshot.dataHash}>
                          {calc.dataSnapshot.dataHash.slice(0, 8)}...
                        </span>
                      </td>
                    </tr>
                    
                    {expandedBatch === calc.batchNo && (
                      <tr className="bg-slate-50">
                        <td colSpan={8} className="px-4 py-4">
                          <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-4">
                              <h4 className="font-semibold text-slate-800">计算步骤详情</h4>
                              <span className="text-xs text-slate-500">
                                数据快照: {calc.dataSnapshot.shipmentCount} 条出货, {calc.dataSnapshot.claimCount} 条索赔
                              </span>
                            </div>
                            
                            <div className="grid gap-3">
                              {calc.calculationSteps.map((step) => (
                                <div key={step.stepNo} className="flex items-start gap-4 p-4 bg-white rounded-lg border border-slate-200">
                                  <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                                    {step.stepNo}
                                  </div>
                                  <div className="flex-1">
                                    <p className="font-medium text-slate-800">{step.description}</p>
                                    <p className="text-sm text-slate-600 mt-1 font-mono bg-slate-50 px-2 py-1 rounded">
                                      {step.formula}
                                    </p>
                                    <p className="text-sm text-slate-500 mt-2">
                                      计算结果: <span className="font-semibold text-primary-700">{formatCurrency(step.result)}</span>
                                    </p>
                                    {step.evidence && (
                                      <div className="mt-2 flex items-start gap-2 p-2 bg-amber-50 rounded border border-amber-200">
                                        <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                                        <p className="text-xs text-amber-800">
                                          <span className="font-medium">证据:</span> {step.evidence}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                            
                            <div className="mt-4 p-4 bg-slate-100 rounded-lg">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <span className="text-slate-500">出货金额:</span>
                                  <p className="font-semibold text-slate-800">{formatCurrency(calc.shipmentAmount)}</p>
                                </div>
                                <div>
                                  <span className="text-slate-500">有效索赔:</span>
                                  <p className="font-semibold text-emerald-700">{formatCurrency(calc.claimAmount)}</p>
                                </div>
                                <div>
                                  <span className="text-slate-500">重复索赔:</span>
                                  <p className="font-semibold text-rose-700">{formatCurrency(calc.duplicateClaimAmount)}</p>
                                </div>
                                <div>
                                  <span className="text-slate-500">计算时间:</span>
                                  <p className="font-semibold text-slate-800">{formatDate(calc.calcDate)}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {calculationVersions.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-serif font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-primary-600" />
            历史版本留痕
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="table-header">
                  <th className="px-4 py-3 text-left">版本号</th>
                  <th className="px-4 py-3 text-left">创建时间</th>
                  <th className="px-4 py-3 text-left">操作员</th>
                  <th className="px-4 py-3 text-left">规则版本</th>
                  <th className="px-4 py-3 text-right">期末余额</th>
                  <th className="px-4 py-3 text-center">数据哈希</th>
                </tr>
              </thead>
              <tbody>
                {[...calculationVersions].reverse().map((version) => (
                  <tr key={version.id} className="table-row">
                    <td className="px-4 py-3 font-medium text-slate-800">v{version.versionNo}</td>
                    <td className="px-4 py-3 text-slate-600">{new Date(version.createdAt).toLocaleString('zh-CN')}</td>
                    <td className="px-4 py-3 text-slate-600">{version.operator}</td>
                    <td className="px-4 py-3">
                      <span className="badge badge-info">{version.ruleSnapshot.version}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-primary-800">
                      {formatCurrency(version.calculationSnapshot.endingReserve)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs font-mono text-slate-500" title={version.dataHash}>
                        {version.dataHash.slice(0, 12)}...
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
