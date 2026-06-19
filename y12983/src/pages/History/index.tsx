import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock } from 'lucide-react';
import { useGapStore } from '@/stores/gapStore';
import { useHistoryStore } from '@/stores/historyStore';
import Card from '@/components/Card/Card';
import Timeline from '@/components/Timeline/Timeline';
import StatusBadge from '@/components/Status/StatusBadge';
import { formatDateTime } from '@/utils/format';

export default function HistoryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentGap, fetchGap } = useGapStore();
  const { history, fetchByGapId } = useHistoryStore();

  useEffect(() => {
    if (id) {
      fetchGap(id);
      fetchByGapId(id);
    }
  }, [id, fetchGap, fetchByGapId]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(`/gaps/${id}`)}
          className="p-2 rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Clock size={20} className="text-blue-400" />
            历史记录
          </h1>
          {currentGap && (
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge status={currentGap.status} size="sm" />
              <span className="text-sm text-slate-400">{currentGap.title}</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card title="操作时间线" subtitle={`共 ${history.length} 条记录`}>
            <Timeline logs={history} />
          </Card>
        </div>

        <div>
          <Card title="状态流转">
            <div className="space-y-3">
              {history
                .filter((h) => h.action === 'status_changed' || h.action === 'created' || h.action === 'concluded')
                .map((log) => (
                  <div key={log.id} className="flex items-center gap-3">
                    {log.toStatus && (
                      <StatusBadge status={log.toStatus} size="sm" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-400 truncate">{log.detail}</p>
                      <p className="text-xs text-slate-600">
                        {log.operator} · {formatDateTime(log.operatedAt)}
                      </p>
                    </div>
                  </div>
                ))}
              {history.filter((h) => h.action === 'status_changed' || h.action === 'created' || h.action === 'concluded').length === 0 && (
                <div className="text-center py-4 text-slate-500 text-xs">
                  暂无状态变更记录
                </div>
              )}
            </div>
          </Card>

          <Card title="操作统计" className="mt-4">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 bg-slate-800/50 rounded-lg">
                <div className="text-2xl font-bold text-blue-400 font-mono">
                  {history.length}
                </div>
                <div className="text-xs text-slate-500 mt-1">总操作数</div>
              </div>
              <div className="p-3 bg-slate-800/50 rounded-lg">
                <div className="text-2xl font-bold text-emerald-400 font-mono">
                  {history.filter(h => h.action === 'fixed').length}
                </div>
                <div className="text-xs text-slate-500 mt-1">修正次数</div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
