import { X, Download, Trash2, CheckSquare, Square, Package, Image as ImageIcon } from 'lucide-react';
import { useReviewStore } from '../../store/reviewStore';
import { batchExportScreenshots } from '../../utils/exportUtils';
import type { ScreenshotItem } from '../../types';

interface Props {
  onClose: () => void;
}

function formatTime(t: string) {
  return new Date(t).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function ScreenshotExportModal({ onClose }: Props) {
  const screenshots = useReviewStore((s) => s.screenshots);
  const selected = useReviewStore((s) => s.selectedScreenshotIds);
  const toggleSel = useReviewStore((s) => s.toggleScreenshotSelection);
  const selectAll = useReviewStore((s) => s.selectAllScreenshots);
  const clearSel = useReviewStore((s) => s.clearScreenshotSelection);
  const removeOne = useReviewStore((s) => s.removeScreenshot);
  const clearAll = useReviewStore((s) => s.clearScreenshots);

  const toExport = screenshots.filter((s) => selected.includes(s.id));

  const doExport = () => {
    const items = toExport.length > 0 ? toExport : screenshots;
    if (items.length === 0) return;
    batchExportScreenshots(items);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="flex h-[80vh] w-[880px] max-w-[95vw] flex-col overflow-hidden rounded-lg border border-slate-700 bg-slate-950 shadow-2xl">
        <div className="flex items-center gap-2 border-b border-slate-700 bg-slate-900/80 px-4 py-3">
          <Package size={18} className="text-[#FF6B35]" />
          <h2 className="text-sm font-bold text-slate-100">截图清单 · 批量导出</h2>
          <span className="ml-2 rounded bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-slate-400">
            {screenshots.length} 张截图
          </span>
          <button
            onClick={onClose}
            className="ml-auto rounded p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-900/40 px-4 py-2">
          <button
            onClick={() => (selected.length === screenshots.length ? clearSel() : selectAll())}
            className="flex items-center gap-1 rounded px-2 py-1 text-[10px] text-slate-300 transition-colors hover:bg-slate-800"
          >
            {selected.length === screenshots.length ? <CheckSquare size={12} /> : <Square size={12} />}
            全选
          </button>
          <span className="text-[10px] text-slate-500">
            已选 {selected.length} / {screenshots.length}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => {
                if (confirm('清空所有截图？')) clearAll();
              }}
              disabled={screenshots.length === 0}
              className="flex items-center gap-1 rounded border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-[10px] text-rose-400 transition-colors hover:bg-rose-500/20 disabled:opacity-40"
            >
              <Trash2 size={11} /> 清空
            </button>
            <button
              onClick={doExport}
              disabled={screenshots.length === 0}
              className="flex items-center gap-1.5 rounded bg-gradient-to-r from-[#FF6B35] to-[#FF8A4C] px-3 py-1.5 text-[11px] font-bold text-slate-900 shadow-[0_0_12px_rgba(255,107,53,0.4)] transition-all hover:shadow-[0_0_16px_rgba(255,107,53,0.6)] disabled:opacity-40"
            >
              <Download size={13} />
              批量导出 PNG + JSON
              {toExport.length > 0 && (
                <span className="ml-1 rounded-sm bg-black/20 px-1.5 py-0.5 text-[10px]">
                  {toExport.length} 张
                </span>
              )}
            </button>
          </div>
        </div>

        {screenshots.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center">
            <ImageIcon size={48} className="mb-3 text-slate-700" />
            <p className="text-sm text-slate-400">暂未截图</p>
            <p className="text-xs text-slate-500">在工具栏点击「快速截图」或「导出截图」添加</p>
          </div>
        ) : (
          <div className="grid flex-1 grid-cols-[280px_1fr] gap-0 overflow-hidden">
            <div className="overflow-y-auto border-r border-slate-800 p-2">
              <div className="grid grid-cols-2 gap-1.5">
                {screenshots.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => toggleSel(s.id)}
                    className={`group relative overflow-hidden rounded border transition-all ${
                      selected.includes(s.id)
                        ? 'border-[#00D4AA] ring-2 ring-[#00D4AA]/30'
                        : 'border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <img src={s.dataUrl} alt={s.name} className="aspect-square w-full object-cover" />
                    <div className="absolute left-1 top-1">
                      {selected.includes(s.id) ? (
                        <CheckSquare size={14} className="text-[#00D4AA]" />
                      ) : (
                        <Square size={14} className="text-white/50" />
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeOne(s.id);
                      }}
                      className="absolute right-1 top-1 rounded bg-black/60 p-0.5 text-white/70 opacity-0 transition-all hover:bg-rose-500/60 hover:text-white group-hover:opacity-100"
                    >
                      <X size={10} />
                    </button>
                    <p className="truncate bg-black/60 px-1 py-0.5 text-[9px] font-mono text-slate-300">
                      {s.viewpointName || '截图'}
                    </p>
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-y-auto p-3">
              <table className="w-full text-left text-[10px]">
                <thead className="sticky top-0 bg-slate-900/90 backdrop-blur">
                  <tr className="border-b border-slate-700 text-slate-400">
                    <th className="px-2 py-1.5 font-medium">截图名</th>
                    <th className="px-2 py-1.5 font-medium">视角</th>
                    <th className="px-2 py-1.5 font-medium">时刻</th>
                    <th className="px-2 py-1.5 font-medium">来源 · 行号</th>
                    <th className="px-2 py-1.5 font-medium">坐标系</th>
                    <th className="px-2 py-1.5 font-medium">温度</th>
                    <th className="px-2 py-1.5 font-medium">流速</th>
                    <th className="px-2 py-1.5 font-medium">版本</th>
                    <th className="px-2 py-1.5 font-medium">时间</th>
                  </tr>
                </thead>
                <tbody>
                  {(selected.length > 0 ? screenshots.filter((s) => selected.includes(s.id)) : screenshots).map(
                    (s: ScreenshotItem) => (
                      <tr key={s.id} className="border-b border-slate-800/60 hover:bg-slate-900/40">
                        <td className="px-2 py-1.5 font-mono text-slate-300">{s.name}</td>
                        <td className="px-2 py-1.5 text-[#00D4AA]">{s.viewpointName || '—'}</td>
                        <td className="px-2 py-1.5 font-mono text-[#FFD93D]">
                          {s.timeParam.slice(5, 16)}
                        </td>
                        <td className="px-2 py-1.5 font-mono text-slate-400">
                          {s.metadata.sourceFile}
                          <span className="text-[#00D4AA]">#L{s.metadata.sourceLine}</span>
                        </td>
                        <td className="px-2 py-1.5">
                          <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[9px] text-slate-300">
                            {s.metadata.coordinateSystem}
                          </span>
                        </td>
                        <td className="px-2 py-1.5 font-mono text-[#FF6B35]">
                          {s.metadata.temperature.toFixed(0)}℃
                        </td>
                        <td className="px-2 py-1.5 font-mono text-[#00D4AA]">
                          {s.metadata.flowRate.toFixed(2)}
                        </td>
                        <td className="px-2 py-1.5 font-mono text-[#FFD93D]">{s.metadata.version}</td>
                        <td className="px-2 py-1.5 font-mono text-slate-500">{formatTime(s.createdAt)}</td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
