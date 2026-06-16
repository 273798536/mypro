import { useState } from 'react';
import {
  History,
  Edit3,
  CheckCircle,
  CheckCircle2,
  Clock,
  User,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  MapPin,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFirePointStore } from '@/store/useFirePointStore';
import { getFieldText, formatDateTime, getStatusText } from '@/utils/format';
import StatusBadge from '@/components/StatusBadge';
import Button from '@/components/Button';

export default function HistoryPage() {
  const { points, changeHistory, confirmChange, searchQuery, setSearchQuery } = useFirePointStore();
  const [expandedRecords, setExpandedRecords] = useState<Set<string>>(new Set());
  const [filterPointId, setFilterPointId] = useState<string | null>(null);

  const toggleExpanded = (id: string) => {
    setExpandedRecords((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getPointById = (id: string) => points.find((p) => p.id === id);

  const filteredHistory = changeHistory
    .filter((record) => {
      if (filterPointId && record.pointId !== filterPointId) return false;
      if (searchQuery) {
        const point = getPointById(record.pointId);
        const query = searchQuery.toLowerCase();
        return (
          point?.name.toLowerCase().includes(query) ||
          point?.address.toLowerCase().includes(query) ||
          record.oldValue.toLowerCase().includes(query) ||
          record.newValue.toLowerCase().includes(query)
        );
      }
      return true;
    })
    .sort((a, b) => new Date(b.operatedAt).getTime() - new Date(a.operatedAt).getTime());

  const groupedByDate = filteredHistory.reduce((groups, record) => {
    const date = new Date(record.operatedAt).toLocaleDateString('zh-CN');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(record);
    return groups;
  }, {} as Record<string, typeof filteredHistory>);

  const fieldIcons = {
    remark: Edit3,
    status: CheckCircle,
    mergedFeedback: CheckCircle2,
  };

  const getDiffClass = (oldVal: string, newVal: string) => {
    if (!oldVal && newVal) return 'diff-added';
    if (oldVal && !newVal) return 'diff-removed';
    return 'diff-modified';
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 opacity-0 animate-fade-in" style={{ animationFillMode: 'forwards' }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <History className="w-5 h-5 text-primary-700" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-text-primary">
                归并历史记录
              </h1>
              <p className="text-text-muted text-sm">
                查看所有点位的变更历史，支持按日期和点位筛选
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-4 mb-6 opacity-0 animate-fade-in animation-delay-100" style={{ animationFillMode: 'forwards' }}>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="搜索点位名称、变更内容..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-surface border border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all"
            />
          </div>
          <select
            value={filterPointId || ''}
            onChange={(e) => setFilterPointId(e.target.value || null)}
            className="px-4 py-2 text-sm bg-surface border border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all"
          >
            <option value="">全部点位</option>
            {points.map((point) => (
              <option key={point.id} value={point.id}>
                {point.id} - {point.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-8">
          {Object.entries(groupedByDate).map(([date, records], dateIndex) => (
            <div
              key={date}
              className="opacity-0 animate-fade-in"
              style={{ animationDelay: `${(dateIndex + 2) * 100}ms`, animationFillMode: 'forwards' }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-primary-200" />
                <div className="flex items-center gap-2 px-4 py-1.5 bg-primary-100 rounded-full">
                  <Clock className="w-4 h-4 text-primary-600" />
                  <span className="text-sm font-medium text-primary-700">{date}</span>
                  <span className="text-xs text-primary-500 font-mono">
                    {records.length} 条变更
                  </span>
                </div>
                <div className="h-px flex-1 bg-primary-200" />
              </div>

              <div className="relative pl-8">
                <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gradient-to-b from-primary-300 via-primary-200 to-transparent" />

                {records.map((record, recordIndex) => {
                  const point = getPointById(record.pointId);
                  const FieldIcon = fieldIcons[record.field];
                  const isExpanded = expandedRecords.has(record.id);
                  const diffClass = getDiffClass(record.oldValue, record.newValue);

                  return (
                    <div
                      key={record.id}
                      className="relative mb-4 last:mb-0"
                      style={{ animationDelay: `${recordIndex * 50}ms` }}
                    >
                      <div className="absolute -left-5 top-4 w-4 h-4 rounded-full bg-white border-4 border-primary-400 shadow z-10" />

                      <div className="bg-surface rounded-lg border border-primary-100 shadow-card hover:shadow-card-hover transition-all overflow-hidden">
                        <div
                          className="flex items-center gap-3 p-4 cursor-pointer hover:bg-surface-secondary/50 transition-colors"
                          onClick={() => toggleExpanded(record.id)}
                        >
                          <div
                            className={cn(
                              'w-10 h-10 rounded-lg flex items-center justify-center',
                              record.confirmed ? 'bg-green-100' : 'bg-yellow-100'
                            )}
                          >
                            <FieldIcon
                              className={cn(
                                'w-5 h-5',
                                record.confirmed ? 'text-green-600' : 'text-yellow-600'
                              )}
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono text-xs font-semibold text-primary-600 bg-primary-100 px-2 py-0.5 rounded">
                                {record.pointId}
                              </span>
                              <span className="text-sm font-medium text-text-primary">
                                {getFieldText(record.field)}
                              </span>
                              {point && <StatusBadge status={point.status} className="scale-90" />}
                              <span
                                className={cn(
                                  'px-2 py-0.5 rounded text-[10px] font-bold',
                                  record.confirmed
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-yellow-100 text-yellow-700'
                                )}
                              >
                                {record.confirmed ? '已确认' : '待确认'}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-text-muted">
                              {point && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {point.name}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {record.operator}
                              </span>
                              <span>{formatDateTime(record.operatedAt)}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {!record.confirmed && (
                              <Button
                                size="sm"
                                variant="primary"
                                leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  confirmChange(record.id);
                                }}
                              >
                                确认
                              </Button>
                            )}
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5 text-text-muted" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-text-muted" />
                            )}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="px-4 pb-4 pt-0 border-t border-primary-100">
                            <div className="mt-4 grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <div className="text-xs font-medium text-text-muted">变更前</div>
                                <div
                                  className={cn(
                                    'p-3 rounded-lg text-sm',
                                    record.oldValue ? 'bg-surface-secondary' : 'bg-surface-secondary/50 italic text-text-muted'
                                  )}
                                >
                                  {record.field === 'status'
                                    ? getStatusText(record.oldValue as any) || '无'
                                    : record.oldValue || '无'}
                                </div>
                              </div>

                              <div className="space-y-2">
                                <div className="flex items-center gap-1 text-xs font-medium text-text-muted">
                                  <ArrowRight className="w-3 h-3 text-accent-500" />
                                  变更后
                                </div>
                                <div
                                  className={cn(
                                    'p-3 rounded-lg text-sm',
                                    diffClass,
                                    record.newValue ? '' : 'italic text-text-muted'
                                  )}
                                >
                                  {record.field === 'status'
                                    ? getStatusText(record.newValue as any) || '无'
                                    : record.newValue || '无'}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {filteredHistory.length === 0 && (
            <div className="text-center py-16 text-text-muted opacity-0 animate-fade-in animation-delay-200" style={{ animationFillMode: 'forwards' }}>
              <History className="w-12 h-12 mx-auto mb-3 text-text-muted/50" />
              <p className="text-sm">暂无变更记录</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
