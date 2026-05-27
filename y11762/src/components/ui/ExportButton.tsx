import { useStore } from '../../store/useStore';
import { METRIC_LABELS } from '../../data/provinces';
import { Camera, Download } from 'lucide-react';
import { useCallback } from 'react';

export default function ExportButton() {
  const { activeMetric, filterRegions } = useStore();

  const handleExport = useCallback(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');

    const watermarkCanvas = document.createElement('canvas');
    watermarkCanvas.width = canvas.width;
    watermarkCanvas.height = canvas.height;
    const ctx = watermarkCanvas.getContext('2d')!;

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0);

      ctx.fillStyle = 'rgba(10, 22, 40, 0.7)';
      ctx.fillRect(0, canvas.height - 48, canvas.width, 48);

      ctx.font = '14px "JetBrains Mono", monospace';
      ctx.fillStyle = '#4FC3F7';
      const now = new Date().toLocaleString('zh-CN');
      const metricText = `指标: ${METRIC_LABELS[activeMetric]}`;
      const filterText = filterRegions.length > 0 ? ` | 筛选: ${filterRegions.length}个地区` : ' | 全部地区';
      ctx.fillText(`${now}  ${metricText}${filterText}`, 16, canvas.height - 20);

      ctx.font = '12px "JetBrains Mono", monospace';
      ctx.fillStyle = '#64748B';
      ctx.textAlign = 'right';
      ctx.fillText('保险风险地理柱图', canvas.width - 16, canvas.height - 20);
      ctx.textAlign = 'left';

      const finalUrl = watermarkCanvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `保险风险地理柱图_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = finalUrl;
      link.click();
    };
    img.src = dataUrl;
  }, [activeMetric, filterRegions]);

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-2 bg-slate-800/60 backdrop-blur-md border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-700/60 hover:text-cyan-300 transition-colors"
      title="导出当前视图为PNG图片"
    >
      <Camera size={14} />
      <span>导出截图</span>
    </button>
  );
}
