import { useState, useMemo } from 'react';
import { useAppStore } from '../store';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Clock, CheckCircle, XCircle, Filter, Search, User, MessageSquare, History } from 'lucide-react';
import { anomalyTypeLabel, formatDateTime, statusLabel, actionLabel } from '../utils/data';
import type { AnomalyStatus } from '../types';

export default function Anomalies() {
  const navigate = useNavigate();
  const records = useAppStore((s) => s.records);
  const anomalies = useAppStore((s) => s.anomalies);
  const history = useAppStore((s) => s.history);
  const selectRecord = useAppStore((s) => s.selectRecord);
  const reviewAnomaly = useAppStore((s) => s.reviewAnomaly);
  const markAnomaly = useAppStore((s) => s.markAnomaly);
  const getHistoryForAnomaly = useAppStore((s) => s.getHistoryForAnomaly);

  const [filter, setFilter] = useState<AnomalyStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [selectedAnomalyId, setSelectedAnomalyId] = useState<string | null>(null);
  const [reviewer, setReviewer] = useState('物理老师');
  const [reason, setReason] = useState('');

  const anomalyRecords = useMemo(() => {
    let list = anomalies.map((a) => {
      const record = records.find((r) => r.id === a.recordId);
      return { anomaly: a, record };
    }).filter((x): x is { anomaly: typeof anomalies[number]; record: typeof records[number] } => !!x.record);

    if (filter !== 'all') {
      list = list.filter((x) => x.anomaly.status === filter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((x) =>
        x.record.id.toLowerCase().includes(q) ||
        anomalyTypeLabel(x.record.anomalyType).includes(q)
      );
    }
    return list.sort((a, b) => b.record.timestamp - a.record.timestamp);
  }, [anomalies, records, filter, search]);

  const selectedAnomaly = selectedAnomalyId
    ? anomalies.find((a) => a.id === selectedAnomalyId)
    : null;
  const selectedRecord = selectedAnomaly
    ? records.find((r) => r.id === selectedAnomaly.recordId)
    : null;
  const selectedHistory = selectedAnomaly ? getHistoryForAnomaly(selectedAnomaly.id) : [];

  const pendingAnomalyRecords = records.filter((r) => r.isAnomaly && !anomalies.find((a) => a.recordId === r.id));

  const handleJumpToCanvas = (recordId: string) => {
    selectRecord(recordId);
    navigate('/');
  };

  const handleReview = (status: 'confirmed' | 'dismissed') => {
    if (!selectedAnomaly) return;
    if (!reason.trim()) {
      alert('请填写处理原因');
      return;
    }
    reviewAnomaly(selectedAnomaly.id, status, reviewer, reason);
    setReason('');
  };

  const StatusBadge = ({ status }: { status: AnomalyStatus }) => {
    const cfg: Record<AnomalyStatus, { cls: string; icon: React.ReactNode }> = {
      pending: { cls: 'bg-metro-warning/20 text-metro-warning border-metro-warning/40', icon: <Clock size={10} /> },
      confirmed: { cls: 'bg-metro-danger/20 text-metro-danger border-metro-danger/40', icon: <CheckCircle size={10} /> },
      dismissed: { cls: 'bg-metro-muted/20 text-metro-muted border-metro-muted/40', icon: <XCircle size={10} /> },
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono border ${cfg[status].cls}`}>
        {cfg[status].icon}
        {statusLabel(status)}
      </span>
    );
  };

  const counts = {
    all: anomalies.length,
    pending: anomalies.filter((a) => a.status === 'pending').length,
    confirmed: anomalies.filter((a) => a.status === 'confirmed').length,
    dismissed: anomalies.filter((a) => a.status === 'dismissed').length,
  };

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-[1600px] mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="btn-control flex items-center gap-1.5">
              <ArrowLeft size={14} /> 返回主界面
            </button>
            <div>
              <h1 className="text-xl font-semibold text-metro-text flex items-center gap-2">
                <AlertTriangle size={20} className="text-metro-anomaly" />
                异常处理中心
              </h1>
              <p className="text-sm text-metro-muted">离群点复核、历史回溯、处理意见记录</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {(['all', 'pending', 'confirmed', 'dismissed'] as const).map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`panel p-3 text-left transition-all ${
                filter === k ? 'border-metro-primary shadow-glow-primary' : 'hover:border-metro-muted'
              }`}
            >
              <div className="data-label mb-1">
                {k === 'all' ? '全部异常' : k === 'pending' ? '待复核' : k === 'confirmed' ? '已确认' : '已排除'}
              </div>
              <div className={`text-2xl font-mono font-semibold ${
                k === 'pending' ? 'text-metro-warning' :
                k === 'confirmed' ? 'text-metro-danger' :
                k === 'dismissed' ? 'text-metro-muted' : 'text-metro-text'
              }`}>
                {counts[k]}
              </div>
            </button>
          ))}
        </div>

        {pendingAnomalyRecords.length > 0 && (
          <div className="panel p-4 border-metro-warning/40">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-metro-warning" />
                <span className="font-mono text-sm text-metro-warning">
                  检测到 {pendingAnomalyRecords.length} 条异常记录尚未纳入异常列表
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {pendingAnomalyRecords.slice(0, 8).map((r) => (
                <button
                  key={r.id}
                  onClick={() => markAnomaly(r.id)}
                  className="px-2 py-1 bg-metro-warning/10 border border-metro-warning/40 rounded text-xs font-mono text-metro-warning hover:bg-metro-warning/20 transition-colors"
                >
                  #{r.id.slice(0, 6)} · {anomalyTypeLabel(r.anomalyType)} — 点击登记
                </button>
              ))}
              {pendingAnomalyRecords.length > 8 && (
                <span className="px-2 py-1 text-xs font-mono text-metro-muted">
                  还有 {pendingAnomalyRecords.length - 8} 条...
                </span>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-4" style={{ minHeight: 520 }}>
          <div className="panel overflow-hidden flex flex-col">
            <div className="panel-header">
              <div className="flex items-center gap-2">
                <Filter size={14} className="text-metro-muted" />
                <h3 className="panel-title">异常列表</h3>
                <span className="data-label">({anomalyRecords.length})</span>
              </div>
              <div className="relative w-56">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-metro-muted" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="搜索 ID / 类型..."
                  className="w-full pl-8 pr-3 py-1.5 bg-metro-bg border border-metro-border rounded text-sm text-metro-text focus:outline-none focus:border-metro-primary"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-metro-panel z-10">
                  <tr className="text-left border-b border-metro-border">
                    <th className="px-4 py-2 data-label font-normal">记录 ID</th>
                    <th className="px-4 py-2 data-label font-normal">异常类型</th>
                    <th className="px-4 py-2 data-label font-normal">坐标 / 楼层</th>
                    <th className="px-4 py-2 data-label font-normal">时间</th>
                    <th className="px-4 py-2 data-label font-normal">状态</th>
                    <th className="px-4 py-2 data-label font-normal">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {anomalyRecords.map(({ anomaly, record }) => (
                    <tr
                      key={anomaly.id}
                      onClick={() => setSelectedAnomalyId(anomaly.id)}
                      className={`border-b border-metro-border/50 cursor-pointer transition-colors ${
                        selectedAnomalyId === anomaly.id ? 'bg-metro-primary/10' : 'hover:bg-metro-bg'
                      }`}
                    >
                      <td className="px-4 py-2 font-mono text-metro-text text-xs">{record.id}</td>
                      <td className="px-4 py-2">
                        <span className="anomaly-tag">{anomalyTypeLabel(record.anomalyType)}</span>
                      </td>
                      <td className="px-4 py-2 font-mono text-xs text-metro-text">
                        ({record.x.toFixed(1)}, {record.y.toFixed(1)}) · F{record.floor}
                      </td>
                      <td className="px-4 py-2 font-mono text-xs text-metro-muted">
                        {formatDateTime(record.timestamp)}
                      </td>
                      <td className="px-4 py-2"><StatusBadge status={anomaly.status} /></td>
                      <td className="px-4 py-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleJumpToCanvas(record.id); }}
                          className="text-xs font-mono text-metro-primary hover:underline"
                        >
                          定位 →
                        </button>
                      </td>
                    </tr>
                  ))}
                  {anomalyRecords.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-metro-muted">
                        <AlertTriangle size={28} className="mx-auto mb-2 opacity-40" />
                        <p className="font-mono text-sm">暂无匹配的异常记录</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel flex flex-col overflow-hidden">
            <div className="panel-header">
              <h3 className="panel-title">复核详情</h3>
              {selectedAnomaly && <StatusBadge status={selectedAnomaly.status} />}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {!selectedAnomaly || !selectedRecord ? (
                <div className="h-full flex items-center justify-center text-metro-muted">
                  <div className="text-center">
                    <History size={32} className="mx-auto mb-2 opacity-40" />
                    <p className="font-mono text-sm">从左侧选择一条异常记录</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="data-label">记录ID</div>
                      <div className="data-value text-sm font-mono">{selectedRecord.id}</div>
                    </div>
                    <div>
                      <div className="data-label">异常类型</div>
                      <div className="data-value text-sm">{anomalyTypeLabel(selectedRecord.anomalyType)}</div>
                    </div>
                    <div>
                      <div className="data-label">坐标</div>
                      <div className="data-value text-sm font-mono">
                        ({selectedRecord.x.toFixed(1)}, {selectedRecord.y.toFixed(1)})
                      </div>
                    </div>
                    <div>
                      <div className="data-label">楼层 / 人流</div>
                      <div className="data-value text-sm font-mono">F{selectedRecord.floor} · {selectedRecord.peopleCount}人</div>
                    </div>
                    <div className="col-span-2">
                      <div className="data-label">时间戳</div>
                      <div className="data-value text-sm">{formatDateTime(selectedRecord.timestamp)}</div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleJumpToCanvas(selectedRecord.id)}
                    className="btn-control btn-primary w-full"
                  >
                    在剖面图中定位 →
                  </button>

                  {selectedAnomaly.status === 'pending' && (
                    <div className="space-y-3 pt-2 border-t border-metro-border">
                      <div>
                        <label className="data-label block mb-1 flex items-center gap-1">
                          <User size={10} /> 复核人
                        </label>
                        <input
                          value={reviewer}
                          onChange={(e) => setReviewer(e.target.value)}
                          className="w-full px-3 py-1.5 bg-metro-bg border border-metro-border rounded text-sm text-metro-text focus:outline-none focus:border-metro-primary"
                        />
                      </div>
                      <div>
                        <label className="data-label block mb-1 flex items-center gap-1">
                          <MessageSquare size={10} /> 处理意见（必填）
                        </label>
                        <textarea
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          rows={3}
                          placeholder="请填写复核理由，将永久保存至历史记录..."
                          className="w-full px-3 py-1.5 bg-metro-bg border border-metro-border rounded text-sm text-metro-text focus:outline-none focus:border-metro-primary resize-none"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleReview('confirmed')} className="btn-control btn-danger flex-1 flex items-center justify-center gap-1.5">
                          <CheckCircle size={14} /> 确认异常
                        </button>
                        <button onClick={() => handleReview('dismissed')} className="btn-control flex-1 flex items-center justify-center gap-1.5">
                          <XCircle size={14} /> 排除异常
                        </button>
                      </div>
                    </div>
                  )}

                  {selectedAnomaly.status !== 'pending' && (
                    <div className="pt-2 border-t border-metro-border">
                      <div className="data-label mb-2">最近复核结果</div>
                      <div className="space-y-1 text-sm">
                        <div className="flex gap-2">
                          <span className="text-metro-muted w-16">复核人:</span>
                          <span className="text-metro-text">{selectedAnomaly.reviewer}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-metro-muted w-16">时间:</span>
                          <span className="text-metro-text">{formatDateTime(selectedAnomaly.reviewedAt)}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-metro-muted w-16">意见:</span>
                          <span className="text-metro-text flex-1">{selectedAnomaly.comment}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedHistory.length > 0 && (
                    <div className="pt-2 border-t border-metro-border">
                      <div className="data-label mb-3 flex items-center gap-1">
                        <History size={12} /> 完整处理历史（可回溯）
                      </div>
                      <div className="space-y-3">
                        {selectedHistory.map((h) => (
                          <div key={h.id} className="flex gap-3">
                            <div className="flex flex-col items-center pt-1">
                              <div className="w-2.5 h-2.5 rounded-full bg-metro-primary" />
                              <div className="w-px flex-1 bg-metro-border mt-1" />
                            </div>
                            <div className="flex-1 pb-3 border-b border-metro-border/50 last:border-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-sm text-metro-primary font-medium">
                                  {actionLabel(h.action)}
                                </span>
                                <span className="text-xs text-metro-muted">· {h.user}</span>
                                <span className="text-xs text-metro-muted ml-auto">
                                  {formatDateTime(h.timestamp)}
                                </span>
                              </div>
                              <div className="text-sm text-metro-text mt-1">{h.reason}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3 className="panel-title">全局操作时间线</h3>
            <span className="data-label">共 {history.length} 条记录</span>
          </div>
          <div className="p-4 max-h-56 overflow-y-auto">
            <div className="space-y-2">
              {history.slice().sort((a, b) => b.timestamp - a.timestamp).slice(0, 50).map((h) => {
                const record = records.find((r) => {
                  const a = anomalies.find((aa) => aa.id === h.anomalyId);
                  return a?.recordId === r.id;
                });
                return (
                  <div key={h.id} className="flex items-center gap-3 text-sm">
                    <span className="font-mono text-xs text-metro-muted w-32 shrink-0">
                      {formatDateTime(h.timestamp)}
                    </span>
                    <span className="font-mono text-metro-primary w-20 shrink-0">{actionLabel(h.action)}</span>
                    <span className="text-metro-muted">{h.user}</span>
                    <span className="text-metro-text flex-1 truncate">{h.reason}</span>
                    {record && (
                      <span className="anomaly-tag shrink-0">
                        #{record.id.slice(0, 6)} · {anomalyTypeLabel(record.anomalyType)}
                      </span>
                    )}
                  </div>
                );
              })}
              {history.length === 0 && (
                <p className="text-metro-muted text-sm font-mono">暂无操作记录</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
