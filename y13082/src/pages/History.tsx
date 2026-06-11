import { useEffect, useState } from 'react';
import { History, User, ChevronRight, Clock, Search } from 'lucide-react';
import { api } from '@/lib/api';
import type { HistoryRecord } from '../../shared/types';
import { COLLISION_STATUS_LABELS } from '../../shared/types';
import { CollisionStatusBadge } from '@/components/StatusBadges';

export default function HistoryPage() {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [batchFilter, setBatchFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.listHistory(batchFilter || undefined).then(setRecords).finally(() => setLoading(false));
  }, [batchFilter]);

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-mono text-2xl font-bold flex items-center gap-3">
            <History className="w-7 h-7 text-alert-indigo" />
            改判历史
          </h1>
          <p className="text-industrial-muted text-sm mt-1">
            所有人工改判操作记录，包含操作人、前后状态、改判理由
          </p>
        </div>
        <div className="flex items-center gap-2 w-64">
          <Search className="w-4 h-4 text-industrial-muted shrink-0" />
          <input
            value={batchFilter}
            onChange={(e) => setBatchFilter(e.target.value)}
            placeholder="按批次ID筛选..."
            className="industrial-input"
          />
        </div>
      </div>

      {loading && (
        <div className="industrial-panel p-8 text-center text-industrial-muted">
          加载中...
        </div>
      )}

      {!loading && records.length === 0 && (
        <div className="industrial-panel p-12 text-center text-industrial-muted">
          暂无改判记录
        </div>
      )}

      {!loading && records.length > 0 && (
        <div className="relative pl-8">
          <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-industrial-border" />
          <div className="space-y-4">
            {records.map((r, idx) => (
              <div key={r.id} className="relative">
                <div
                  className={
                    'absolute -left-5 top-4 w-3.5 h-3.5 rounded-full border-2 border-industrial-bg ' +
                    (r.newStatus === 'confirmed'
                      ? 'bg-alert-red'
                      : r.newStatus === 'false_positive'
                        ? 'bg-alert-green'
                        : 'bg-alert-yellow')
                  }
                />
                <div className="industrial-panel p-4 hover:border-alert-indigo/40 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-sm bg-alert-indigo/20 border border-alert-indigo/30 flex items-center justify-center">
                        <User className="w-4 h-4 text-alert-indigo" />
                      </div>
                      <span className="font-medium text-industrial-text">{r.operator}</span>
                      <span className="text-industrial-muted">于</span>
                      <span className="font-mono text-xs text-industrial-muted flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(r.createdAt).toLocaleString('zh-CN')}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-industrial-muted">
                      批次 {r.batchId}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mb-2">
                    <CollisionStatusBadge status={r.oldStatus} />
                    <ChevronRight className="w-4 h-4 text-industrial-muted" />
                    <CollisionStatusBadge status={r.newStatus} />
                    <span className="text-xs text-industrial-muted ml-auto">
                      {COLLISION_STATUS_LABELS[r.oldStatus]} →{' '}
                      {COLLISION_STATUS_LABELS[r.newStatus]}
                    </span>
                  </div>
                  <div className="p-3 bg-industrial-bg rounded-sm border border-industrial-border text-sm text-industrial-text">
                    <span className="text-industrial-muted text-xs mr-2">改判理由：</span>
                    {r.reason}
                  </div>
                  <div className="text-[11px] text-industrial-muted mt-2 font-mono">
                    collision_id: {r.collisionId}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
