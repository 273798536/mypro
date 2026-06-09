import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  Search,
  FileDown,
  Eye,
  History,
  AlertTriangle,
  Filter,
  Route,
} from 'lucide-react';
import { useWorkbench } from '../store/workbench';
import { formatDateTime, statusLabel, statusClass, riskLabel, riskClass } from '../utils';
import type { Snapshot, SnapshotStatus, RiskLevel } from '../../shared/types';

const STATUS_OPTIONS: Array<{ v?: SnapshotStatus; label: string }> = [
  { v: undefined, label: '全部' },
  { v: 'pending', label: '待复核' },
  { v: 'reviewing', label: '复核中' },
  { v: 'approved', label: '已通过' },
  { v: 'rejected', label: '已驳回' },
];

const RISK_OPTIONS: Array<{ v?: RiskLevel; label: string }> = [
  { v: undefined, label: '风险全部' },
  { v: 'low', label: '低风险' },
  { v: 'medium', label: '中风险' },
  { v: 'high', label: '高风险' },
  { v: 'critical', label: '严重' },
];

function TraceDrawer({ snapshot }: { snapshot: Snapshot }) {
  const { trace, loadTrace, clearTrace } = useWorkbench();
  const [anomalyId, setAnomalyId] = useState(`ANM-${Date.now().toString().slice(-6)}`);

  useEffect(() => {
    return () => clearTrace();
  }, []);

  const typeIcon: Record<string, string> = {
    anomaly: '⚠️',
    snapshot: '🖼️',
    record: '📋',
    opinion: '💬',
  };

  return (
    <div className="w-96 h-full border-l border-charcoal-800 bg-charcoal-900 flex flex-col animate-fade-in">
      <div className="px-4 py-3 border-b border-charcoal-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Route className="w-4 h-4 text-alert-orange" />
          <span className="text-sm font-medium">异常溯源 · {snapshot.code}</span>
        </div>
        <button onClick={clearTrace} className="btn-ghost">
          关闭
        </button>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex gap-2">
          <input
            value={anomalyId}
            onChange={(e) => setAnomalyId(e.target.value)}
            placeholder="异常编号"
            className="input-field flex-1 font-mono"
          />
          <button onClick={() => loadTrace(snapshot.id, anomalyId)} className="btn-primary">
            追溯
          </button>
        </div>
        {!trace && (
          <div className="text-xs text-charcoal-500 py-6 text-center">
            输入异常编号，点击追溯查看完整链路
            <div className="mt-2">验收标准：异常 → 截图 → 处理记录 → 处理意见</div>
          </div>
        )}
        {trace && (
          <div className="relative pl-6 mt-4">
            <div className="absolute left-2 top-2 bottom-2 w-px bg-charcoal-700" />
            {trace.chain.map((link, i) => (
              <div key={link.id} className="relative mb-4 animate-slide-up" style={{ animationDelay: `${i * 80}ms` }}>
                <div className="absolute -left-4 top-1 w-5 h-5 rounded-full bg-charcoal-800 border border-alert-orange flex items-center justify-center text-[10px]">
                  {typeIcon[link.type]}
                </div>
                <div className="bg-charcoal-800/60 border border-charcoal-700 rounded-sm px-3 py-2">
                  <div className="text-xs font-medium text-alert-orange font-mono">{link.label}</div>
                  <div className="text-[11px] text-charcoal-300 mt-1 leading-relaxed">{link.description}</div>
                  <div className="text-[10px] text-charcoal-500 mt-1 font-mono">{formatDateTime(link.time)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const { snapshots, filters, setFilters, loadSnapshots, importSnapshots, loading } = useWorkbench();
  const [traceTarget, setTraceTarget] = useState<Snapshot | null>(null);

  useEffect(() => {
    loadSnapshots();
  }, [filters.status, filters.riskLevel, filters.keyword]);

  const handleImport = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    await importSnapshots(Array.from(files));
  };

  return (
    <div className="h-[calc(100vh-3.5rem-2rem)] flex">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="px-6 py-4 border-b border-charcoal-800 bg-charcoal-900/50">
          <div className="flex items-center gap-3 flex-wrap">
            <button className="btn-warning" onClick={() => fileRef.current?.click()}>
              <Upload className="w-4 h-4" />
              导入截图清单
            </button>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => handleImport(e.target.files)}
            />
            <div className="flex items-center border border-charcoal-700 rounded-sm overflow-hidden">
              <div className="flex items-center px-2 text-charcoal-500">
                <Filter className="w-4 h-4" />
              </div>
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.v ?? 'all'}
                  onClick={() => setFilters({ status: opt.v })}
                  className={`px-3 py-1.5 text-xs transition-colors ${
                    filters.status === opt.v ? 'bg-industrial-800 text-white' : 'text-charcoal-400 hover:bg-charcoal-800'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="flex items-center border border-charcoal-700 rounded-sm overflow-hidden">
              {RISK_OPTIONS.map((opt) => (
                <button
                  key={opt.v ?? 'all'}
                  onClick={() => setFilters({ riskLevel: opt.v })}
                  className={`px-3 py-1.5 text-xs transition-colors ${
                    filters.riskLevel === opt.v ? 'bg-industrial-800 text-white' : 'text-charcoal-400 hover:bg-charcoal-800'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="relative ml-auto">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-500" />
              <input
                value={filters.keyword}
                onChange={(e) => setFilters({ keyword: e.target.value })}
                placeholder="搜索编号 / 设备名称"
                className="input-field w-64 pl-9"
              />
            </div>
            <button
              className="btn-primary"
              disabled={snapshots.length === 0}
              onClick={() => {
                const approved = snapshots.find((s) => s.status === 'approved');
                if (approved) navigate(`/report/${approved.id}`);
              }}
            >
              <FileDown className="w-4 h-4" />
              导出报告
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-charcoal-900/70 border-b border-charcoal-800 sticky top-0 z-10">
              <tr className="text-left text-xs text-charcoal-400 uppercase tracking-wider">
                <th className="px-4 py-3 w-20">截图</th>
                <th className="px-4 py-3 w-36 font-mono">编号</th>
                <th className="px-4 py-3">设备名称</th>
                <th className="px-4 py-3 w-28">状态</th>
                <th className="px-4 py-3 w-24">风险</th>
                <th className="px-4 py-3 w-32">最后操作人</th>
                <th className="px-4 py-3 w-40 font-mono text-[10px]">更新时间</th>
                <th className="px-4 py-3 w-56 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {snapshots.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-charcoal-500">
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="w-8 h-8 opacity-30" />
                      <div className="text-sm">暂无截图清单</div>
                      <div className="text-xs">点击左上角"导入截图清单"开始</div>
                    </div>
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-charcoal-500 text-sm animate-pulse">
                    加载中...
                  </td>
                </tr>
              )}
              {snapshots.map((s, idx) => (
                <tr
                  key={s.id}
                  className={`border-b border-charcoal-800 hover:bg-charcoal-800/30 transition-colors ${
                    idx % 2 ? 'bg-charcoal-900/30' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="w-14 h-14 bg-charcoal-800 border border-charcoal-700 rounded-sm overflow-hidden flex items-center justify-center">
                      {s.thumbnail ? (
                        <img src={s.thumbnail} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-charcoal-600 text-xs">无图</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-charcoal-300">{s.code}</td>
                  <td className="px-4 py-3 text-white">{s.deviceName}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${statusClass(s.status)}`}>{statusLabel(s.status)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge border ${riskClass(s.riskLevel)}`}>
                      {s.riskLevel === 'critical' && <AlertTriangle className="w-3 h-3 mr-1" />}
                      {riskLabel(s.riskLevel)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-charcoal-300 text-xs">{s.lastOperator}</td>
                  <td className="px-4 py-3 text-charcoal-500 text-[11px]">{formatDateTime(s.updatedAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => navigate(`/snapshot/${s.id}`)} className="btn-ghost">
                        <Eye className="w-4 h-4" />
                        复核
                      </button>
                      <button onClick={() => navigate(`/snapshot/${s.id}/history`)} className="btn-ghost">
                        <History className="w-4 h-4" />
                        历史
                      </button>
                      <button onClick={() => navigate(`/report/${s.id}`)} className="btn-ghost">
                        <FileDown className="w-4 h-4" />
                        报告
                      </button>
                      <button onClick={() => setTraceTarget(s)} className="btn-ghost">
                        <Route className="w-4 h-4" />
                        溯源
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {traceTarget && <TraceDrawer snapshot={traceTarget} />}
    </div>
  );
}
