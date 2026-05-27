import { useState } from 'react';
import { AlertTriangle, Database, GitBranch, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { getAnomalySummary } from '../../services/AnomalyDetector';

export default function BottomInfoBar() {
  const { records, dataSources } = useAppStore();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const anomalySummary = getAnomalySummary(records);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="bg-slate-800/90 backdrop-blur-sm border-t border-slate-700 px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button
            onClick={() => toggleSection('source')}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            <Database size={16} className="text-green-400" />
            <span>数据来源: {dataSources[0]?.name || '未加载'}</span>
            {expandedSection === 'source' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          <button
            onClick={() => toggleSection('revision')}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            <GitBranch size={16} className="text-blue-400" />
            <span>修正痕迹: {records.filter(r => r.revisions.length > 0).length} 条</span>
            {expandedSection === 'revision' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          <button
            onClick={() => toggleSection('anomaly')}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            <AlertTriangle size={16} className={anomalySummary.errorCount > 0 ? 'text-red-400' : 'text-yellow-400'} />
            <span>
              异常: {anomalySummary.totalAnomalies} 个
              {anomalySummary.errorCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-red-600 text-white text-xs rounded">
                  {anomalySummary.errorCount} 错误
                </span>
              )}
            </span>
            {expandedSection === 'anomaly' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span>样本量: <span className="text-slate-300 font-mono">{anomalySummary.totalRecords}</span></span>
          <span>迁徙总数: <span className="text-slate-300 font-mono">{records.reduce((acc, r) => acc + r.migrationCount, 0)}</span></span>
          <span>异常记录: <span className="text-slate-300 font-mono">{anomalySummary.recordsWithAnomalies}</span></span>
        </div>
      </div>

      {expandedSection === 'source' && (
        <div className="mt-3 p-3 bg-slate-900/50 rounded-lg border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-slate-300">数据来源详情</h4>
            <button onClick={() => setExpandedSection(null)} className="text-slate-500 hover:text-slate-300">
              <X size={14} />
            </button>
          </div>
          {dataSources.map((ds) => (
            <div key={ds.id} className="text-xs text-slate-400 space-y-1">
              <p><span className="text-slate-300">名称:</span> {ds.name}</p>
              <p><span className="text-slate-300">描述:</span> {ds.description}</p>
              <p><span className="text-slate-300">导入时间:</span> {new Date(ds.importTime).toLocaleString('zh-CN')}</p>
              <p><span className="text-slate-300">记录数:</span> {ds.recordCount}</p>
            </div>
          ))}
        </div>
      )}

      {expandedSection === 'anomaly' && (
        <div className="mt-3 p-3 bg-slate-900/50 rounded-lg border border-slate-700 max-h-48 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-slate-300">异常记录列表</h4>
            <button onClick={() => setExpandedSection(null)} className="text-slate-500 hover:text-slate-300">
              <X size={14} />
            </button>
          </div>
          <div className="space-y-2">
            {records.filter(r => r.anomalies.length > 0).slice(0, 10).map((record) => (
              <div key={record.id} className="text-xs p-2 bg-slate-800/50 rounded">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-slate-300">{record.customerId}</span>
                  <span className="text-slate-500">{record.fromRating} → {record.toRating}</span>
                </div>
                <div className="mt-1 space-y-0.5">
                  {record.anomalies.map((a) => (
                    <p key={a.id} className={a.severity === 'error' ? 'text-red-400' : 'text-yellow-400'}>
                      • {a.description}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {expandedSection === 'revision' && (
        <div className="mt-3 p-3 bg-slate-900/50 rounded-lg border border-slate-700 max-h-48 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-slate-300">修正痕迹</h4>
            <button onClick={() => setExpandedSection(null)} className="text-slate-500 hover:text-slate-300">
              <X size={14} />
            </button>
          </div>
          <div className="space-y-2">
            {records.filter(r => r.revisions.length > 0).flatMap(r =>
              r.revisions.map((rev) => (
                <div key={rev.id} className="text-xs p-2 bg-slate-800/50 rounded">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-400">{rev.operator}</span>
                    <span className="text-slate-500">|</span>
                    <span className="text-slate-400">{new Date(rev.timestamp).toLocaleString('zh-CN')}</span>
                  </div>
                  <p className="mt-1 text-slate-300">{rev.reason}</p>
                  <p className="text-slate-500">{rev.field}: {rev.oldValue} → {rev.newValue}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
