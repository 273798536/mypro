import { useEffect, useState } from 'react';
import {
  X,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Link2,
  FileSearch,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react';
import { useMainStore } from '@/store/useMainStore';

export default function PhotoAnnotation() {
  const {
    showAnnotation,
    toggleAnnotation,
    photos,
    annotationPhotoId,
    annotationStepId,
    chainA,
    chainB,
    activeGroup,
  } = useMainStore();

  const chain = activeGroup === 'A' ? chainA : chainB;

  const [idx, setIdx] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [activeAnnId, setActiveAnnId] = useState<string | undefined>();

  const extractStepIndex = (id?: string): number | null => {
    if (!id) return null;
    const m = id.match(/step[-_](\d+)/);
    return m ? parseInt(m[1], 10) : null;
  };

  const findStep = (stepIdOrIdx?: string | number) => {
    if (stepIdOrIdx == null) return null;
    let targetIdx: number | null;
    if (typeof stepIdOrIdx === 'number') {
      targetIdx = stepIdOrIdx;
    } else {
      targetIdx = extractStepIndex(stepIdOrIdx);
    }
    if (targetIdx == null) return null;
    return chain.find((s) => s.index === targetIdx) ?? null;
  };

  useEffect(() => {
    if (showAnnotation && annotationPhotoId) {
      const i = photos.findIndex((p) => p.id === annotationPhotoId);
      if (i >= 0) setIdx(i);
    }
  }, [annotationPhotoId, showAnnotation, photos]);

  useEffect(() => {
    if (showAnnotation && annotationStepId) {
      const targetIdx = extractStepIndex(annotationStepId);
      const match = photos.find((p) =>
        p.annotations.some((a) => {
          const annIdx = extractStepIndex(a.stepId);
          return annIdx != null && targetIdx != null && annIdx === targetIdx;
        })
      );
      if (match) {
        const i = photos.indexOf(match);
        setIdx(i);
        const ann = match.annotations.find((a) => {
          const annIdx = extractStepIndex(a.stepId);
          return annIdx != null && targetIdx != null && annIdx === targetIdx;
        });
        setActiveAnnId(ann?.id);
      }
    }
  }, [annotationStepId, showAnnotation, photos]);

  useEffect(() => {
    if (!showAnnotation) {
      setZoom(1);
      setActiveAnnId(undefined);
    }
  }, [showAnnotation]);

  const photo = photos[idx];

  const stepTitleForAnn = (stepId?: string) => {
    const s = findStep(stepId);
    return s
      ? `S${s.index.toString().padStart(2, '0')} · ${s.title}`
      : '（未关联链路步骤）';
  };

  const scrollToStep = (stepId?: string) => {
    const s = findStep(stepId);
    if (!s) return;
    const el = document.getElementById(`step-card-${s.index}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-neon-magenta/60');
      setTimeout(() => el.classList.remove('ring-2', 'ring-neon-magenta/60'), 2500);
    }
    toggleAnnotation();
  };

  if (!showAnnotation) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/70 backdrop-blur-sm animate-slide-down"
      onClick={(e) => {
        if (e.target === e.currentTarget) toggleAnnotation();
      }}
    >
      <div className="w-full max-w-6xl max-h-[92vh] rounded-2xl overflow-hidden glass-card flex flex-col md:flex-row">
        {/* 左：照片 + 标注框 */}
        <div className="md:w-[60%] flex flex-col bg-abyss-900/60 border-b md:border-b-0 md:border-r border-neon-cyan/15">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-neon-cyan/15 flex-wrap gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <ImageIcon className="w-4 h-4 text-neon-cyan" />
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-100 truncate max-w-[280px]">
                  {photo?.caption ?? '现场照片'}
                </div>
                <div className="text-[11px] text-slate-500 tabular-nums">
                  {photo?.takenAt} · {idx + 1} / {photos.length}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setZoom((z) => Math.max(0.6, z - 0.1))}
                className="p-1.5 rounded-md border border-neon-cyan/20 text-slate-300 hover:text-neon-cyan hover:border-neon-cyan/50 transition"
                title="缩小"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs text-slate-400 w-10 text-center tabular-nums">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom((z) => Math.min(2.2, z + 0.1))}
                className="p-1.5 rounded-md border border-neon-cyan/20 text-slate-300 hover:text-neon-cyan hover:border-neon-cyan/50 transition"
                title="放大"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoom(1)}
                className="p-1.5 rounded-md border border-neon-cyan/20 text-slate-300 hover:text-neon-cyan hover:border-neon-cyan/50 transition"
                title="原尺寸"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <div className="w-px h-5 bg-neon-cyan/20 mx-1" />
              <button
                onClick={() => setIdx((i) => Math.max(0, i - 1))}
                disabled={idx === 0}
                className="p-1.5 rounded-md border border-neon-cyan/20 text-slate-300 hover:text-neon-cyan hover:border-neon-cyan/50 disabled:opacity-30 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIdx((i) => Math.min(photos.length - 1, i + 1))}
                disabled={idx === photos.length - 1}
                className="p-1.5 rounded-md border border-neon-cyan/20 text-slate-300 hover:text-neon-cyan hover:border-neon-cyan/50 disabled:opacity-30 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <div className="w-px h-5 bg-neon-cyan/20 mx-1" />
              <button
                onClick={() => toggleAnnotation()}
                className="p-1.5 rounded-md border border-slate-500/30 text-slate-400 hover:text-white hover:border-slate-300 transition"
                title="关闭"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto flex items-center justify-center p-4">
            <div
              className="relative transition-transform duration-300 shadow-glass rounded-xl overflow-hidden"
              style={{ transform: `scale(${zoom})` }}
            >
              {photo?.url ? (
                <img
                  src={photo.url}
                  alt={photo.caption}
                  className="max-h-[60vh] w-auto object-contain bg-abyss-800 rounded-xl"
                />
              ) : (
                <div className="w-[480px] h-[320px] rounded-xl bg-abyss-700 border border-dashed border-slate-500 flex items-center justify-center text-slate-500">
                  <ImageIcon className="w-12 h-12 mr-2" />
                  等待放样例…
                </div>
              )}

              {/* 标注框 */}
              {photo?.annotations.map((a) => {
                const active = activeAnnId === a.id;
                return (
                  <button
                    key={a.id}
                    onClick={() => setActiveAnnId(a.id)}
                    className={`absolute transition-all
                      ${active
                        ? 'border-neon-magenta shadow-neon-magenta animate-pulse-edge'
                        : 'border-neon-cyan/80 hover:border-neon-cyan hover:shadow-neon-cyan'}
                    `}
                    style={{
                      left: `${a.bbox[0] * 100}%`,
                      top: `${a.bbox[1] * 100}%`,
                      width: `${a.bbox[2] * 100}%`,
                      height: `${a.bbox[3] * 100}%`,
                      borderWidth: 2,
                      borderRadius: 8,
                      background: active
                        ? 'rgba(255,45,135,0.08)'
                        : 'rgba(0,229,255,0.05)',
                    }}
                  >
                    <span
                      className={`absolute -top-2.5 -left-2.5 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-mono font-semibold border-2 border-abyss-900
                        ${active ? 'bg-neon-magenta text-white' : 'bg-neon-cyan text-abyss-900'}
                      `}
                    >
                      {photo.annotations.indexOf(a) + 1}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 右：标注列表 + 原始说法追溯 */}
        <div className="md:w-[40%] flex flex-col overflow-hidden">
          <div className="px-4 py-2.5 border-b border-neon-cyan/15 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSearch className="w-4 h-4 text-neon-amber" />
              <h3 className="text-sm font-semibold text-slate-100">
                截图说明 · 原始说法追溯
              </h3>
            </div>
            <span className="text-[11px] text-slate-500">
              {photo?.annotations.length ?? 0} 条
            </span>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
            {!photo || photo.annotations.length === 0 ? (
              <div className="text-center text-xs text-slate-500 py-8">
                该照片暂无截图说明，放样例后自动载入
              </div>
            ) : (
              photo.annotations.map((a, k) => {
                const active = activeAnnId === a.id || (!activeAnnId && k === 0);
                const stepTitle = stepTitleForAnn(a.stepId);
                return (
                  <div
                    key={a.id}
                    onClick={() => setActiveAnnId(a.id)}
                    className={`rounded-xl p-3 border cursor-pointer transition-all
                      ${active
                        ? 'bg-neon-magenta/[0.07] border-neon-magenta/50 shadow-neon-magenta'
                        : 'bg-abyss-800/40 border-neon-cyan/10 hover:border-neon-cyan/35'}
                    `}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-mono font-semibold
                        ${active ? 'bg-neon-magenta text-white' : 'bg-neon-cyan text-abyss-900'}`}>
                        {k + 1}
                      </span>
                      <span className="text-xs font-semibold text-slate-200 flex-1 truncate">
                        {stepTitle}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          scrollToStep(a.stepId);
                        }}
                        className="chip bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/30 hover:bg-neon-cyan/25 transition"
                        title="跳回链路该步骤"
                      >
                        <Link2 className="w-3 h-3" /> 跳转链路
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      <div className="rounded-lg p-2.5 bg-abyss-900/70 border border-neon-cyan/15">
                        <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">
                          📷 现场原始说法（照片读出来的）
                        </div>
                        <div className="text-sm text-slate-200 leading-relaxed">
                          {a.originalReading}
                        </div>
                      </div>
                      <div className="rounded-lg p-2.5 bg-abyss-900/70 border border-neon-amber/25">
                        <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">
                          📝 处理结果说明（老唐的复核结论）
                        </div>
                        <div className="text-sm text-slate-200 leading-relaxed">
                          {a.processedNote}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* 底部：交接说明 */}
          <div className="px-4 py-2.5 border-t border-neon-cyan/15 text-[11px] text-slate-400 bg-abyss-900/50">
            <span className="text-neon-amber">老唐交接方式：</span>
            点击照片上的标注框 → 右边看到原始说法 → 点「跳转链路」回到对应步骤 → 核对透明链路中的单位换算/数量级变化。
          </div>
        </div>
      </div>
    </div>
  );
}
