import { useState } from 'react';
import { 
  GitCompare, 
  GitBranch, 
  User, 
  Calendar, 
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  ArrowRight
} from 'lucide-react';
import { useReserveStore } from '../store/useReserveStore';
import { formatDate, compareRules } from '../utils/calculationEngine';
import type { ReserveRule } from '../../shared/types';

export default function RuleVersions() {
  const { rules, models, selectedModel, setSelectedModel, ruleVersions } = useReserveStore();
  
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);
  const [compareVersionA, setCompareVersionA] = useState<string | null>(null);
  const [compareVersionB, setCompareVersionB] = useState<string | null>(null);
  
  const modelRules = rules.filter(r => r.model === selectedModel)
    .sort((a, b) => a.version.localeCompare(b.version));
  
  const toggleExpand = (version: string) => {
    setExpandedVersion(expandedVersion === version ? null : version);
  };
  
  const handleCompare = () => {
    if (!compareVersionA || !compareVersionB) return;
  };
  
  const getDifferences = () => {
    if (!compareVersionA || !compareVersionB) return null;
    const ruleA = rules.find(r => r.model === selectedModel && r.version === compareVersionA);
    const ruleB = rules.find(r => r.model === selectedModel && r.version === compareVersionB);
    if (!ruleA || !ruleB) return null;
    return compareRules(ruleA, ruleB);
  };
  
  const differences = getDifferences();
  
  const fieldLabels: Record<string, string> = {
    reserveRate: '计提比例',
    rollbackMonths: '滚动周期(月)',
    effectiveDate: '生效日期',
    expiryDate: '失效日期',
    changeReason: '变更原因',
    exceptionClauses: '例外条款',
  };
  
  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-serif font-semibold text-slate-800 flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-primary-600" />
            准备金规则版本
          </h3>
          <div className="flex items-center gap-4">
            <label className="text-sm text-slate-600">选择型号:</label>
            <select
              value={selectedModel}
              onChange={(e) => {
                setSelectedModel(e.target.value);
                setCompareVersionA(null);
                setCompareVersionB(null);
              }}
              className="input-field w-48"
            >
              {models.map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="px-4 py-3 text-left w-10"></th>
                <th className="px-4 py-3 text-left">版本</th>
                <th className="px-4 py-3 text-left">状态</th>
                <th className="px-4 py-3 text-right">计提比例</th>
                <th className="px-4 py-3 text-right">滚动周期</th>
                <th className="px-4 py-3 text-left">生效日期</th>
                <th className="px-4 py-3 text-left">失效日期</th>
                <th className="px-4 py-3 text-left">创建人</th>
                <th className="px-4 py-3 text-left">变更原因</th>
                <th className="px-4 py-3 text-center">对比</th>
              </tr>
            </thead>
            <tbody>
              {modelRules.map((rule) => {
                const isExpanded = expandedVersion === rule.version;
                const isExpired = new Date(rule.expiryDate) < new Date();
                
                return (
                  <>
                    <tr key={rule.version} className={`table-row cursor-pointer ${isExpanded ? 'bg-primary-50' : ''}`}
                        onClick={() => toggleExpand(rule.version)}>
                      <td className="px-4 py-3">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-primary-600" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        <div className="flex items-center gap-2">
                          <GitBranch className="w-4 h-4 text-primary-500" />
                          {rule.version}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {rule.isActive ? (
                          <span className="badge badge-success">当前生效</span>
                        ) : isExpired ? (
                          <span className="badge badge-danger">已过期</span>
                        ) : (
                          <span className="badge badge-info">历史版本</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-primary-700">
                        {(rule.reserveRate * 100).toFixed(2)}%
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-700">
                        {rule.rollbackMonths} 个月
                      </td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(rule.effectiveDate)}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(rule.expiryDate)}</td>
                      <td className="px-4 py-3 text-slate-600 flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {rule.createdBy}
                      </td>
                      <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate">
                        {rule.changeReason}
                      </td>
                      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="radio"
                            name={`compareA-${rule.version}`}
                            checked={compareVersionA === rule.version}
                            onChange={() => setCompareVersionA(rule.version)}
                            className="w-4 h-4 text-primary-600"
                            title="选择版本A"
                          />
                          <input
                            type="radio"
                            name={`compareB-${rule.version}`}
                            checked={compareVersionB === rule.version}
                            onChange={() => setCompareVersionB(rule.version)}
                            className="w-4 h-4 text-amber-600 ml-2"
                            title="选择版本B"
                          />
                        </div>
                      </td>
                    </tr>
                    
                    {isExpanded && (
                      <tr className="bg-slate-50">
                        <td colSpan={10} className="px-4 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <h4 className="font-semibold text-slate-800 mb-3">规则详情</h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between p-2 bg-white rounded">
                                  <span className="text-slate-500">型号:</span>
                                  <span className="font-medium">{rule.model}</span>
                                </div>
                                <div className="flex justify-between p-2 bg-white rounded">
                                  <span className="text-slate-500">版本:</span>
                                  <span className="font-medium">{rule.version}</span>
                                </div>
                                <div className="flex justify-between p-2 bg-white rounded">
                                  <span className="text-slate-500">计提比例:</span>
                                  <span className="font-medium text-primary-700">{(rule.reserveRate * 100).toFixed(2)}%</span>
                                </div>
                                <div className="flex justify-between p-2 bg-white rounded">
                                  <span className="text-slate-500">滚动计算周期:</span>
                                  <span className="font-medium">{rule.rollbackMonths} 个月</span>
                                </div>
                                <div className="flex justify-between p-2 bg-white rounded">
                                  <span className="text-slate-500">生效日期:</span>
                                  <span className="font-medium">{formatDate(rule.effectiveDate)}</span>
                                </div>
                                <div className="flex justify-between p-2 bg-white rounded">
                                  <span className="text-slate-500">失效日期:</span>
                                  <span className="font-medium">{formatDate(rule.expiryDate)}</span>
                                </div>
                                <div className="flex justify-between p-2 bg-white rounded">
                                  <span className="text-slate-500">创建人:</span>
                                  <span className="font-medium">{rule.createdBy}</span>
                                </div>
                                <div className="flex justify-between p-2 bg-white rounded">
                                  <span className="text-slate-500">变更原因:</span>
                                  <span className="font-medium">{rule.changeReason}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div>
                              <h4 className="font-semibold text-slate-800 mb-3">例外条款</h4>
                              {rule.exceptionClauses && rule.exceptionClauses.length > 0 ? (
                                <ul className="space-y-2">
                                  {rule.exceptionClauses.map((clause, idx) => (
                                    <li key={idx} className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                                      <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                                      <span className="text-sm text-amber-800">{clause}</span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-slate-500 text-sm">无例外条款</p>
                              )}
                              
                              <div className="mt-6 p-4 bg-primary-50 rounded-lg border border-primary-200">
                                <p className="text-sm text-primary-800">
                                  <FileText className="w-4 h-4 inline mr-2" />
                                  <span className="font-medium">证据留存:</span> 
                                  此规则版本已作为计算依据保存在所有使用该版本的准备金计算结果中，
                                  可在滚动报告中追溯查看。
                                </p>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
        
        <div className="mt-6 p-4 bg-slate-50 rounded-lg">
          <p className="text-sm text-slate-600 mb-2">
            <GitCompare className="w-4 h-4 inline mr-2" />
            选择两个版本进行对比（版本A为基准，版本B为对比对象）
          </p>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-xs text-slate-500 mb-1 block">版本 A (基准)</label>
              <select
                value={compareVersionA || ''}
                onChange={(e) => setCompareVersionA(e.target.value || null)}
                className="input-field"
              >
                <option value="">请选择</option>
                {ruleVersions.map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400 mt-5" />
            <div className="flex-1">
              <label className="text-xs text-slate-500 mb-1 block">版本 B (对比)</label>
              <select
                value={compareVersionB || ''}
                onChange={(e) => setCompareVersionB(e.target.value || null)}
                className="input-field"
              >
                <option value="">请选择</option>
                {ruleVersions.map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
      
      {differences && differences.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-serif font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-primary-600" />
            版本对比结果: {compareVersionA} → {compareVersionB}
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="table-header">
                  <th className="px-4 py-3 text-left">字段</th>
                  <th className="px-4 py-3 text-left">版本 A ({compareVersionA})</th>
                  <th className="px-4 py-3 text-center">变化</th>
                  <th className="px-4 py-3 text-left">版本 B ({compareVersionB})</th>
                </tr>
              </thead>
              <tbody>
                {differences.map((diff, idx) => (
                  <tr key={idx} className="table-row">
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {fieldLabels[diff.field] || diff.field}
                    </td>
                    <td className="px-4 py-3 bg-rose-50 text-rose-700">
                      {Array.isArray(diff.oldValue) 
                        ? diff.oldValue.join('; ')
                        : diff.field === 'reserveRate' 
                          ? `${(diff.oldValue * 100).toFixed(2)}%`
                          : diff.field.includes('Date')
                            ? formatDate(diff.oldValue)
                            : String(diff.oldValue)
                      }
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ArrowRight className="w-5 h-5 text-amber-500 mx-auto" />
                    </td>
                    <td className="px-4 py-3 bg-emerald-50 text-emerald-700">
                      {Array.isArray(diff.newValue) 
                        ? diff.newValue.join('; ')
                        : diff.field === 'reserveRate' 
                          ? `${(diff.newValue * 100).toFixed(2)}%`
                          : diff.field.includes('Date')
                            ? formatDate(diff.newValue)
                            : String(diff.newValue)
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-sm text-amber-800">
              <AlertTriangle className="w-4 h-4 inline mr-2" />
              <span className="font-medium">注意:</span> 
              规则版本变更后，使用旧版本计算的结果仍然有效并保留在历史记录中。
              新版本仅影响变更日期之后的新计算。所有版本的规则都会作为证据保存在对应的计算结果中。
            </p>
          </div>
        </div>
      )}
      
      {differences && differences.length === 0 && compareVersionA && compareVersionB && (
        <div className="card">
          <div className="text-center py-8">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-500" />
            <p className="text-lg text-slate-700">两个版本之间没有差异</p>
          </div>
        </div>
      )}
    </div>
  );
}
