import { X, FileText, Sliders, Music, Clock, Folder, User } from 'lucide-react';
import { useReviewStore } from '../store/reviewStore';
import {
  VOICE_LABELS,
  SEVERITY_LABELS,
  SEVERITY_COLORS,
} from '../types';
import { formatSeconds } from '../data/mockData';

export default function DetailDrawer() {
  const drawerOpen = useReviewStore((s) => s.drawerOpen);
  const drawerContent = useReviewStore((s) => s.drawerContent);
  const selectedExceptionId = useReviewStore((s) => s.selectedExceptionId);
  const closeDrawer = useReviewStore((s) => s.closeDrawer);
  const getExceptionById = useReviewStore((s) => s.getExceptionById);
  const getActiveBatch = useReviewStore((s) => s.getActiveBatch);
  const getActiveSong = useReviewStore((s) => s.getActiveSong);
  const resolveException = useReviewStore((s) => s.resolveException);

  if (!drawerOpen) return null;

  const batch = getActiveBatch();
  const song = getActiveSong();
  const exception = selectedExceptionId ? getExceptionById(selectedExceptionId) : null;

  let title = '详情';
  let icon = FileText;
  let content: React.ReactNode = null;

  if (drawerContent === 'exception' && exception) {
    title = '异常详情回溯';
    icon = Music;
    const voiceType = song?.voiceTracks.find(
      (v) => v.id === exception.voiceTrackId
    )?.voiceType;
    content = (
      <div className="space-y-5">
        <div
          className={`tag ${SEVERITY_COLORS[exception.severity]} w-fit text-[11px] py-1 px-3`}
        >
          {SEVERITY_LABELS[exception.severity]}异常
          {exception.resolved && ' · 已处理'}
        </div>

        <div>
          <p className="text-[11px] text-ink-500 uppercase tracking-wider mb-2">
            人话描述 · 给发行同事看的
          </p>
          <blockquote className="border-l-4 border-copper-400 pl-4 py-1 bg-copper-50/60 rounded-r-lg">
            <span className="font-serif text-ink-800 leading-relaxed text-sm">
              "{exception.humanReason}"
            </span>
          </blockquote>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-ink-50/80 space-y-1">
            <p className="text-ink-500 flex items-center gap-1">
              <Music size={12} /> 声部
            </p>
            <p className="font-medium text-ink-900">
              {voiceType ? VOICE_LABELS[voiceType] : '-'}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-ink-50/80 space-y-1">
            <p className="text-ink-500 flex items-center gap-1">
              <Clock size={12} /> 时间位置
            </p>
            <p className="font-medium text-ink-900">
              {formatSeconds(exception.timePosition)}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-ink-50/80 space-y-1">
            <p className="text-ink-500">指标</p>
            <p className="font-medium text-ink-900">
              {exception.metric} {exception.deviation}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-ink-50/80 space-y-1">
            <p className="text-ink-500 flex items-center gap-1">
              <User size={12} /> 可能原因
            </p>
            <p className="font-medium text-ink-900 text-[11px] leading-relaxed">
              {exception.possibleCause}
            </p>
          </div>
        </div>

        <div>
          <p className="text-[11px] text-ink-500 uppercase tracking-wider mb-2">
            📁 回到音频文件夹位置
          </p>
          <button className="w-full p-3 rounded-xl border border-dashed border-copper-300 bg-copper-50/40 text-left hover:bg-copper-50 transition-all group">
            <div className="flex items-start gap-2">
              <Folder size={16} className="text-copper-500 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-ink-800 truncate">
                  {exception.relatedFilePath}
                </p>
                <p className="text-[10px] text-copper-600 mt-1 group-hover:underline">
                  点击在文件夹中定位 →
                </p>
              </div>
            </div>
          </button>
        </div>

        {batch && (
          <div>
            <p className="text-[11px] text-ink-500 uppercase tracking-wider mb-2">
              📐 本次计算口径
            </p>
            <div className="p-3 rounded-xl bg-forest-50/60 border border-forest-100 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-ink-500">算法版本</span>
                <span className="font-medium text-forest-700">
                  {batch.calcCriteria.algorithmVersion}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-500">能量阈值</span>
                <span className="font-medium text-ink-800">
                  {batch.calcCriteria.energyThreshold.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-500">频率容差</span>
                <span className="font-medium text-ink-800">
                  {batch.calcCriteria.frequencyDeviation}音分
                </span>
              </div>
              <div className="pt-2 border-t border-forest-100/60">
                <p className="text-ink-500 mb-1">与上版差异</p>
                <p className="text-ink-800 leading-relaxed text-[11px]">
                  {batch.calcCriteria.diffFromPrevious}
                </p>
              </div>
            </div>
          </div>
        )}

        <div>
          <p className="text-[11px] text-ink-500 uppercase tracking-wider mb-2">
            📎 参考版本
          </p>
          <div className="p-3 rounded-xl bg-ink-50 border border-ink-100 text-xs">
            <p className="font-medium text-ink-800">{exception.referenceVersion}</p>
            <p className="text-[10px] text-ink-500 mt-1">
              对比基准线日期：{batch?.calcCriteria.baselineDate}
            </p>
          </div>
        </div>

        {!exception.resolved && (
          <button
            onClick={() => resolveException(exception.id)}
            className="btn-primary w-full"
          >
            ✓ 标记此异常已处理
          </button>
        )}
      </div>
    );
  } else if (drawerContent === 'criteria' && batch) {
    title = '计算口径说明';
    icon = Sliders;
    content = (
      <div className="space-y-5 text-sm">
        <p className="text-ink-600 leading-relaxed">
          计算口径是复核的标尺。每次复核的阈值、算法、基准线都记录在此，
          确保"为什么算成异常"有据可查。
        </p>
        <div className="space-y-3">
          {Object.entries({
            算法版本: batch.calcCriteria.algorithmVersion,
            能量阈值: batch.calcCriteria.energyThreshold.toFixed(2),
            频率容差: batch.calcCriteria.frequencyDeviation + ' 音分',
            基准线日期: batch.calcCriteria.baselineDate,
          }).map(([k, v]) => (
            <div key={k} className="flex justify-between items-center p-3 rounded-xl bg-ink-50 border border-ink-100">
              <span className="text-ink-500 text-xs">{k}</span>
              <span className="font-medium text-ink-900 text-sm">{v}</span>
            </div>
          ))}
        </div>
        <div className="p-4 rounded-xl bg-copper-50/70 border border-copper-100">
          <p className="text-[11px] text-copper-700 font-medium mb-1">与上版口径差异</p>
          <p className="text-sm text-ink-800 leading-relaxed">
            {batch.calcCriteria.diffFromPrevious}
          </p>
        </div>
      </div>
    );
  } else if (drawerContent === 'file' && song) {
    title = '版本历史留痕';
    icon = Clock;
    content = (
      <div className="space-y-0 relative">
        <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-forest-300 via-forest-200 to-ink-100" />
        {song.history.map((h, idx) => {
          const typeIcons: Record<string, string> = {
            upload: '🎙️',
            note_added: '📌',
            screenshot_added: '📷',
            review_marker: '🔍',
            name_change: '✏️',
          };
          return (
            <div key={h.id} className="relative pl-12 pb-6 last:pb-0">
              <div
                className={`absolute left-0 top-0 w-8 h-8 rounded-full flex items-center justify-center text-base ${
                  idx === 0
                    ? 'bg-forest-500 text-white shadow-md'
                    : 'bg-white border-2 border-forest-200'
                }`}
              >
                {typeIcons[h.type] ?? '📝'}
              </div>
              <div className="pt-0.5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-ink-900">{h.description}</p>
                </div>
                <p className="text-[11px] text-ink-500 mt-0.5">
                  {h.operator} · {h.timestamp}
                </p>
                {h.noteContent && (
                  <div className="mt-2 p-3 rounded-xl bg-ink-50 border border-ink-100 text-xs text-ink-800 leading-relaxed">
                    {h.noteContent}
                  </div>
                )}
                {h.screenshotUrl && (
                  <div className="mt-2">
                    <img
                      src={h.screenshotUrl}
                      alt="历史截图"
                      className="w-full rounded-xl border border-ink-100 shadow-sm hover:shadow-md transition-all cursor-zoom-in"
                    />
                    <p className="text-[10px] text-ink-500 mt-1">
                      {h.description}（点击可放大对比）
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  const Icon = icon;

  return (
    <aside
      className={`fixed top-0 right-0 w-[380px] h-screen bg-white/95 backdrop-blur-xl border-l border-ink-100 shadow-2xl z-30 flex flex-col animate-slideInRight ${
        drawerOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <header className="h-16 shrink-0 border-b border-ink-100 flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <Icon size={18} className="text-forest-500" />
          <h3 className="font-serif font-bold text-ink-900">{title}</h3>
        </div>
        <button
          onClick={closeDrawer}
          className="w-8 h-8 rounded-lg hover:bg-ink-50 flex items-center justify-center text-ink-500 hover:text-ink-900 transition-all"
          aria-label="关闭"
        >
          <X size={16} />
        </button>
      </header>
      <div className="flex-1 overflow-y-auto p-6">
        {content ?? (
          <p className="text-center text-ink-500 text-sm py-12">暂无详情内容</p>
        )}
      </div>
    </aside>
  );
}
