import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import StatusBadge from '@/components/StatusBadge';
import DetectionBadge from '@/components/DetectionBadge';
import FloorMap from '@/components/FloorMap';
import {
  Database,
  AlertTriangle,
  Clock,
  CheckCheck,
  Trash2,
  RefreshCw,
  Play,
  ArrowUpRight,
} from 'lucide-react';
import type { Anomaly } from 'shared/types';

export default function Overview() {
  const { initIfNeeded, reloadAll, runDetection, stats, records, anomalies, loading } = useAppStore();
  const nav = useNavigate();

  useEffect(() => {
    initIfNeeded();
  }, [initIfNeeded]);

  const pendings = anomalies.filter(a => a.status === 'pending').sort((a, b) => b.created_at.localeCompare(a.created_at));
  const reviewed = anomalies.filter(a => a.status !== 'pending');

  return (
    <div className="space-y-5">
      {/* 顶部统计卡 */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          Icon={Database}
          label="传感器记录"
          value={stats?.total_records ?? 0}
          tone="brand"
          sub={`含 ${stats?.dirty_count ?? 0} 条脏数据（保留原始值）`}
        />
        <StatCard
          Icon={AlertTriangle}
          label="异常对象"
          value={stats?.total_anomalies ?? 0}
          tone="danger"
          sub="含已确认 / 待确认 / 已驳回"
        />
        <StatCard
          Icon={Clock}
          label="待确认事项"
          value={stats?.pending_count ?? 0}
          tone="warn"
          sub="请评审助理逐项确认"
          highlight
        />
        <StatCard
          Icon={CheckCheck}
          label="已复核"
          value={stats?.reviewed_count ?? 0}
          tone="success"
          sub={`总复核率 ${stats ? pct(stats.reviewed_count, stats.total_anomalies) : '—'}`}
        />
      </div>

      {/* 操作栏 */}
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn-primary" onClick={() => runDetection()}>
          <Play className="w-4 h-4" /> 执行相邻点位检测
        </button>
        <button className="btn-secondary" onClick={() => reloadAll()}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> 刷新数据
        </button>
        <div className="ml-auto text-xs text-brand-500">
          数据文件：<code className="font-mono bg-brand-50 px-1.5 py-0.5 rounded">sensor_records.json</code> /{' '}
          <code className="font-mono bg-brand-50 px-1.5 py-0.5 rounded">anomalies.json</code>
        </div>
      </div>

      {/* 下：左待确认清单 + 右点位列表 */}
      <div className="grid grid-cols-1 xl:grid-cols-[380px_minmax(0,1fr)] gap-4">
        {/* 待确认清单 */}
        <section className="card-padded max-h-[640px] overflow-auto flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-brand-800 text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-status-pending" />
              待确认事项 <span className="chip bg-amber-50 text-status-pending border border-amber-200">{pendings.length}</span>
            </h2>
          </div>
          {pendings.length === 0 ? (
            <EmptyHint icon={<Trash2 className="w-8 h-8" />} text="暂无待确认项 · 可点上方「执行检测」触发">
              检测只会标记不做修改，始终给出原因 + 影响范围后等待人工确认。
            </EmptyHint>
          ) : (
            <ul className="space-y-2.5">
              {pendings.map((a, i) => (
                <PendingItem
                  key={a.id}
                  anomaly={a}
                  delay={i * 30}
                  onClick={() => nav(`/anomaly/${a.id}`)}
                />
              ))}
            </ul>
          )}
        </section>

        {/* 点位列表（含异常摘要） */}
        <section className="card-padded max-h-[640px] overflow-auto">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-brand-800 text-sm">
              点位列表 · 异常摘要
            </h2>
            <button className="btn-secondary text-xs" onClick={() => nav('/sensors')}>
              查看完整传感器记录 <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="overflow-auto border border-brand-100 rounded-md">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="th-sticky left-0 z-20">点位编号</th>
                  <th className="th-sticky">空间坐标</th>
                  <th className="th-sticky">温湿度</th>
                  <th className="th-sticky">状态</th>
                  <th className="th-sticky">异常类型</th>
                  <th className="th-sticky">备注摘要</th>
                </tr>
              </thead>
              <tbody>
                {records.slice(0, 120).map(r => {
                  const list = anomalies.filter(a => a.point_id === r.point_id);
                  const worst = pickWorst(list);
                  return (
                    <tr
                      key={r.id}
                      className={
                        (r.is_dirty ? 'bg-rose-50/60 border-l-4 border-l-rose-400 ' : '') +
                        'hover:bg-brand-50/60 transition cursor-pointer'
                      }
                      onClick={() => {
                        if (worst) nav(`/anomaly/${worst.id}`);
                        else if (list[0]) nav(`/anomaly/${list[0].id}`);
                      }}
                    >
                      <td className="td-cell font-mono text-brand-800">{r.point_id}</td>
                      <td className="td-cell font-mono text-xs text-brand-500">R{r.row} · C{r.col}</td>
                      <td className="td-cell text-xs">
                        <span className={r.temperature === null ? 'text-rose-500' : 'text-brand-700'}>
                          {r.temperature === null ? '缺失' : `${r.temperature}℃`}
                        </span>
                        <span className="mx-1 text-brand-300">|</span>
                        <span className={r.humidity === null ? 'text-rose-500' : 'text-brand-600'}>
                          {r.humidity === null ? '缺失' : `${r.humidity}%`}
                        </span>
                      </td>
                      <td className="td-cell">
                        {worst ? (
                          <StatusBadge status={worst.status} />
                        ) : r.is_dirty ? (
                          <span className="chip bg-rose-50 text-rose-600 border border-rose-200">脏数据</span>
                        ) : (
                          <StatusBadge status="normal" />
                        )}
                      </td>
                      <td className="td-cell">
                        <div className="flex flex-wrap gap-1">
                          {list.map(a => (
                            <DetectionBadge key={a.id} type={a.detection_reason.type} />
                          ))}
                        </div>
                      </td>
                      <td className="td-cell max-w-[260px] text-xs text-brand-600 truncate">
                        {worst?.remark || <span className="text-brand-300">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* 2D 平面图 */}
      <FloorMap records={records} anomalies={anomalies} />
    </div>
  );
}

function pickWorst(list: Anomaly[]): Anomaly | undefined {
  if (list.length === 0) return undefined;
  const order: Record<Anomaly['status'], number> = {
    pending: 0,
    confirmed_anomaly: 1,
    dismissed: 2,
    normal: 3,
  };
  return [...list].sort((a, b) => order[a.status] - order[b.status])[0];
}

function StatCard({
  Icon,
  label,
  value,
  sub,
  tone,
  highlight,
}: {
  Icon: any;
  label: string;
  value: number;
  sub?: string;
  tone: 'brand' | 'danger' | 'warn' | 'success';
  highlight?: boolean;
}) {
  const tones: Record<string, string> = {
    brand: 'bg-brand-50 text-brand-600 border-brand-200',
    danger: 'bg-red-50 text-status-anomaly border-red-200',
    warn: 'bg-amber-50 text-status-pending border-amber-200',
    success: 'bg-green-50 text-status-normal border-green-200',
  };
  const valueTone: Record<string, string> = {
    brand: 'text-brand-800',
    danger: 'text-status-anomaly',
    warn: 'text-status-pending',
    success: 'text-status-normal',
  };
  return (
    <div
      className={
        'card-padded transition hover:shadow-md relative overflow-hidden ' +
        (highlight ? 'ring-2 ring-status-pending/60' : '')
      }
    >
      <div className="flex items-start gap-3">
        <div className={`p-2.5 rounded-lg border ${tones[tone]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-brand-500 mb-0.5">{label}</div>
          <div className={`font-mono text-2xl font-bold leading-none ${valueTone[tone]}`}>{value}</div>
          {sub ? <div className="mt-1.5 text-[11px] text-brand-400 leading-snug">{sub}</div> : null}
        </div>
      </div>
    </div>
  );
}

function PendingItem({
  anomaly,
  onClick,
  delay,
}: {
  anomaly: Anomaly;
  onClick: () => void;
  delay: number;
}) {
  return (
    <li
      onClick={onClick}
      style={{ animationDelay: `${delay}ms` }}
      className="animate-fade-in-up group p-3 rounded-md border border-amber-200/80 bg-gradient-to-br from-amber-50 to-white cursor-pointer hover:shadow-md hover:border-status-pending transition relative"
    >
      <div className="flex items-start gap-2.5">
        <div className="shrink-0 mt-0.5 w-7 h-7 rounded-full bg-status-pending/15 text-status-pending flex items-center justify-center ring-1 ring-status-pending/40">
          <AlertTriangle className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-mono font-semibold text-brand-800">{anomaly.point_id}</span>
            <DetectionBadge type={anomaly.detection_reason.type} />
            <span className="ml-auto text-[10px] text-brand-400 font-mono">{ago(anomaly.created_at)}</span>
          </div>
          <div className="text-[12.5px] text-brand-700 leading-relaxed line-clamp-2">
            {anomaly.detection_reason.description}
          </div>
          <div className="mt-2 flex items-center gap-1.5 flex-wrap text-[11px]">
            <span className="text-brand-500">影响：</span>
            {anomaly.affected_points.slice(0, 4).map(p => (
              <span key={p} className="px-1.5 py-0.5 rounded bg-brand-50 border border-brand-100 font-mono text-brand-600">
                {p}
              </span>
            ))}
            {anomaly.affected_points.length > 4 ? (
              <span className="text-brand-400">+{anomaly.affected_points.length - 4}</span>
            ) : null}
            <ArrowUpRight className="w-3.5 h-3.5 text-brand-400 ml-auto opacity-0 group-hover:opacity-100 transition" />
          </div>
        </div>
      </div>
    </li>
  );
}

function EmptyHint({ icon, text, children }: { icon: any; text: string; children?: any }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-8 text-center px-4">
      <div className="mb-3 text-brand-300">{icon}</div>
      <div className="text-sm text-brand-600 mb-1">{text}</div>
      {children ? <div className="text-xs text-brand-400 max-w-xs">{children}</div> : null}
    </div>
  );
}

function pct(a: number, b: number) {
  if (!b) return '0%';
  return Math.round((a / b) * 100) + '%';
}

function ago(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '刚刚';
  if (m < 60) return `${m} 分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小时前`;
  const d = Math.floor(h / 24);
  return `${d} 天前`;
}
