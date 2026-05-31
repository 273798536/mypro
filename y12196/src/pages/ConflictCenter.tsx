import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { GitMerge, ArrowRight, Check, X, Edit3, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useStore } from '../store';
import { sourceLabels } from '../data/mockData';
import type { ConflictStatus } from '../types';

type FilterType = 'all' | 'pending' | 'resolved';

function formatValue(value: unknown): string {
  if (value === undefined || value === null) return '-';
  if (value instanceof Date) return format(value, 'yyyy-MM-dd HH:mm', { locale: zhCN });
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function getFieldLabel(fieldName: string): string {
  const labels: Record<string, string> = {
    status: '状态',
    boxNumber: '箱号',
    description: '描述',
    weight: '重量',
    volume: '体积',
    name: '城市名称',
    performanceDate: '演出日期',
    venue: '演出场地',
    arrivalDate: '到达日期',
    signatureDate: '签收日期',
    receivedBy: '签收人',
  };
  return labels[fieldName] || fieldName;
}

function getStatusLabel(status: ConflictStatus): string {
  const labels: Record<ConflictStatus, string> = {
    pending: '待处理',
    'resolved-material': '已采用物资管理员版本',
    'resolved-city': '已采用场次协调版本',
    'resolved-custom': '已自定义合并',
  };
  return labels[status];
}

export function ConflictCenter() {
  const conflicts = useStore((s) => s.conflicts);
  const resolveConflict = useStore((s) => s.resolveConflict);

  const [filter, setFilter] = useState<FilterType>('all');
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [mergingId, setMergingId] = useState<string | null>(null);

  const pendingCount = useMemo(
    () => conflicts.filter((c) => c.status === 'pending').length,
    [conflicts],
  );

  const filteredConflicts = useMemo(() => {
    switch (filter) {
      case 'pending':
        return conflicts.filter((c) => c.status === 'pending');
      case 'resolved':
        return conflicts.filter((c) => c.status !== 'pending');
      default:
        return conflicts;
    }
  }, [conflicts, filter]);

  const handleResolve = (conflictId: string, resolution: 'material' | 'city' | 'custom', customValue?: string) => {
    resolveConflict(conflictId, resolution, customValue);
    setMergingId(null);
    setCustomValues((prev) => {
      const next = { ...prev };
      delete next[conflictId];
      return next;
    });
  };

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'pending', label: '待处理' },
    { key: 'resolved', label: '已解决' },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <GitMerge size={28} className="text-primary-800" />
        <h1 className="text-2xl font-semibold text-primary-800">冲突中心</h1>
        {pendingCount > 0 && (
          <span className="px-2.5 py-0.5 bg-red-500 text-white text-sm font-medium rounded-full">
            {pendingCount}
          </span>
        )}
      </div>

      <div className="flex gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f.key
                ? 'bg-primary-800 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filteredConflicts.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <AlertCircle size={48} className="mx-auto mb-3 text-gray-300" />
          <p>暂无冲突记录</p>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredConflicts.map((conflict) => {
            const resolved = conflict.status !== 'pending';
            const valuesDiffer =
              formatValue(conflict.materialVersion.value) !== formatValue(conflict.cityVersion.value);
            const entityPath =
              conflict.entityType === 'box'
                ? `/boxes/${conflict.entityId}`
                : `/cities/${conflict.entityId}`;
            const isMerging = mergingId === conflict.id;

            return (
              <div
                key={conflict.id}
                className={`bg-white rounded-lg shadow-card overflow-hidden animate-fade-in ${
                  resolved ? 'opacity-80' : ''
                }`}
              >
                <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${
                        resolved ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {getStatusLabel(conflict.status)}
                    </span>
                    <span className="text-sm font-medium text-primary-700">
                      {conflict.entityType === 'box' ? '物资' : '城市'} · {getFieldLabel(conflict.fieldName)}
                    </span>
                  </div>
                  <Link
                    to={entityPath}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    查看实体
                    <ArrowRight size={12} />
                  </Link>
                </div>

                <div className="grid grid-cols-[1fr_auto_1fr]">
                  <div className="p-4 bg-blue-50/50">
                    <div className="text-xs font-semibold text-blue-700 mb-2">物资管理员版本</div>
                    <div className="mb-2">
                      <span
                        className={`text-lg font-bold ${
                          valuesDiffer && !resolved
                            ? 'bg-red-100 text-red-700 line-through px-1.5 py-0.5 rounded'
                            : 'text-blue-900'
                        }`}
                      >
                        {formatValue(conflict.materialVersion.value)}
                      </span>
                    </div>
                    <div className="space-y-1 text-xs text-gray-500">
                      <div>来源: {sourceLabels[conflict.materialVersion.source] || conflict.materialVersion.source}</div>
                      <div>操作人: {conflict.materialVersion.operator}</div>
                      <div>
                        时间:{' '}
                        {format(new Date(conflict.materialVersion.timestamp), 'yyyy-MM-dd HH:mm', {
                          locale: zhCN,
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-center px-3 border-x border-gray-100">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                      VS
                    </div>
                  </div>

                  <div className="p-4 bg-orange-50/50">
                    <div className="text-xs font-semibold text-orange-700 mb-2">场次协调版本</div>
                    <div className="mb-2">
                      <span
                        className={`text-lg font-bold ${
                          valuesDiffer && !resolved
                            ? 'bg-green-100 text-green-800 px-1.5 py-0.5 rounded'
                            : 'text-orange-900'
                        }`}
                      >
                        {formatValue(conflict.cityVersion.value)}
                      </span>
                    </div>
                    <div className="space-y-1 text-xs text-gray-500">
                      <div>来源: {sourceLabels[conflict.cityVersion.source] || conflict.cityVersion.source}</div>
                      <div>操作人: {conflict.cityVersion.operator}</div>
                      <div>
                        时间:{' '}
                        {format(new Date(conflict.cityVersion.timestamp), 'yyyy-MM-dd HH:mm', {
                          locale: zhCN,
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {!resolved ? (
                  <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/50">
                    <div className="flex items-center gap-3 flex-wrap">
                      <button
                        onClick={() => handleResolve(conflict.id, 'material')}
                        className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Check size={14} />
                        采用物资管理员版本
                      </button>
                      <button
                        onClick={() => handleResolve(conflict.id, 'city')}
                        className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors"
                      >
                        <Check size={14} />
                        采用场次协调版本
                      </button>
                      <button
                        onClick={() => setMergingId(isMerging ? null : conflict.id)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-gray-500 text-white text-sm font-medium rounded-lg hover:bg-gray-600 transition-colors"
                      >
                        <Edit3 size={14} />
                        自定义合并
                      </button>
                    </div>

                    {isMerging && (
                      <div className="mt-3 flex items-center gap-2">
                        <input
                          type="text"
                          value={customValues[conflict.id] || ''}
                          onChange={(e) =>
                            setCustomValues((prev) => ({ ...prev, [conflict.id]: e.target.value }))
                          }
                          placeholder="输入自定义合并值..."
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                        />
                        <button
                          onClick={() => handleResolve(conflict.id, 'custom', customValues[conflict.id])}
                          disabled={!customValues[conflict.id]?.trim()}
                          className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          确认
                        </button>
                        <button
                          onClick={() => setMergingId(null)}
                          className="px-3 py-2 text-gray-500 hover:text-gray-700 transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="px-5 py-3 border-t border-gray-100 flex items-center gap-2 text-sm text-green-700">
                    <Check size={16} className="text-green-600" />
                    <span>
                      已采用
                      {conflict.status === 'resolved-material'
                        ? '物资管理员'
                        : conflict.status === 'resolved-city'
                          ? '场次协调'
                          : '自定义'}
                      版本
                      {conflict.status === 'resolved-custom' && conflict.resolvedValue !== undefined && (
                        <span className="ml-1 font-medium">({formatValue(conflict.resolvedValue)})</span>
                      )}
                    </span>
                    <span className="text-gray-400 mx-1">·</span>
                    <span className="text-gray-500">{conflict.resolvedBy}</span>
                    <span className="text-gray-400 mx-1">·</span>
                    <span className="text-gray-500">
                      {conflict.resolvedAt &&
                        format(new Date(conflict.resolvedAt), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
