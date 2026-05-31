import { useState, useEffect } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  Save, 
  RotateCcw, 
  AlertTriangle,
  CheckCircle2,
  ArrowLeftRight,
  FileText,
  Calculator
} from 'lucide-react';
import { useValuationStore } from '@/store/valuationStore';
import { allValuationMethods, dataSourceLabels } from '@/data/mockData';
import { formatCurrency, formatPercent, formatDateTime } from '@/utils/format';
import type { Valuation } from '@/types';

const fieldLabels: Record<string, string> = {
  valuationAmount: '估值金额',
  valuationMethod: '估值方法',
  sharePrice: '每股价格',
  dataSource: '数据来源',
  version: '版本',
};

interface EditableField {
  key: keyof Valuation;
  label: string;
  type: 'text' | 'number' | 'select';
  options?: string[];
}

const editableFields: EditableField[] = [
  { key: 'valuationMethod', label: '估值方法', type: 'select', options: allValuationMethods },
  { key: 'valuationAmount', label: '估值金额', type: 'number' },
  { key: 'sharePrice', label: '每股价格', type: 'number' },
  { key: 'shareNumber', label: '股份数量', type: 'number' },
];

export default function ComparePage() {
  const { 
    valuations, 
    selectedValuationId, 
    selectValuation, 
    getValuationById, 
    updateValuation,
    getConflictsByValuation,
    getLogsByValuation
  } = useValuationStore();
  
  const [selectedId, setSelectedId] = useState<string | null>(selectedValuationId || valuations[0]?.valuationId || null);
  const [modifiedValues, setModifiedValues] = useState<Partial<Valuation>>({});
  const [editReason, setEditReason] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    conflicts: true,
    history: false,
  });

  const originalValuation = selectedId ? getValuationById(selectedId) : null;
  const conflicts = selectedId ? getConflictsByValuation(selectedId) : [];
  const logs = selectedId ? getLogsByValuation(selectedId) : [];

  useEffect(() => {
    if (selectedValuationId) {
      setSelectedId(selectedValuationId);
    }
  }, [selectedValuationId]);

  useEffect(() => {
    setModifiedValues({});
    setEditReason('');
  }, [selectedId]);

  const handleFieldChange = (key: keyof Valuation, value: string | number) => {
    setModifiedValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleReset = () => {
    setModifiedValues({});
    setEditReason('');
  };

  const handleSave = () => {
    if (!selectedId || Object.keys(modifiedValues).length === 0 || !editReason.trim()) return;
    
    updateValuation(selectedId, modifiedValues, editReason, '当前用户');
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      setModifiedValues({});
      setEditReason('');
    }, 2000);
  };

  const calculateDifference = (key: keyof Valuation) => {
    if (!originalValuation || modifiedValues[key] === undefined) return null;
    const original = originalValuation[key];
    const modified = modifiedValues[key];
    if (typeof original === 'number' && typeof modified === 'number') {
      return {
        diff: modified - original,
        diffPercent: original !== 0 ? ((modified - original) / original) * 100 : 0,
      };
    }
    return null;
  };

  const hasChanges = Object.keys(modifiedValues).length > 0;

  const toggleSection = (section: 'conflicts' | 'history') => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">修正对比室</h1>
          <p className="text-slate-500 mt-1">人工修正财务报表，新旧结果并排对比</p>
        </div>
        {showSuccess && (
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg animate-pulse">
            <CheckCircle2 className="w-5 h-5" />
            保存成功，变更已记录
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
        <label className="block text-sm font-medium text-slate-700 mb-2">选择估值记录</label>
        <select
          value={selectedId || ''}
          onChange={(e) => setSelectedId(e.target.value || null)}
          className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="">请选择...</option>
          {valuations.map((v) => (
            <option key={v.valuationId} value={v.valuationId}>
              {v.projectName} - {v.valuationDate} - {dataSourceLabels[v.dataSource]}
            </option>
          ))}
        </select>
      </div>

      {originalValuation && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-5 py-4 bg-slate-50 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-slate-500" />
                  <h3 className="font-semibold text-slate-800">原始值</h3>
                </div>
              </div>
              <div className="p-5 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">项目名称</label>
                    <p className="font-medium text-slate-800">{originalValuation.projectName}</p>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">所属基金</label>
                    <p className="font-medium text-slate-800">{originalValuation.fundName}</p>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">估值日期</label>
                    <p className="font-medium text-slate-800">{originalValuation.valuationDate}</p>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">数据来源</label>
                    <p className="font-medium text-slate-800">{dataSourceLabels[originalValuation.dataSource]}</p>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-5 space-y-4">
                  {editableFields.map((field) => (
                    <div key={field.key}>
                      <label className="block text-sm font-medium text-slate-700 mb-2">{field.label}</label>
                      <div className={`px-4 py-3 rounded-lg ${
                        modifiedValues[field.key] !== undefined
                          ? 'bg-red-50 border border-red-200'
                          : 'bg-slate-50'
                      }`}>
                        <span className={`text-lg font-semibold ${
                          modifiedValues[field.key] !== undefined
                            ? 'text-red-600 line-through'
                            : 'text-slate-800'
                        }`}>
                          {field.key === 'valuationAmount'
                            ? formatCurrency(originalValuation[field.key] as number)
                            : originalValuation[field.key]}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border-2 border-primary-200 overflow-hidden">
              <div className="px-5 py-4 bg-primary-50 border-b border-primary-200">
                <div className="flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-primary-600" />
                  <h3 className="font-semibold text-primary-800">修正后</h3>
                  {hasChanges && (
                    <span className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs font-medium rounded-full">
                      已修改
                    </span>
                  )}
                </div>
              </div>
              <div className="p-5 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">项目名称</label>
                    <p className="font-medium text-slate-800">{originalValuation.projectName}</p>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">版本</label>
                    <p className="font-medium text-primary-600">
                      {hasChanges ? '待保存' : originalValuation.version}
                    </p>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-5 space-y-4">
                  {editableFields.map((field) => {
                    const diff = calculateDifference(field.key);
                    const isModified = modifiedValues[field.key] !== undefined;
                    
                    return (
                      <div key={field.key}>
                        <label className="block text-sm font-medium text-slate-700 mb-2">{field.label}</label>
                        {field.type === 'select' ? (
                          <select
                            value={(modifiedValues[field.key] as string) || (originalValuation[field.key] as string)}
                            onChange={(e) => handleFieldChange(field.key, e.target.value)}
                            className={`w-full px-4 py-3 rounded-lg border text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                              isModified
                                ? 'border-primary-500 bg-primary-50 text-primary-700'
                                : 'border-slate-200 bg-slate-50 text-slate-800'
                            }`}
                          >
                            {field.options?.map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={field.type}
                            value={(modifiedValues[field.key] as number) ?? (originalValuation[field.key] as number) ?? ''}
                            onChange={(e) => handleFieldChange(field.key, Number(e.target.value))}
                            className={`w-full px-4 py-3 rounded-lg border text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                              isModified
                                ? 'border-primary-500 bg-primary-50 text-primary-700'
                                : 'border-slate-200 bg-slate-50 text-slate-800'
                            }`}
                          />
                        )}
                        {diff && (
                          <div className={`mt-2 flex items-center gap-2 text-sm ${
                            diff.diff >= 0 ? 'text-emerald-600' : 'text-red-600'
                          }`}>
                            <ArrowLeftRight className="w-4 h-4" />
                            <span>
                              {diff.diff >= 0 ? '+' : ''}{field.key === 'valuationAmount' ? formatCurrency(diff.diff) : diff.diff.toFixed(2)}
                              ({formatPercent(diff.diffPercent)})
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-slate-100 pt-5">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    修改原因 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    placeholder="请详细说明修改原因和依据..."
                    rows={3}
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleReset}
                    disabled={!hasChanges}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RotateCcw className="w-4 h-4" />
                    重置
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!hasChanges || !editReason.trim()}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="w-4 h-4" />
                    保存修改
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <button
                onClick={() => toggleSection('conflicts')}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className={`w-5 h-5 ${conflicts.length > 0 ? 'text-amber-500' : 'text-slate-400'}`} />
                  <span className="font-semibold text-slate-800">关联冲突</span>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    conflicts.length > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {conflicts.length} 项
                  </span>
                </div>
                {expandedSections.conflicts ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </button>
              {expandedSections.conflicts && conflicts.length > 0 && (
                <div className="px-5 pb-5 space-y-3">
                  {conflicts.map((conflict) => (
                    <div
                      key={conflict.conflictId}
                      className={`p-4 rounded-lg border ${
                        conflict.resolved
                          ? 'bg-emerald-50 border-emerald-200'
                          : 'bg-amber-50 border-amber-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                          conflict.resolved
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {conflict.resolved ? '已解决' : '待处理'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700">{conflict.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <button
                onClick={() => toggleSection('history')}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-slate-400" />
                  <span className="font-semibold text-slate-800">修改历史</span>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full">
                    {logs.length} 条
                  </span>
                </div>
                {expandedSections.history ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </button>
              {expandedSections.history && logs.length > 0 && (
                <div className="px-5 pb-5 space-y-3">
                  {logs.map((log) => (
                    <div key={log.logId} className="p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-700">{log.modifiedBy}</span>
                        <span className="text-xs text-slate-500">{formatDateTime(log.modifiedAt)}</span>
                      </div>
                      <p className="text-sm text-slate-600">
                        <span className="font-medium">{fieldLabels[log.fieldName] || log.fieldName}：</span>
                        {log.oldValue} → <span className="text-primary-600 font-medium">{String(log.newValue)}</span>
                      </p>
                      <p className="text-xs text-slate-500 mt-1">原因：{log.reason}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
