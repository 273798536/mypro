import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Clock, Filter } from 'lucide-react';
import { useStore } from '@/store';
import { formatDateTime } from '@/utils/helpers';
import { cn } from '@/lib/utils';
import type { OperationLog } from '@/types';
import PageContainer from '@/components/layout/PageContainer';

type FilterType = 'all' | 'import' | 'update' | 'delete' | 'lock';

const filterOptions: { value: FilterType; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'import', label: '导入' },
  { value: 'update', label: '修改' },
  { value: 'delete', label: '删除' },
  { value: 'lock', label: '锁定' },
];

function getOperationColor(type: OperationLog['operationType']): string {
  switch (type) {
    case 'import':
      return 'bg-navy';
    case 'update':
      return 'bg-forest';
    case 'delete':
      return 'bg-alert';
    case 'lock':
    case 'unlock':
      return 'bg-muted';
    default:
      return 'bg-charcoal';
  }
}

function getOperationBadge(type: OperationLog['operationType']): string {
  switch (type) {
    case 'import':
      return 'bg-navy/10 text-navy';
    case 'update':
      return 'bg-forest/10 text-forest';
    case 'delete':
      return 'bg-alert/10 text-alert';
    case 'lock':
      return 'bg-muted/10 text-muted';
    case 'unlock':
      return 'bg-amber/10 text-amber';
    default:
      return 'bg-pale text-charcoal';
  }
}

function getOperationLabel(type: OperationLog['operationType']): string {
  switch (type) {
    case 'import':
      return '导入';
    case 'update':
      return '修改';
    case 'delete':
      return '删除';
    case 'lock':
      return '锁定';
    case 'unlock':
      return '解锁';
    case 'create':
      return '创建';
    case 'export':
      return '导出';
    default:
      return type;
  }
}

export default function HistoryPage() {
  const { id } = useParams<{ id: string }>();
  const { playlists, operationLogs } = useStore();
  const [filter, setFilter] = useState<FilterType>('all');

  const playlist = playlists.find((p) => p.id === id);

  const filteredLogs = useMemo(() => {
    let logs = operationLogs
      .filter((log) => log.playlistId === id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (filter !== 'all') {
      if (filter === 'lock') {
        logs = logs.filter((log) => log.operationType === 'lock' || log.operationType === 'unlock');
      } else {
        logs = logs.filter((log) => log.operationType === filter);
      }
    }
    return logs;
  }, [operationLogs, id, filter]);

  if (!playlist) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-96 text-muted text-lg">
          歌单不存在
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="操作历史">
      <div className="mb-6 flex items-center gap-3">
        <Filter size={16} className="text-muted" />
        <div className="flex gap-2">
          {filterOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={cn(
                'px-3 py-1 text-sm rounded-full transition-colors',
                filter === opt.value
                  ? 'bg-navy text-white'
                  : 'bg-pale text-charcoal hover:bg-pale/70'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {filteredLogs.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-muted">
          <Clock size={40} className="mb-3 opacity-50" />
          <p>暂无操作记录</p>
        </div>
      ) : (
        <div className="relative ml-4">
          <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-pale" />
          <div className="space-y-6">
            {filteredLogs.map((log) => (
              <div key={log.id} className="relative flex gap-4">
                <div
                  className={cn(
                    'w-4 h-4 rounded-full border-2 border-white shadow-sm flex-shrink-0 mt-1.5 z-10',
                    getOperationColor(log.operationType)
                  )}
                />
                <div className="flex-1 bg-white rounded-lg shadow-sm border border-pale p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs text-muted">
                      {formatDateTime(log.timestamp)}
                    </span>
                    <span
                      className={cn(
                        'px-2 py-0.5 text-xs rounded-full font-medium',
                        getOperationBadge(log.operationType)
                      )}
                    >
                      {getOperationLabel(log.operationType)}
                    </span>
                  </div>
                  <div className="text-sm text-charcoal mb-1">
                    <span className="text-muted">{log.operator}</span>
                    {log.operationType === 'update' && log.field && (
                      <span className="ml-2">
                        <span className="font-medium">{log.field}</span>：{log.oldValue && (
                          <span className="line-through text-muted">{log.oldValue}</span>
                        )}
                        {log.oldValue && log.newValue && ' → '}
                        {log.newValue && (
                          <span className="text-forest font-medium">{log.newValue}</span>
                        )}
                      </span>
                    )}
                  </div>
                  {log.remark && (
                    <p className="text-xs text-muted mt-1">{log.remark}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8">
        <Link
          to={`/playlist/${id}`}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-navy text-white rounded-lg hover:bg-navy/90 transition-colors"
        >
          <ArrowLeft size={16} />
          返回歌单
        </Link>
      </div>
    </PageContainer>
  );
}
