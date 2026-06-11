import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  RefreshCw,
  Edit3,
  Table2,
  Box,
  AlertTriangle,
  Database,
  Info,
  Layers,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { BatchDetail, Collision, CameraAngle } from '../../shared/types';
import { DATA_SOURCE_LABELS } from '../../shared/types';
import { AnomalyTypeBadge, CollisionStatusBadge, BatchStatusBadge } from '@/components/StatusBadges';
import PointVisualizer from '@/components/PointVisualizer';
import RejudgeModal from '@/components/RejudgeModal';

type TabKey = 'visual' | 'points' | 'collisions';

export default function BatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<BatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>('visual');
  const [cameraAngle, setCameraAngle] = useState<CameraAngle>('iso');
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [rejudgeCollision, setRejudgeCollision] = useState<Collision | null>(null);
  const [highlightCollisionIds, setHighlightCollisionIds] = useState<string[]>([]);

  useEffect(() => {
    const handler = (e: Event) => {
      setCameraAngle((e as CustomEvent).detail);
    };
    window.addEventListener('camera-change', handler as EventListener);
    return () => window.removeEventListener('camera-change', handler as EventListener);
  }, []);

  const load = () => {
    if (!id) return;
    setLoading(true);
    api.getBatchDetail(id).then(setDetail).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [id]);

  const dirtyCount = useMemo(
    () => (detail ? detail.points.filter((p) => p.isDirty).length : 0),
    [detail],
  );

  const selectedPoint = detail?.points.find((p) => p.id === selectedPointId);

  if (loading && !detail) {
    return (
      <div className="p-6 text-center text-industrial-muted">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3" />
        加载批次详情...
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="p-6 text-center text-industrial-muted">
        批次不存在
        <button onClick={() => navigate('/batches')} className="industrial-btn ml-4">
          返回列表
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-industrial-border bg-industrial-panel/50 flex items-center gap-4 shrink-0">
        <button
          onClick={() => navigate('/batches')}
          className="industrial-btn flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          返回列表
        </button>
        <div className="h-6 w-px bg-industrial-border" />
        <div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xl font-bold">{detail.batchNo}</span>
            <BatchStatusBadge status={detail.status} />
          </div>
          <div className="text-xs text-industrial-muted mt-0.5">
            {detail.warehouseName} · 检测于 {new Date(detail.detectedAt).toLocaleString('zh-CN')}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-industrial-muted">
            <Layers className="w-4 h-4" />
            总点位：<span className="text-industrial-text font-mono font-semibold">{detail.totalPoints}</span>
          </div>
          <div className="flex items-center gap-1.5 text-industrial-muted">
            <Database className="w-4 h-4 text-alert-yellow" />
            脏数据：<span className="text-alert-yellow font-mono font-semibold">{dirtyCount}</span>
          </div>
          <div className="flex items-center gap-1.5 text-industrial-muted">
            <AlertTriangle className="w-4 h-4 text-alert-orange" />
            异常：<span className="text-alert-orange font-mono font-semibold">{detail.anomalyCount}</span>
          </div>
          <button onClick={load} className="industrial-btn">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1 px-4 pt-3 border-b border-industrial-border bg-industrial-bg shrink-0">
        {[
          { key: 'visual' as TabKey, label: '点位可视化', icon: Box },
          { key: 'points' as TabKey, label: '原始坐标表', icon: Table2 },
          { key: 'collisions' as TabKey, label: '碰撞/异常列表', icon: AlertTriangle },
        ].map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={
                'flex items-center gap-2 px-4 py-2.5 rounded-t-sm text-sm transition-all border-b-2 -mb-px ' +
                (active
                  ? 'text-alert-orange border-alert-orange bg-industrial-panel'
                  : 'text-industrial-muted border-transparent hover:text-industrial-text')
              }
            >
              <Icon className="w-4 h-4" />
              {t.label}
              {t.key === 'collisions' && detail.collisions.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-alert-orange/20 text-alert-orange rounded-sm font-mono">
                  {detail.collisions.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-hidden flex">
        {tab === 'visual' && (
          <div className="flex-1 relative">
            <PointVisualizer
              points={detail.points}
              collisions={detail.collisions}
              cameraAngle={cameraAngle}
              selectedPointId={selectedPointId}
              onSelectPoint={setSelectedPointId}
              highlightCollisionIds={highlightCollisionIds}
            />
            {selectedPoint && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 industrial-panel p-3 w-[420px]">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-sm font-bold text-alert-orange">
                    {selectedPoint.objectName}
                  </span>
                  <button onClick={() => setSelectedPointId(null)} className="text-industrial-muted hover:text-industrial-text text-xs">
                    关闭
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="text-industrial-muted mb-1">数据来源</div>
                    <div className="text-industrial-text">
                      {DATA_SOURCE_LABELS[selectedPoint.source]}
                    </div>
                  </div>
                  <div>
                    <div className="text-industrial-muted mb-1">是否脏数据</div>
                    <div className={selectedPoint.isDirty ? 'text-alert-yellow' : 'text-alert-green'}>
                      {selectedPoint.isDirty ? '是（保留原始）' : '否'}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-industrial-muted mb-1 flex items-center gap-1">
                      <Info className="w-3 h-3" /> 原始值（未清洗）
                    </div>
                    <div className="font-mono text-sm p-2 bg-industrial-bg rounded-sm border border-industrial-border">
                      X: <span className={selectedPoint.rawX ? 'text-industrial-text' : 'text-alert-red'}>{selectedPoint.rawX ?? '∅'}</span>
                      {'  '}Y: <span className={selectedPoint.rawY ? 'text-industrial-text' : 'text-alert-red'}>{selectedPoint.rawY ?? '∅'}</span>
                      {'  '}Z: <span className={selectedPoint.rawZ ? 'text-industrial-text' : 'text-alert-red'}>{selectedPoint.rawZ ?? '∅'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'points' && (
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-industrial-panel z-10">
                <tr className="text-left text-xs text-industrial-muted">
                  <th className="p-3 font-mono font-semibold">对象名称</th>
                  <th className="p-3 font-mono font-semibold">来源</th>
                  <th className="p-3 font-mono font-semibold">原始 X</th>
                  <th className="p-3 font-mono font-semibold">原始 Y</th>
                  <th className="p-3 font-mono font-semibold">原始 Z</th>
                  <th className="p-3 font-mono font-semibold">解析 X</th>
                  <th className="p-3 font-mono font-semibold">解析 Y</th>
                  <th className="p-3 font-mono font-semibold">解析 Z</th>
                  <th className="p-3 font-mono font-semibold">状态</th>
                </tr>
              </thead>
              <tbody>
                {detail.points.map((p, idx) => (
                  <tr
                    key={p.id}
                    className={
                      'border-t border-industrial-border hover:bg-slate-800/40 ' +
                      (p.isDirty ? 'bg-alert-orange/5' : idx % 2 ? 'bg-industrial-panel/30' : '')
                    }
                    onClick={() => {
                      setSelectedPointId(p.id);
                      setTab('visual');
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <td className="p-3 font-mono text-industrial-text">{p.objectName}</td>
                    <td className="p-3 text-industrial-muted">{DATA_SOURCE_LABELS[p.source]}</td>
                    <td className="p-3 font-mono text-xs">
                      <span className={p.rawX ? 'text-industrial-text' : 'text-alert-red'}>
                        {p.rawX ?? '∅'}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-xs">
                      <span className={p.rawY ? 'text-industrial-text' : 'text-alert-red'}>
                        {p.rawY ?? '∅'}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-xs">
                      <span className={p.rawZ ? 'text-industrial-text' : 'text-alert-red'}>
                        {p.rawZ ?? '∅'}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-xs text-alert-green">
                      {p.parsedX !== null ? p.parsedX.toFixed(2) : '—'}
                    </td>
                    <td className="p-3 font-mono text-xs text-alert-green">
                      {p.parsedY !== null ? p.parsedY.toFixed(2) : '—'}
                    </td>
                    <td className="p-3 font-mono text-xs text-alert-green">
                      {p.parsedZ !== null ? p.parsedZ.toFixed(2) : '—'}
                    </td>
                    <td className="p-3">
                      {p.isDirty ? (
                        <span className="industrial-badge border border-alert-yellow/50 bg-alert-yellow/20 text-alert-yellow">
                          脏数据
                        </span>
                      ) : (
                        <span className="industrial-badge border border-alert-green/50 bg-alert-green/20 text-alert-green">
                          正常
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'collisions' && (
          <div className="flex-1 overflow-auto p-4 space-y-3">
            {detail.collisions.length === 0 && (
              <div className="industrial-panel p-8 text-center text-industrial-muted">
                本批次暂未检测到碰撞或异常
              </div>
            )}
            {detail.collisions.map((c) => (
              <div
                key={c.id}
                onMouseEnter={() => setHighlightCollisionIds([c.id])}
                onMouseLeave={() => setHighlightCollisionIds([])}
                className="industrial-panel p-4 hover:border-alert-orange/40 transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 industrial-panel flex items-center justify-center shrink-0 bg-alert-orange/10 border-alert-orange/30">
                    <AlertTriangle className="w-5 h-5 text-alert-orange" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <AnomalyTypeBadge type={c.type} />
                      <CollisionStatusBadge status={c.status} />
                      {c.objectA && (
                        <span className="text-xs text-industrial-muted">对象：</span>
                      )}
                      {c.objectA && (
                        <span className="font-mono text-xs text-industrial-text">{c.objectA}</span>
                      )}
                      {c.objectB && (
                        <>
                          <span className="text-xs text-alert-red">⟷</span>
                          <span className="font-mono text-xs text-industrial-text">{c.objectB}</span>
                        </>
                      )}
                    </div>
                    <div className="text-sm text-industrial-text mt-2">{c.description}</div>
                    {c.rejudgedBy && (
                      <div className="mt-2 p-2 industrial-panel text-xs border-l-2 border-alert-indigo">
                        <div className="text-industrial-muted">
                          改判人：<span className="text-industrial-text">{c.rejudgedBy}</span>
                          {' · '}
                          时间：{new Date(c.rejudgedAt!).toLocaleString('zh-CN')}
                        </div>
                        <div className="text-industrial-text mt-1">理由：{c.rejudgedReason}</div>
                      </div>
                    )}
                    <div className="text-[11px] text-industrial-muted mt-1">
                      发现时间：{new Date(c.detectedAt).toLocaleString('zh-CN')}
                    </div>
                  </div>
                  <button
                    onClick={() => setRejudgeCollision(c)}
                    className="industrial-btn flex items-center gap-1.5 shrink-0"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    改判
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {rejudgeCollision && (
        <RejudgeModal
          collision={rejudgeCollision}
          onClose={() => setRejudgeCollision(null)}
          onRejudged={load}
        />
      )}
    </div>
  );
}
