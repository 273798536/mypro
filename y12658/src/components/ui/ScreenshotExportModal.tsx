import { X, Download, CheckCircle2, AlertTriangle, Camera } from 'lucide-react';
import { useState } from 'react';
import { useExportStore } from '@/store/useExportStore';
import { useViewStore } from '@/store/useViewStore';
import { useDataStore } from '@/store/useDataStore';
import type { Resolution, ExportChecklist } from '@/types';
import {
  RESOLUTION_MAP,
  downloadDataUrl,
  drawWatermark,
  drawColorLegend,
} from '@/utils/screenshot';

export default function ScreenshotExportModal() {
  const show = useExportStore((s) => s.showExportModal);
  const close = useExportStore((s) => s.closeExportModal);
  const pendingUrl = useExportStore((s) => s.pendingScreenshotDataUrl);
  const commit = useExportStore((s) => s.commitExport);
  const viewpoints = useViewStore((s) => s.viewpoints);
  const activeViewpointId = useViewStore((s) => s.activeViewpointId);
  const records = useDataStore((s) => s.records);
  const range = useDataStore((s) => s.valueRange);
  const selectedBatchId = useDataStore((s) => s.selectedBatchId);

  const [filename, setFilename] = useState(`ocean-eddy-${Date.now()}`);
  const [viewpointId, setViewpointId] = useState<string | undefined>(activeViewpointId ?? undefined);
  const [hasLegend, setHasLegend] = useState(true);
  const [hasWatermark, setHasWatermark] = useState(true);
  const [resolution, setResolution] = useState<Resolution>('1080p');

  if (!show || !pendingUrl) return null;

  const checklist: ExportChecklist = {
    viewpoint: !!viewpointId,
    legend: hasLegend,
    outOfBounds: records.some((r) => r.abnormalFlags.some((f) => f.type === 'OUT_OF_BOUNDS' && !f.resolved)),
  };

  const buildFinalDataUrl = async (): Promise<string> => {
    const { w, h } = RESOLUTION_MAP[resolution];
    const img = new Image();
    img.src = pendingUrl;
    await new Promise((res) => (img.onload = res));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#0A1628';
    ctx.fillRect(0, 0, w, h);
    const srcRatio = img.width / img.height;
    const dstRatio = w / h;
    let dw = w, dh = h, dx = 0, dy = 0;
    if (srcRatio > dstRatio) {
      dh = w / srcRatio;
      dy = (h - dh) / 2;
    } else {
      dw = h * srcRatio;
      dx = (w - dw) / 2;
    }
    ctx.drawImage(img, dx, dy, dw, dh);
    if (hasLegend) {
      drawColorLegend(ctx, w - 96, Math.floor(h / 2) - 120, 18, 240, range.min, range.max);
    }
    if (hasWatermark) {
      const vp = viewpoints.find((v) => v.id === viewpointId);
      await drawWatermark(ctx, w, h, {
        viewpoint: vp?.name ?? '自由视角',
        timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
        batch: selectedBatchId ?? '-',
      });
    }
    return canvas.toDataURL('image/png');
  };

  const handleExport = async () => {
    const dataUrl = await buildFinalDataUrl();
    commit({
      filename: filename.endsWith('.png') ? filename : `${filename}.png`,
      viewpointId,
      hasLegend,
      hasWatermark,
      resolution,
      checklist,
      dataUrl,
    });
    downloadDataUrl(dataUrl, filename.endsWith('.png') ? filename : `${filename}.png`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="panel-ocean w-[680px] max-h-[85vh] overflow-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-ocean-700">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-data-cyan" />
            <span className="text-sm font-semibold text-slate-200">截图导出配置</span>
          </div>
          <button className="p-1 text-slate-400 hover:text-slate-200" onClick={close}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 grid grid-cols-2 gap-4">
          <div className="col-span-2 flex items-start gap-3">
            <img src={pendingUrl} className="w-48 h-28 object-cover rounded border border-ocean-700 bg-ocean-950" />
            <div className="flex-1 space-y-1.5">
              <label className="block">
                <span className="text-[11px] text-slate-400">文件名</span>
                <input
                  className="w-full mt-0.5 bg-ocean-800 border border-ocean-600 rounded px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-data-cyan"
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                />
              </label>
              <label className="block">
                <span className="text-[11px] text-slate-400">关联视角</span>
                <select
                  className="w-full mt-0.5 bg-ocean-800 border border-ocean-600 rounded px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-data-cyan"
                  value={viewpointId ?? ''}
                  onChange={(e) => setViewpointId(e.target.value || undefined)}
                >
                  <option value="">（不关联）</option>
                  {viewpoints.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-[11px] text-slate-400">分辨率</span>
                <select
                  className="w-full mt-0.5 bg-ocean-800 border border-ocean-600 rounded px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-data-cyan"
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value as Resolution)}
                >
                  <option value="1080p">1920 × 1080 (1080p)</option>
                  <option value="2K">2560 × 1440 (2K)</option>
                  <option value="4K">3840 × 2160 (4K)</option>
                </select>
              </label>
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input type="checkbox" checked={hasLegend} onChange={(e) => setHasLegend(e.target.checked)} className="accent-data-cyan" />
            <span>嵌入颜色图例</span>
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input type="checkbox" checked={hasWatermark} onChange={(e) => setHasWatermark(e.target.checked)} className="accent-data-cyan" />
            <span>叠加溯源信息水印</span>
          </label>

          <div className="col-span-2 border-t border-ocean-700 pt-3">
            <div className="text-[11px] text-slate-400 mb-2">讲解检查清单（月底/课前核对）</div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'viewpoint', label: '视角已命名', ok: checklist.viewpoint },
                { key: 'legend', label: '图例已嵌入', ok: checklist.legend },
                { key: 'outOfBounds', label: '越界点有标注', ok: checklist.outOfBounds },
              ].map((c) => (
                <div key={c.key} className={`rounded border px-2 py-1.5 text-[11px] flex items-center gap-1.5 ${
                  c.ok ? 'border-data-green/40 bg-data-green/5' : 'border-data-orange/40 bg-data-orange/5'
                }`}>
                  {c.ok ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-data-green" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-data-orange" />
                  )}
                  <span className={c.ok ? 'text-slate-200' : 'text-data-orange'}>{c.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-ocean-700">
          <button className="btn-ocean text-xs" onClick={close}>取消</button>
          <button className="btn-ocean-primary text-xs flex items-center gap-1.5" onClick={handleExport}>
            <Download className="w-3.5 h-3.5" />
            导出并记录
          </button>
        </div>
      </div>
    </div>
  );
}
