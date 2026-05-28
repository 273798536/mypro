import { useState } from 'react';
import { History, Plus, Edit2, Trash2, Download, Filter, ChevronDown, ChevronUp, Clock, User } from 'lucide-react';
import { useRevisionStore } from '@/store/revisionStore';
import type { RevisionEntry } from '@/types';
import { cn } from '@/lib/utils';

export function RevisionTimeline() {
  const { entries, clearHistory } = useRevisionStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'vectorField' | 'path' | 'integrationConfig'>('all');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const filteredEntries = filter === 'all'
    ? entries
    : entries.filter((e) => e.targetType === filter);

  const getActionIcon = (action: RevisionEntry['action']) => {
    switch (action) {
      case 'create': return <Plus className="w-4 h-4" />;
      case 'update': return <Edit2 className="w-4 h-4" />;
      case 'delete': return <Trash2 className="w-4 h-4" />;
      case 'import': return <Download className="w-4 h-4" />;
    }
  };

  const getActionLabel = (action: RevisionEntry['action']) => {
    switch (action) {
      case 'create': return '创建';
      case 'update': return '更新';
      case 'delete': return '删除';
      case 'import': return '导入';
    }
  };

  const getActionColor = (action: RevisionEntry['action']) => {
    switch (action) {
      case 'create': return 'text-green-600 bg-green-100';
      case 'update': return 'text-blue-600 bg-blue-100';
      case 'delete': return 'text-red-600 bg-red-100';
      case 'import': return 'text-amber-600 bg-amber-100';
    }
  };

  const getTargetTypeLabel = (type: RevisionEntry['targetType']) => {
    switch (type) {
      case 'vectorField': return '向量场';
      case 'path': return '路径';
      case 'integrationConfig': return '积分配置';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins} 分钟前`;
    if (diffHours < 24) return `${diffHours} 小时前`;
    if (diffDays < 7) return `${diffDays} 天前`;
    return date.toLocaleDateString('zh-CN');
  };

  const formatFullTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return '无';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (typeof value === 'object') {
      if ('name' in value) {
        return (value as { name: string }).name;
      }
      return JSON.stringify(value).slice(0, 50) + (JSON.stringify(value).length > 50 ? '...' : '');
    }
    return String(value);
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleClearHistory = () => {
    clearHistory();
    setShowClearConfirm(false);
  };

  if (entries.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 flex items-center gap-2">
          <History className="w-4 h-4 text-slate-600" />
          <span className="font-medium text-slate-800">修订历史</span>
        </div>
        <div className="p-8 text-center text-slate-500 text-sm">
          <History className="w-10 h-10 mx-auto mb-2 text-slate-300" />
          暂无修订记录
          <p className="text-xs text-slate-400 mt-1">所有数据修改操作将在此处记录</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-slate-600" />
          <span className="font-medium text-slate-800">修订历史</span>
          <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-xs rounded-full">
            {entries.length} 条记录
          </span>
        </div>
        <button
          onClick={() => setShowClearConfirm(true)}
          className="text-xs text-slate-500 hover:text-red-500 transition-colors"
        >
          清空历史
        </button>
      </div>

      <div className="px-4 py-2 border-b border-slate-100 flex items-center gap-2">
        <Filter className="w-3.5 h-3.5 text-slate-400" />
        <div className="flex gap-1">
          {(['all', 'vectorField', 'path', 'integrationConfig'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-2 py-0.5 text-xs rounded transition-colors',
                filter === f
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-slate-500 hover:bg-slate-100'
              )}
            >
              {f === 'all' ? '全部' : getTargetTypeLabel(f)}
            </button>
          ))}
        </div>
      </div>

      <div className="max-h-80 overflow-y-auto">
        {filteredEntries.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            暂无匹配的修订记录
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-6 top-0 bottom-0 w-px bg-slate-200" />
            <div className="divide-y divide-slate-50">
              {filteredEntries.map((entry) => (
                <div key={entry.id} className="relative pl-14 pr-4 py-3">
                  <div className={cn(
                    'absolute left-4 w-5 h-5 rounded-full flex items-center justify-center',
                    getActionColor(entry.action)
                  )}>
                    {getActionIcon(entry.action)}
                  </div>

                  <button
                    onClick={() => toggleExpand(entry.id)}
                    className="w-full text-left"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn(
                            'text-xs px-1.5 py-0.5 rounded font-medium',
                            getActionColor(entry.action)
                          )}>
                            {getActionLabel(entry.action)}
                          </span>
                          <span className="text-xs text-slate-500">
                            {getTargetTypeLabel(entry.targetType)}
                          </span>
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTime(entry.timestamp)}
                          </span>
                        </div>
                        <div className="text-sm text-slate-700 mt-1 font-medium">
                          {entry.correctionNote || '无备注'}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                          <User className="w-3 h-3" />
                          来源: {entry.source}
                        </div>
                      </div>
                      {expandedId === entry.id ? (
                        <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      )}
                    </div>
                  </button>

                  {expandedId === entry.id && (
                    <div className="mt-3 p-3 bg-slate-50 rounded-lg text-xs space-y-2">
                      <div>
                        <span className="text-slate-500">目标ID: </span>
                        <span className="font-mono text-slate-700">{entry.targetId}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">时间: </span>
                        <span className="text-slate-700">{formatFullTime(entry.timestamp)}</span>
                      </div>
                      {(entry.action === 'update' || entry.action === 'import') && (
                        <>
                          <div>
                            <span className="text-slate-500">修改前: </span>
                            <span className="text-red-600">{formatValue(entry.previousValue)}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">修改后: </span>
                            <span className="text-green-600">{formatValue(entry.newValue)}</span>
                          </div>
                        </>
                      )}
                      {entry.action === 'create' && (
                        <div>
                          <span className="text-slate-500">创建内容: </span>
                          <span className="text-green-600">{formatValue(entry.newValue)}</span>
                        </div>
                      )}
                      {entry.action === 'delete' && (
                        <div>
                          <span className="text-slate-500">删除内容: </span>
                          <span className="text-red-600">{formatValue(entry.previousValue)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
        提示: 修订历史保存在本地，清除浏览器数据会丢失记录
      </div>

      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">确认清空</h3>
            <p className="text-sm text-slate-600 mb-6">
              确定要清空所有修订历史吗？此操作不可撤销。
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleClearHistory}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
              >
                确认清空
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
