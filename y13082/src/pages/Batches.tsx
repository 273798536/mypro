import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ChevronRight,
  Warehouse,
  RefreshCw,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { Batch, BatchStatus } from '../../shared/types';
import { BatchStatusBadge } from '@/components/StatusBadges';

export default function BatchesPage() {
  const navigate = useNavigate();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [status, setStatus] = useState<BatchStatus | ''>('');
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api
      .listBatches(status || undefined, keyword || undefined)
      .then(setBatches)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [status, keyword]);

  const totalAnomalies = batches.reduce((s, b) => s + b.anomalyCount, 0);
  const pending = batches.filter((b) => b.status === 'pending').length;
  const rejudged = batches.filter((b) => b.status === 'rejudged').length;
  const completed = batches.filter((b) => b.status === 'completed').length;

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="mb-6">
        <h1 className="font-mono text-2xl font-bold flex items-center gap-3">
          <Warehouse className="w-7 h-7 text-alert-orange" />
          碰撞预审批次
        </h1>
        <p className="text-industrial-muted text-sm mt-1">
          所有预审批次总览，保留原始点位坐标，不自动清洗脏数据
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="industrial-panel p-4">
          <div className="text-xs text-industrial-muted flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-alert-orange" />
            异常总数
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-bold text-alert-orange">
              {totalAnomalies}
            </span>
            <span className="text-xs text-industrial-muted">个</span>
          </div>
        </div>
        <div className="industrial-panel p-4">
          <div className="text-xs text-industrial-muted flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-alert-yellow" />
            待审核
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-bold text-alert-yellow">
              {pending}
            </span>
            <span className="text-xs text-industrial-muted">批</span>
          </div>
        </div>
        <div className="industrial-panel p-4">
          <div className="text-xs text-industrial-muted flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5 text-alert-indigo" />
            已改判
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-bold text-alert-indigo">
              {rejudged}
            </span>
            <span className="text-xs text-industrial-muted">批</span>
          </div>
        </div>
        <div className="industrial-panel p-4">
          <div className="text-xs text-industrial-muted flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-alert-green" />
            已完成
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-bold text-alert-green">
              {completed}
            </span>
            <span className="text-xs text-industrial-muted">批</span>
          </div>
          {batches.length > 0 && (
            <div className="mt-3 h-1.5 bg-industrial-bg rounded-sm overflow-hidden">
              <div
                className="h-full bg-alert-green"
                style={{ width: `${(completed / batches.length) * 100}%` }}
              />
            </div>
          )}
        </div>
      </div>

      <div className="industrial-panel p-4 mb-4 flex items-center gap-4">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <Search className="w-4 h-4 text-industrial-muted" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索批次号或仓库名称..."
            className="industrial-input flex-1"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-industrial-muted" />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as BatchStatus | '')}
            className="industrial-select w-40"
          >
            <option value="">全部状态</option>
            <option value="pending">待审核</option>
            <option value="rejudged">已改判</option>
            <option value="completed">已完成</option>
          </select>
        </div>
        <button onClick={load} className="industrial-btn">
          <RefreshCw className="w-4 h-4 mr-1.5 inline" />
          刷新
        </button>
      </div>

      <div className="space-y-3">
        {loading && (
          <div className="industrial-panel p-8 text-center text-industrial-muted">
            加载中...
          </div>
        )}
        {!loading &&
          batches.map((b) => (
            <div
              key={b.id}
              onClick={() => navigate(`/batches/${b.id}`)}
              className="industrial-panel p-4 flex items-center gap-4 cursor-pointer hover:border-alert-orange/50 hover:bg-slate-800/40 transition-all group"
            >
              <div
                className={
                  'w-1 self-stretch -mx-4 my-[-1rem] ' +
                  (b.status === 'pending'
                    ? 'bg-alert-yellow'
                    : b.status === 'rejudged'
                      ? 'bg-alert-indigo'
                      : 'bg-alert-green')
                }
              />
              <div className="w-12 h-12 industrial-panel flex items-center justify-center shrink-0">
                <Warehouse className="w-6 h-6 text-industrial-muted" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-lg font-bold text-industrial-text">
                    {b.batchNo}
                  </span>
                  <BatchStatusBadge status={b.status} />
                </div>
                <div className="text-sm text-industrial-muted mt-0.5">
                  {b.warehouseName}
                </div>
                <div className="text-xs text-industrial-muted mt-1">
                  检测时间：{new Date(b.detectedAt).toLocaleString('zh-CN')}
                </div>
              </div>
              <div className="flex items-center gap-6 shrink-0">
                <div className="text-center">
                  <div className="font-mono text-2xl font-bold text-industrial-text">
                    {b.totalPoints}
                  </div>
                  <div className="text-[11px] text-industrial-muted">总点位</div>
                </div>
                <div className="text-center">
                  <div
                    className={
                      'font-mono text-2xl font-bold ' +
                      (b.anomalyCount > 0 ? 'text-alert-orange' : 'text-alert-green')
                    }
                  >
                    {b.anomalyCount}
                  </div>
                  <div className="text-[11px] text-industrial-muted">异常数</div>
                </div>
                <ChevronRight className="w-5 h-5 text-industrial-muted group-hover:text-alert-orange transition-colors" />
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
