import { useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Database,
  Clock,
  Search,
  FileText,
  AlertCircle,
  Zap,
  Table,
  Lightbulb
} from 'lucide-react';
import type { SlowQuery, IndexFailureType } from '../types';

interface IndexFailureListProps {
  queries: SlowQuery[];
}

const typeConfig: Record<IndexFailureType, { label: string; color: string; icon: typeof AlertCircle }> = {
  full_table_scan: { label: '全表扫描', color: 'bg-red-100 text-red-700 border-red-200', icon: Database },
  index_ignored: { label: '索引被忽略', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: AlertCircle },
  filesort: { label: '文件排序', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: Clock },
  temporary_table: { label: '临时表', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: Table }
};

export default function IndexFailureList({ queries }: IndexFailureListProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(queries.map(q => q.id)));
  const [filterType, setFilterType] = useState<IndexFailureType | 'all'>('all');

  const toggleExpand = (id: string) => {
    const next = new Set(expandedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedIds(next);
  };

  const filteredQueries = filterType === 'all'
    ? queries
    : queries.filter(q => q.indexFailure.type === filterType);

  const typeStats = queries.reduce((acc, q) => {
    acc[q.indexFailure.type] = (acc[q.indexFailure.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            索引失效专项拦截
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            以下 <span className="font-semibold text-red-600">{queries.length}</span> 条查询因索引失效被从汇总中单独拦截展示，
            每条均附详细原因分析和业务影响说明
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
              filterType === 'all'
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            全部 ({queries.length})
          </button>
          {(Object.keys(typeConfig) as IndexFailureType[]).map(type => {
            const config = typeConfig[type];
            return (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                  filterType === type
                    ? `${config.color} border-current`
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {config.label} ({typeStats[type] || 0})
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        {filteredQueries.map((q, idx) => {
          const config = typeConfig[q.indexFailure.type];
          const TypeIcon = config.icon;
          const isExpanded = expandedIds.has(q.id);
          const ratio = (q.rowsExamined / Math.max(q.rowsSent, 1)).toFixed(1);

          return (
            <div
              key={q.id}
              className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-sm transition-shadow"
            >
              <div
                className="flex items-center justify-between p-4 bg-gradient-to-r from-red-50 to-white cursor-pointer"
                onClick={() => toggleExpand(q.id)}
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                    <span className="text-sm font-bold text-red-600">{idx + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="text-xs font-mono text-gray-500">{q.id}</code>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${config.color}`}>
                        <TypeIcon className="w-3 h-3" />
                        {config.label}
                      </span>
                      <span className="text-xs text-gray-500">{q.timestamp}</span>
                    </div>
                    <p className="mt-1 text-sm font-medium text-gray-900">
                      {q.indexFailure.reason}
                    </p>
                    <p className="mt-1 text-xs text-gray-500 font-mono truncate">
                      表: {q.tableName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 ml-4 flex-shrink-0">
                  <div className="text-right">
                    <div className="text-lg font-bold text-red-600">{q.queryTime.toFixed(1)}s</div>
                    <div className="text-xs text-gray-500">耗时</div>
                  </div>
                  <div className="text-right hidden sm:block">
                    <div className="text-sm font-semibold text-amber-600">{ratio}:1</div>
                    <div className="text-xs text-gray-500">扫描/返回</div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="p-4 border-t border-gray-100 space-y-4">
                  <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                    <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                      <Search className="w-3.5 h-3.5" />
                      <span>SQL 语句</span>
                    </div>
                    <code className="text-sm text-green-400 font-mono whitespace-pre-wrap break-all">
                      {q.sql}
                    </code>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                        <Clock className="w-3.5 h-3.5" />
                        <span>性能指标</span>
                      </div>
                      <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">查询时间</span>
                          <span className="font-mono font-semibold text-red-600">{q.queryTime.toFixed(1)} 秒</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">扫描行数</span>
                          <span className="font-mono">{q.rowsExamined.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">返回行数</span>
                          <span className="font-mono">{q.rowsSent.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">使用索引</span>
                          <span className={`font-mono ${q.indexUsed ? 'text-green-600' : 'text-red-500'}`}>
                            {q.indexUsed || '无'}
                          </span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-gray-200">
                          <span className="text-gray-500">效率比</span>
                          <span className={`font-mono font-semibold ${parseFloat(ratio) > 100 ? 'text-red-600' : parseFloat(ratio) > 10 ? 'text-amber-600' : 'text-green-600'}`}>
                            {ratio}:1
                            <span className="text-xs text-gray-400 ml-1">(正常&lt;10:1)</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-amber-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-xs text-amber-700 mb-2">
                        <Lightbulb className="w-3.5 h-3.5" />
                        <span>失效原因分析</span>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {q.indexFailure.explanation}
                      </p>
                    </div>

                    <div className="bg-red-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-xs text-red-700 mb-2">
                        <Zap className="w-3.5 h-3.5" />
                        <span>业务影响</span>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {q.indexFailure.businessImpact}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                    <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">为什么这条查询被单独拦下来？</p>
                      <p className="text-xs text-blue-700 mt-1">
                        {parseFloat(ratio) > 100
                          ? `扫描行数是返回行数的 ${ratio} 倍，严重浪费数据库资源。如果不修复，在业务高峰期可能导致数据库 CPU 100%，影响整个仓储系统的可用性。`
                          : `查询耗时 ${q.queryTime.toFixed(1)} 秒，超过正常阈值的 ${(q.queryTime / 1).toFixed(0)} 倍。`
                        }
                        这类查询如果混在普通汇总中容易被忽略，因此被专项拦截展示，便于仓储工程师和业务同事识别风险。
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredQueries.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>该类型下暂无索引失效查询</p>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-100">
        <h4 className="text-sm font-medium text-gray-700 mb-2">索引失效类型说明</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {(Object.entries(typeConfig) as [IndexFailureType, typeof typeConfig[IndexFailureType]][]).map(([type, config]) => {
            const Icon = config.icon;
            return (
              <div key={type} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <div className={`p-1 rounded ${config.color}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-sm font-medium text-gray-900">{config.label}</span>
                </div>
                <p className="text-xs text-gray-500">
                  {type === 'full_table_scan' && '未使用任何索引，逐行扫描整张表'}
                  {type === 'index_ignored' && '索引存在但被优化器忽略，常见于函数、类型转换'}
                  {type === 'filesort' && '排序字段不在索引中，需额外文件排序'}
                  {type === 'temporary_table' && 'GROUP BY/ORDER BY 不同列，创建临时表'}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
