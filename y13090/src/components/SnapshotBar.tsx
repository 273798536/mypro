import { Camera, Save, Trash2, Clock, Undo2, AlertCircle, Loader2, X } from 'lucide-react';
import { useReviewStore } from '@/store/reviewStore';
import { useRef, useState } from 'react';
import { clsx } from 'clsx';
import type { RefObject } from 'react';
import type { Scene3DHandle } from './Scene3D';

interface SnapshotBarProps {
  sceneRef: RefObject<Scene3DHandle>;
}

export function SnapshotBar({ sceneRef }: SnapshotBarProps) {
  const {
    snapshots,
    saveSnapshot,
    deleteSnapshot,
    restoreSnapshot,
    isScreenshotMode,
    toggleScreenshotMode,
    setSnapshotStatus,
    snapshotStatus,
    cameraState,
    filters,
  } = useReviewStore();
  const [snapName, setSnapName] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const error = snapshotStatus.error || localError;
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    const name = snapName.trim() || `快照 ${new Date().toLocaleTimeString('zh-CN', { hour12: false })}`;

    setIsSaving(true);
    setLocalError(null);
    setSnapshotStatus({ isSaving: true, error: null });

    try {
      console.log('[SnapshotBar] handleSave start', {
        hasSceneRef: !!sceneRef.current,
        hasTakeScreenshot: typeof sceneRef.current?.takeScreenshot === 'function',
        name,
      });
      let screenshotDataUrl: string | undefined;
      if (sceneRef.current?.takeScreenshot) {
        screenshotDataUrl = await sceneRef.current.takeScreenshot();
      } else {
        throw new Error('3D 场景未就绪，无法截图（Scene3DHandle 为空）');
      }

      if (screenshotsExceedQuota(screenshotDataUrl)) {
        throw new Error('截图数据过大，存储空间不足，请减少同时保存的快照数量后重试');
      }

      console.log('[SnapshotBar] saveSnapshot call', {
        screenshotDataUrlLen: screenshotDataUrl.length,
        filters: filters,
      });
      saveSnapshot(name, screenshotDataUrl);
      setSnapName('');
      setShowInput(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '截图失败';
      console.error('[SnapshotBar] handleSave error', err);
      setLocalError(msg);
      setSnapshotStatus({ isSaving: false, error: msg });
    } finally {
      setIsSaving(false);
    }
  };

  const activeFiltersCount = [
    filters.area,
    filters.materialType,
    filters.showOnlyAnomaly,
  ].filter(Boolean).length;

  return (
    <div className="bg-steel-800/60 backdrop-blur border border-steel-700 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-steel-700 flex items-center gap-2">
        <Camera className="w-4 h-4 text-industrial-400" />
        <h3 className="text-sm font-semibold text-steel-200 tracking-wide">视图快照</h3>
        <span className="text-[10px] text-steel-500 px-1.5 py-0.5 rounded bg-steel-700/50 font-mono">
          视角 + 筛选条件 + 截图 一起保存
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={toggleScreenshotMode}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs rounded transition-all',
              isScreenshotMode
                ? 'bg-warning-500 text-steel-900 font-semibold'
                : 'bg-steel-700/60 text-steel-300 hover:bg-steel-700',
            )}
          >
            <Camera className="w-3.5 h-3.5" />
            {isScreenshotMode ? '截图中' : '换视角截图'}
          </button>

          {!showInput ? (
            <button
              onClick={() => {
                setShowInput(true);
                setLocalError(null);
                setSnapshotStatus({ error: null });
                setTimeout(() => inputRef.current?.focus(), 50);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded bg-industrial-600 text-white hover:bg-industrial-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSaving}
            >
              <Save className="w-3.5 h-3.5" />
              保存快照
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <input
                ref={inputRef}
                type="text"
                value={snapName}
                onChange={(e) => setSnapName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isSaving) {
                    void handleSave();
                  }
                  if (e.key === 'Escape') {
                    setShowInput(false);
                    setSnapName('');
                    setLocalError(null);
                  }
                }}
                placeholder="快照名称（回车保存）"
                className="bg-steel-900 border border-steel-600 rounded px-2 py-1.5 text-xs text-steel-200 placeholder-steel-600 focus:outline-none focus:border-industrial-500 w-48"
                disabled={isSaving}
              />
              <button
                onClick={() => void handleSave()}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded bg-industrial-600 text-white hover:bg-industrial-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Save className="w-3 h-3" />
                )}
              </button>
              <button
                onClick={() => {
                  setShowInput(false);
                  setSnapName('');
                  setLocalError(null);
                }}
                className="px-2.5 py-1.5 text-xs rounded bg-steel-700 text-steel-400 hover:bg-steel-600 transition-colors disabled:opacity-50"
                disabled={isSaving}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      {(error || isSaving) && (
        <div
          className={clsx(
            'px-4 py-2 border-b border-steel-700 flex items-center gap-2 text-xs',
            error ? 'bg-danger-500/10 text-danger-300' : 'bg-industrial-600/10 text-industrial-300',
          )}
        >
          {error ? (
            <>
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="flex-1">{error}</span>
              <button
                onClick={() => {
                  setLocalError(null);
                  setSnapshotStatus({ error: null });
                }}
                className="text-steel-400 hover:text-steel-200 transition-colors"
                aria-label="关闭提示"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <>
              <Loader2 className="w-3.5 h-3.5 flex-shrink-0 animate-spin" />
              <span>正在截图并保存快照…</span>
            </>
          )}
        </div>
      )}

      <div className="px-4 py-3">
        <div className="text-[10px] text-steel-500 mb-2 flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          已保存 {snapshots.length} 个快照 · 点击一键复原当时视角与筛选条件
          {activeFiltersCount > 0 && (
            <span className="ml-auto text-industrial-400">
              当前激活 {activeFiltersCount} 个筛选条件 · pos [{cameraState.position.map((v) => v.toFixed(0)).join(',')}]
            </span>
          )}
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {snapshots.map((s) => (
            <div
              key={s.id}
              className="group flex-shrink-0 w-44 text-left rounded-lg border border-steel-700 bg-steel-900/60 hover:border-industrial-500 hover:bg-industrial-600/10 transition-all"
            >
              <button
                onClick={() => restoreSnapshot(s.id)}
                className="w-full text-left"
                title="点击恢复此快照"
              >
                <div className="h-20 bg-gradient-to-br from-industrial-900/40 via-steel-800 to-steel-900 rounded-t-lg relative overflow-hidden">
                  {s.screenshotDataUrl ? (
                    <img
                      src={s.screenshotDataUrl}
                      alt={s.name}
                      className="absolute inset-0 w-full h-full object-cover"
                      draggable={false}
                    />
                  ) : (
                    <div className="absolute inset-0 bg-grid-pattern bg-grid-20 opacity-20" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-steel-900/70 via-transparent to-transparent" />
                  <div className="absolute bottom-1.5 right-1.5 text-[9px] font-mono text-steel-100 bg-steel-900/80 px-1.5 py-0.5 rounded backdrop-blur">
                    fov {s.cameraState.fov}°
                  </div>
                  <Undo2
                    className={clsx(
                      'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 transition-colors opacity-0 group-hover:opacity-100',
                      s.screenshotDataUrl ? 'text-white drop-shadow' : 'text-steel-500 group-hover:text-industrial-400',
                    )}
                  />
                </div>
                <div className="p-2">
                  <div className="text-xs text-steel-200 font-medium truncate group-hover:text-industrial-300 transition-colors">
                    {s.name}
                  </div>
                  <div className="text-[10px] text-steel-500 font-mono mt-0.5 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {s.timestamp}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {s.filterConditions.area && (
                      <div className="text-[9px] text-industrial-400 bg-industrial-600/10 px-1.5 py-0.5 rounded inline-block">
                        {s.filterConditions.area}
                      </div>
                    )}
                    {s.filterConditions.showOnlyAnomaly && (
                      <div className="text-[9px] text-warning-400 bg-warning-500/10 px-1.5 py-0.5 rounded inline-block">
                        仅异常
                      </div>
                    )}
                    {s.screenshotDataUrl ? (
                      <div className="text-[9px] text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded inline-block">
                        含截图
                      </div>
                    ) : (
                      <div className="text-[9px] text-steel-500 bg-steel-700/50 px-1.5 py-0.5 rounded inline-block">
                        无截图
                      </div>
                    )}
                  </div>
                </div>
              </button>
              <div className="px-2 pb-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSnapshot(s.id);
                  }}
                  className="w-full flex items-center justify-center gap-1 px-2 py-1 text-[10px] rounded border border-steel-700 text-steel-400 hover:border-danger-500 hover:text-danger-400 hover:bg-danger-500/10 transition-colors"
                  title="删除此快照"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function screenshotsExceedQuota(screenshot: string | undefined): boolean {
  if (!screenshot) return false;
  try {
    const approxBytes = screenshot.length * 0.75;
    return approxBytes > 5 * 1024 * 1024;
  } catch {
    return false;
  }
}
