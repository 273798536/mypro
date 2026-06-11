import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Download,
  Save,
  FolderOpen,
  X,
  RefreshCw,
  ArrowUpDown,
  ChevronDown,
  Check,
  Filter,
  Eye,
  Edit3,
  Layers,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAppStore } from '@/store';
import type {
  Collision,
  SavedView,
  AnomalyType,
  CollisionStatus,
  CameraAngle,
} from '../../shared/types';
import { ANOMALY_TYPE_LABELS, COLLISION_STATUS_LABELS, CAMERA_ANGLE_LABELS } from '../../shared/types';
import { AnomalyTypeBadge, CollisionStatusBadge } from '@/components/StatusBadges';
import RejudgeModal from '@/components/RejudgeModal';
import PointVisualizer from '@/components/PointVisualizer';
import { api as apiClient } from '@/lib/api';

const ALL_ANOMALY_TYPES: AnomalyType[] = ['overlap', 'out_of_bounds', 'missing_coord', 'format_error'];
const ALL_STATUS: CollisionStatus[] = ['confirmed', 'false_positive', 'needs_review'];

export default function AnomaliesPage() {
  const {
    anomalyTypes,
    statusFilter,
    sortBy,
    sortOrder,
    cameraAngle,
    setAnomalyTypes,
    setStatusFilter,
    setSortBy,
    setSortOrder,
    setCameraAngle,
    applyView,
    currentOperator,
  } = useAppStore();

  const [collisions, setCollisions] = useState<Collision[]>([]);
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [viewName, setViewName] = useState('');
  const [showViewList, setShowViewList] = useState(false);
  const [rejudgeCollision, setRejudgeCollision] = useState<Collision | null>(null);
  const [showTypeFilter, setShowTypeFilter] = useState(false);
  const [showStatusFilter, setShowStatusFilter] = useState(false);
  const [previewCollision, setPreviewCollision] = useState<Collision | null>(null);

  const load = () => {
    setLoading(true);
    api
      .listAnomalies({
        types: anomalyTypes.length ? anomalyTypes : undefined,
        status: statusFilter.length ? statusFilter : undefined,
        sortBy,
        sortOrder,
      })
      .then(setCollisions)
      .finally(() => setLoading(false));
  };

  const loadViews = () => {
    api.listViews().then(setSavedViews);
  };

  useEffect(() => {
    load();
  }, [anomalyTypes, statusFilter, sortBy, sortOrder]);

  useEffect(() => {
    loadViews();
  }, []);

  useEffect(() => {
    const handler = (e: Event) => setCameraAngle((e as CustomEvent).detail);
    window.addEventListener('camera-change', handler as EventListener);
    return () => window.removeEventListener('camera-change', handler as EventListener);
  }, [setCameraAngle]);

  const toggleType = (t: AnomalyType) => {
    if (anomalyTypes.includes(t)) {
      setAnomalyTypes(anomalyTypes.filter((x) => x !== t));
    } else {
      setAnomalyTypes([...anomalyTypes, t]);
    }
  };

  const toggleStatus = (s: CollisionStatus) => {
    if (statusFilter.includes(s)) {
      setStatusFilter(statusFilter.filter((x) => x !== s));
    } else {
      setStatusFilter([...statusFilter, s]);
    }
  };

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleSaveView = async () => {
    if (!viewName.trim()) return;
    try {
      await api.createView({
        name: viewName.trim(),
        anomalyTypes,
        statusFilter,
        sortBy,
        sortOrder,
        cameraAngle,
        createdBy: currentOperator,
      });
      setShowSaveDialog(false);
      setViewName('');
      loadViews();
    } catch (e) {
      alert('保存失败：' + (e as Error).message);
    }
  };

  const handleApplyView = (v: SavedView) => {
    applyView(v);
    setShowViewList(false);
  };

  const exportUrl = api.exportAnomaliesUrl({
    types: anomalyTypes.length ? anomalyTypes : undefined,
    status: statusFilter.length ? statusFilter : undefined,
    sortBy,
    sortOrder,
  });

  const previewBatchCollisions = previewCollision
    ? collisions.filter((c) => c.batchId === previewCollision.batchId)
    : [];

  const previewBatchPoints = previewCollision ? [] : [];

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-industrial-border bg-industrial-panel/50 flex items-center gap-3 shrink-0">
        <div>
          <h1 className="font-mono text-xl font-bold flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-alert-orange" />
            异常队列
          </h1>
          <p className="text-xs text-industrial-muted mt-0.5">
            所有未处理与已处理异常集中管理 · 当前筛选条件下共 <span className="text-alert-orange font-semibold">{collisions.length}</span> 条
          </p>
        </div>

        <div className="ml-4 flex items-center gap-1 relative">
          <button
            onClick={() => {
              setShowTypeFilter(!showTypeFilter);
              setShowStatusFilter(false);
            }}
            className="industrial-btn flex items-center gap-1.5"
          >
            <Filter className="w-3.5 h-3.5" />
            异常类型
            {anomalyTypes.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-alert-orange text-white rounded-sm font-mono">
                {anomalyTypes.length}
              </span>
            )}
            <ChevronDown className="w-3 h-3" />
          </button>
          {showTypeFilter && (
            <div className="absolute top-full left-0 mt-1 z-30 industrial-panel p-2 min-w-[180px]">
              {ALL_ANOMALY_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => toggleType(t)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm hover:bg-slate-700/40 text-left"
                >
                  {anomalyTypes.includes(t) ? (
                    <Check className="w-3.5 h-3.5 text-alert-orange" />
                  ) : (
                    <span className="w-3.5 h-3.5" />
                  )}
                  {ANOMALY_TYPE_LABELS[t]}
                </button>
              ))}
              {anomalyTypes.length > 0 && (
                <>
                  <div className="border-t border-industrial-border my-1" />
                  <button
                    onClick={() => setAnomalyTypes([])}
                    className="w-full text-left px-2 py-1.5 text-xs text-industrial-muted hover:text-industrial-text"
                  >
                    清除筛选
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => {
              setShowStatusFilter(!showStatusFilter);
              setShowTypeFilter(false);
            }}
            className="industrial-btn flex items-center gap-1.5"
          >
            <Layers className="w-3.5 h-3.5" />
            判定状态
            {statusFilter.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-alert-indigo text-white rounded-sm font-mono">
                {statusFilter.length}
              </span>
            )}
            <ChevronDown className="w-3 h-3" />
          </button>
          {showStatusFilter && (
            <div className="absolute top-full left-0 mt-1 z-30 industrial-panel p-2 min-w-[160px]">
              {ALL_STATUS.map((s) => (
                <button
                  key={s}
                  onClick={() => toggleStatus(s)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm hover:bg-slate-700/40 text-left"
                >
                  {statusFilter.includes(s) ? (
                    <Check className="w-3.5 h-3.5 text-alert-indigo" />
                  ) : (
                    <span className="w-3.5 h-3.5" />
                  )}
                  {COLLISION_STATUS_LABELS[s]}
                </button>
              ))}
              {statusFilter.length > 0 && (
                <>
                  <div className="border-t border-industrial-border my-1" />
                  <button
                    onClick={() => setStatusFilter([])}
                    className="w-full text-left px-2 py-1.5 text-xs text-industrial-muted hover:text-industrial-text"
                  >
                    清除筛选
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <div className="h-5 w-px bg-industrial-border mx-1" />

        <button
          onClick={() => toggleSort('detectedAt')}
          className="industrial-btn flex items-center gap-1.5"
        >
          <ArrowUpDown className="w-3.5 h-3.5" />
          {sortBy === 'detectedAt' ? '发现时间' : '按字段'}
          {sortBy === 'detectedAt' && (
            <span className="text-[10px] font-mono text-alert-orange">
              {sortOrder === 'asc' ? '↑' : '↓'}
            </span>
          )}
        </button>

        <div className="h-5 w-px bg-industrial-border mx-1" />

        <div className="relative">
          <button
            onClick={() => setShowViewList(!showViewList)}
            className="industrial-btn flex items-center gap-1.5"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            已保存视图
            <ChevronDown className="w-3 h-3" />
          </button>
          {showViewList && (
            <div className="absolute top-full left-0 mt-1 z-30 industrial-panel p-1 min-w-[240px]">
              {savedViews.length === 0 && (
                <div className="p-3 text-xs text-industrial-muted text-center">
                  暂无已保存视图
                </div>
              )}
              {savedViews.map((v) => (
                <button
                  key={v.id}
                  onClick={() => handleApplyView(v)}
                  className="w-full flex items-start gap-2 px-3 py-2 rounded-sm text-left hover:bg-slate-700/40"
                >
                  <Eye className="w-4 h-4 text-industrial-muted mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-industrial-text font-medium">{v.name}</div>
                    <div className="text-[11px] text-industrial-muted mt-0.5">
                      {v.anomalyTypes.length} 种异常 · {v.statusFilter.length} 种状态 ·{' '}
                      {CAMERA_ANGLE_LABELS[v.cameraAngle]}
                    </div>
                    <div className="text-[10px] text-industrial-muted font-mono mt-0.5">
                      {v.createdBy} · {new Date(v.createdAt).toLocaleDateString('zh-CN')}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <button onClick={() => setShowSaveDialog(true)} className="industrial-btn flex items-center gap-1.5">
          <Save className="w-3.5 h-3.5" />
          保存当前视图
        </button>

        <div className="ml-auto flex items-center gap-2">
          <button onClick={load} className="industrial-btn">
            <RefreshCw className="w-4 h-4" />
          </button>
          <a href={exportUrl} className="industrial-btn-primary flex items-center gap-1.5">
            <Download className="w-4 h-4" />
            导出 CSV
          </a>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-auto p-4">
          {loading && (
            <div className="industrial-panel p-8 text-center text-industrial-muted">
              加载异常队列...
            </div>
          )}

          {!loading && collisions.length === 0 && (
            <div className="industrial-panel p-12 text-center text-industrial-muted">
              暂无符合条件的异常
            </div>
          )}

          {!loading && (
            <div className="grid grid-cols-4 gap-3">
              {collisions.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setPreviewCollision(c)}
                  className={
                    'industrial-panel p-3 cursor-pointer transition-all ' +
                    (previewCollision?.id === c.id
                      ? 'border-alert-orange ring-1 ring-alert-orange/30'
                      : 'hover:border-alert-orange/40')
                  }
                >
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <AnomalyTypeBadge type={c.type} />
                    <CollisionStatusBadge status={c.status} />
                  </div>
                  <div className="text-xs text-industrial-text line-clamp-2 leading-relaxed mb-2 min-h-[2rem]">
                    {c.description}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-industrial-muted font-mono">
                    <span>{c.batchId}</span>
                    <span>{new Date(c.detectedAt).toLocaleDateString('zh-CN')}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-industrial-border">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setRejudgeCollision(c);
                      }}
                      className="flex-1 industrial-btn text-xs py-1.5 flex items-center justify-center gap-1"
                    >
                      <Edit3 className="w-3 h-3" />
                      改判
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {previewCollision && (
          <div className="w-[420px] border-l border-industrial-border flex flex-col shrink-0 bg-industrial-bg/50">
            <div className="p-3 border-b border-industrial-border flex items-center justify-between">
              <span className="font-mono text-sm font-semibold">异常详情 · 预览</span>
              <button
                onClick={() => setPreviewCollision(null)}
                className="text-industrial-muted hover:text-industrial-text p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="h-[280px] shrink-0 p-3">
              <PointVisualizer
                points={previewBatchPoints}
                collisions={previewBatchCollisions}
                cameraAngle={cameraAngle}
                highlightCollisionIds={[previewCollision.id]}
              />
            </div>
            <div className="flex-1 overflow-auto p-3 space-y-3 text-sm">
              <div>
                <div className="text-industrial-muted text-xs mb-1">异常类型</div>
                <AnomalyTypeBadge type={previewCollision.type} />
              </div>
              <div>
                <div className="text-industrial-muted text-xs mb-1">当前状态</div>
                <CollisionStatusBadge status={previewCollision.status} />
              </div>
              <div>
                <div className="text-industrial-muted text-xs mb-1">描述</div>
                <div className="p-2 industrial-panel text-xs leading-relaxed">
                  {previewCollision.description}
                </div>
              </div>
              {previewCollision.rejudgedBy && (
                <div>
                  <div className="text-industrial-muted text-xs mb-1">改判记录</div>
                  <div className="p-2 industrial-panel border-l-2 border-alert-indigo text-xs">
                    <div className="font-medium mb-0.5">{previewCollision.rejudgedBy}</div>
                    <div className="text-industrial-muted text-[11px] mb-1">
                      {new Date(previewCollision.rejudgedAt!).toLocaleString('zh-CN')}
                    </div>
                    <div>{previewCollision.rejudgedReason}</div>
                  </div>
                </div>
              )}
              <div>
                <div className="text-industrial-muted text-xs mb-1">批次ID</div>
                <div className="font-mono text-xs">{previewCollision.batchId}</div>
              </div>
              <button
                onClick={() => setRejudgeCollision(previewCollision)}
                className="w-full industrial-btn-primary py-2 flex items-center justify-center gap-1.5"
              >
                <Edit3 className="w-4 h-4" />
                改判此异常
              </button>
            </div>
          </div>
        )}
      </div>

      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="industrial-panel w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-industrial-border">
              <h3 className="font-mono text-lg font-bold flex items-center gap-2">
                <Save className="w-5 h-5 text-alert-orange" />
                保存当前视图条件
              </h3>
              <button
                onClick={() => setShowSaveDialog(false)}
                className="text-industrial-muted hover:text-industrial-text p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-xs text-industrial-muted mb-1.5">视图名称</label>
                <input
                  autoFocus
                  value={viewName}
                  onChange={(e) => setViewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveView()}
                  placeholder="例如：小赵常用视图、重叠异常优先..."
                  className="industrial-input"
                />
              </div>
              <div className="industrial-panel p-3 text-xs space-y-1">
                <div className="text-industrial-muted mb-1">将保存以下条件：</div>
                <div>
                  异常类型：
                  <span className="text-industrial-text">
                    {anomalyTypes.length === 0
                      ? '全部'
                      : anomalyTypes.map((t) => ANOMALY_TYPE_LABELS[t]).join('、')}
                  </span>
                </div>
                <div>
                  判定状态：
                  <span className="text-industrial-text">
                    {statusFilter.length === 0
                      ? '全部'
                      : statusFilter.map((s) => COLLISION_STATUS_LABELS[s]).join('、')}
                  </span>
                </div>
                <div>
                  排序：<span className="text-industrial-text">{sortBy} {sortOrder}</span>
                </div>
                <div>
                  视角：<span className="text-industrial-text">{CAMERA_ANGLE_LABELS[cameraAngle]}</span>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-industrial-border">
              <button onClick={() => setShowSaveDialog(false)} className="industrial-btn">
                取消
              </button>
              <button
                onClick={handleSaveView}
                disabled={!viewName.trim()}
                className="industrial-btn-primary"
              >
                <Save className="w-4 h-4 mr-1.5 inline" />
                保存视图
              </button>
            </div>
          </div>
        </div>
      )}

      {rejudgeCollision && (
        <RejudgeModal
          collision={rejudgeCollision}
          onClose={() => setRejudgeCollision(null)}
          onRejudged={() => {
            load();
            loadViews();
          }}
        />
      )}

      {(showTypeFilter || showStatusFilter || showViewList) && (
        <div
          className="fixed inset-0 z-20"
          onClick={() => {
            setShowTypeFilter(false);
            setShowStatusFilter(false);
            setShowViewList(false);
          }}
        />
      )}
    </div>
  );
}
