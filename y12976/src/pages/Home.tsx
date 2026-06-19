import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  FileText,
  AlertTriangle,
  ShieldCheck,
  Info,
  Search,
  Filter,
  X,
  Database,
  Clock,
  User,
} from 'lucide-react';
import { useApprovalStore } from '@/store/approvalStore';
import {
  ANOMALY_TYPE_LABELS,
  SEVERITY_LABELS,
  STATUS_LABELS,
} from '@/types';
import type { AnomalyType, Severity, ScriptStatus } from '@/types';
import { cn } from '@/lib/utils';

const severityColors: Record<Severity, string> = {
  critical: 'bg-red-500',
  warning: 'bg-amber-500',
  info: 'bg-sky-500',
};

const severityBgColors: Record<Severity, string> = {
  critical: 'bg-red-50 border-red-200 text-red-700',
  warning: 'bg-amber-50 border-amber-200 text-amber-700',
  info: 'bg-sky-50 border-sky-200 text-sky-700',
};

const statusColors: Record<ScriptStatus, string> = {
  pending: 'bg-stone-100 text-stone-700',
  confirmed: 'bg-emerald-50 text-emerald-700',
  supplemented: 'bg-amber-50 text-amber-700',
  rerun: 'bg-sky-50 text-sky-700',
  manual_review: 'bg-purple-50 text-purple-700',
};

const anomalyTypeColors: Record<AnomalyType, string> = {
  pagination_unstable: 'bg-orange-100 text-orange-700',
  backup_gap: 'bg-red-100 text-red-700',
  schema_drift: 'bg-purple-100 text-purple-700',
  slow_query_risk: 'bg-amber-100 text-amber-700',
  breaking_change: 'bg-rose-100 text-rose-700',
};

export default function Home() {
  const navigate = useNavigate();
  const {
    filters,
    setFilters,
    resetFilters,
    getFilteredScripts,
    getStatistics,
    importScripts,
  } = useApprovalStore();

  const [showImport, setShowImport] = useState(false);
  const [importContent, setImportContent] = useState('');
  const [importFileName, setImportFileName] = useState('');
  const [importSource, setImportSource] = useState('');
  const [importBatchName, setImportBatchName] = useState('');

  const scripts = getFilteredScripts();
  const stats = getStatistics();

  const handleImport = () => {
    if (!importContent.trim() || !importFileName.trim()) return;

    importScripts(
      importBatchName || `${new Date().toISOString().slice(0, 10)} 导入批次`,
      '手工导入',
      [
        {
          fileName: importFileName.endsWith('.sql')
            ? importFileName
            : `${importFileName}.sql`,
          sqlContent: importContent,
          sourceMaterial: importSource || '未指定来源材料',
        },
      ]
    );

    setShowImport(false);
    setImportContent('');
    setImportFileName('');
    setImportSource('');
    setImportBatchName('');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      setImportFileName(file.name);
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImportContent(ev.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-terracotta-600 rounded-lg">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-stone-900">数据库变更审批台</h1>
              <p className="text-xs text-stone-500">Database Migration Approval Platform</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-stone-500">
            <User className="w-4 h-4" />
            <span>BI 分析师视图</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
          {!showImport ? (
            <div
              className="p-8 cursor-pointer hover:bg-stone-50 transition-colors"
              onClick={() => setShowImport(true)}
            >
              <div className="flex flex-col items-center gap-3 text-stone-500">
                <div className="w-12 h-12 border-2 border-dashed border-stone-300 rounded-full flex items-center justify-center">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-stone-700">点击或拖拽导入迁移脚本</p>
                  <p className="text-sm">支持 SQL 文件粘贴或拖入，自动检测异常</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-stone-900">导入迁移脚本</h3>
                <button
                  onClick={() => setShowImport(false)}
                  className="p-1 hover:bg-stone-100 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-stone-600 mb-1">批次名称</label>
                  <input
                    type="text"
                    value={importBatchName}
                    onChange={(e) => setImportBatchName(e.target.value)}
                    placeholder="可选，如：2026-06-18 常规变更"
                    className="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-terracotta-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-stone-600 mb-1">来源材料</label>
                  <input
                    type="text"
                    value={importSource}
                    onChange={(e) => setImportSource(e.target.value)}
                    placeholder="如：2026-Q2 订单域扩展需求.docx"
                    className="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-terracotta-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-stone-600 mb-1">文件名</label>
                <input
                  type="text"
                  value={importFileName}
                  onChange={(e) => setImportFileName(e.target.value)}
                  placeholder="如：20260618_ods_order_detail_add_columns.sql"
                  className="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-terracotta-500"
                />
              </div>
              <div
                className="border-2 border-dashed border-stone-300 rounded-lg p-4"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <label className="block text-sm text-stone-600 mb-2">SQL 内容（可拖拽文件到此处）</label>
                <textarea
                  value={importContent}
                  onChange={(e) => setImportContent(e.target.value)}
                  placeholder="粘贴 SQL 迁移脚本内容..."
                  rows={10}
                  className="w-full px-3 py-2 border border-stone-200 rounded text-sm font-mono focus:outline-none focus:border-terracotta-500 bg-stone-50"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowImport(false)}
                  className="px-4 py-2 text-sm border border-stone-300 rounded hover:bg-stone-50"
                >
                  取消
                </button>
                <button
                  onClick={handleImport}
                  disabled={!importContent.trim() || !importFileName.trim()}
                  className="px-4 py-2 text-sm bg-terracotta-600 text-white rounded hover:bg-terracotta-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  导入并检测
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white border border-stone-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-stone-500 text-sm mb-2">
              <FileText className="w-4 h-4" />
              <span>脚本总数</span>
            </div>
            <div className="text-2xl font-semibold text-stone-900 font-mono tabular-nums">
              {stats.totalScripts}
            </div>
          </div>
          <div className="bg-white border border-stone-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-600 text-sm mb-2">
              <AlertTriangle className="w-4 h-4" />
              <span>严重异常</span>
            </div>
            <div className="text-2xl font-semibold text-red-600 font-mono tabular-nums">
              {stats.criticalCount}
            </div>
          </div>
          <div className="bg-white border border-stone-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-amber-600 text-sm mb-2">
              <AlertTriangle className="w-4 h-4" />
              <span>警告</span>
            </div>
            <div className="text-2xl font-semibold text-amber-600 font-mono tabular-nums">
              {stats.warningCount}
            </div>
          </div>
          <div className="bg-white border border-stone-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-emerald-600 text-sm mb-2">
              <ShieldCheck className="w-4 h-4" />
              <span>信息</span>
            </div>
            <div className="text-2xl font-semibold text-emerald-600 font-mono tabular-nums">
              {stats.infoCount}
            </div>
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-lg p-4">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(ANOMALY_TYPE_LABELS) as AnomalyType[]).map((type) => (
              <span
                key={type}
                className={cn(
                  'px-2 py-1 rounded text-xs font-medium',
                  anomalyTypeColors[type]
                )}
              >
                {ANOMALY_TYPE_LABELS[type]}: {stats.anomalyCounts[type]}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-stone-500" />
            <span className="text-sm font-medium text-stone-700">筛选条件</span>
          </div>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col">
              <label className="text-xs text-stone-500 mb-1">异常类型</label>
              <select
                value={filters.anomalyType}
                onChange={(e) =>
                  setFilters({ anomalyType: e.target.value as AnomalyType | 'all' })
                }
                className="px-3 py-1.5 border border-stone-300 rounded text-sm focus:outline-none focus:border-terracotta-500 bg-white"
              >
                <option value="all">全部类型</option>
                {(Object.keys(ANOMALY_TYPE_LABELS) as AnomalyType[]).map((type) => (
                  <option key={type} value={type}>
                    {ANOMALY_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-stone-500 mb-1">严重度</label>
              <select
                value={filters.severity}
                onChange={(e) =>
                  setFilters({ severity: e.target.value as Severity | 'all' })
                }
                className="px-3 py-1.5 border border-stone-300 rounded text-sm focus:outline-none focus:border-terracotta-500 bg-white"
              >
                <option value="all">全部严重度</option>
                {(Object.keys(SEVERITY_LABELS) as Severity[]).map((sev) => (
                  <option key={sev} value={sev}>
                    {SEVERITY_LABELS[sev]}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-stone-500 mb-1">状态</label>
              <select
                value={filters.status}
                onChange={(e) =>
                  setFilters({ status: e.target.value as ScriptStatus | 'all' })
                }
                className="px-3 py-1.5 border border-stone-300 rounded text-sm focus:outline-none focus:border-terracotta-500 bg-white"
              >
                <option value="all">全部状态</option>
                {(Object.keys(STATUS_LABELS) as ScriptStatus[]).map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col flex-1 min-w-[200px]">
              <label className="text-xs text-stone-500 mb-1">来源材料</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  value={filters.sourceMaterial}
                  onChange={(e) => setFilters({ sourceMaterial: e.target.value })}
                  placeholder="搜索来源材料名称..."
                  className="w-full pl-8 pr-3 py-1.5 border border-stone-300 rounded text-sm focus:outline-none focus:border-terracotta-500"
                />
              </div>
            </div>
            <button
              onClick={resetFilters}
              className="px-3 py-1.5 text-sm text-stone-500 hover:text-stone-700 hover:bg-stone-100 rounded"
            >
              重置
            </button>
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-stone-200 flex items-center justify-between">
            <h2 className="font-medium text-stone-900">脚本列表</h2>
            <span className="text-sm text-stone-500">
              共 {scripts.length} 条记录
            </span>
          </div>
          <div className="divide-y divide-stone-100">
            {scripts.length === 0 ? (
              <div className="p-8 text-center text-stone-500">
                <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>暂无符合筛选条件的脚本</p>
              </div>
            ) : (
              scripts.map((script) => {
                const maxSeverity = script.anomalies.reduce<Severity | null>(
                  (max, a) => {
                    if (max === 'critical' || a.severity === 'critical') return 'critical';
                    if (max === 'warning' || a.severity === 'warning') return 'warning';
                    if (max === 'info' || a.severity === 'info') return 'info';
                    return max;
                  },
                  null
                );

                return (
                  <div
                    key={script.id}
                    className="flex items-stretch hover:bg-stone-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/detail/${script.id}`)}
                  >
                    <div
                      className={cn(
                        'w-1 flex-shrink-0',
                        maxSeverity ? severityColors[maxSeverity] : 'bg-emerald-500'
                      )}
                    />
                    <div className="flex-1 px-4 py-3 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-medium text-stone-900 font-mono text-sm truncate">
                          {script.fileName}
                        </span>
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded text-xs font-medium',
                            statusColors[script.status]
                          )}
                        >
                          {STATUS_LABELS[script.status]}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-stone-500">
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          来源: {script.sourceMaterial}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          异常: {script.anomalies.length} 个
                        </span>
                        {script.conclusions.length > 1 && (
                          <span className="text-purple-600">
                            结论版本: v{script.conclusions[script.conclusions.length - 1].version}
                          </span>
                        )}
                      </div>
                      {script.anomalies.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {script.anomalies.map((anomaly) => (
                            <span
                              key={anomaly.id}
                              className={cn(
                                'px-2 py-0.5 rounded text-xs font-medium',
                                severityBgColors[anomaly.severity],
                                'border'
                              )}
                            >
                              {ANOMALY_TYPE_LABELS[anomaly.type]}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="px-4 py-3 flex items-center text-stone-400">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
