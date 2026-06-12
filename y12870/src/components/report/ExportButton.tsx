import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileDown, Loader2, FileText, Printer } from 'lucide-react';
import { captureElement, exportMaritimeReport } from '@/utils/pdfExporter';
import { useCalcStore } from '@/store/useCalcStore';

interface Props { variant?: 'primary' | 'secondary'; size?: 'sm' | 'md' }

export default function ExportButton({ variant = 'primary', size = 'md' }: Props) {
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const projectName = useCalcStore(s => s.projectName);
  const results = useCalcStore(s => s.results);
  const tides = useCalcStore(s => s.tidalSeries);
  const missing = useCalcStore(s => s.missingMaterials);

  const goReport = useCallback(() => nav('/report'), [nav]);

  async function doExport() {
    setBusy(true);
    try {
      const mapImg = await captureElement('#capture-map');
      await exportMaritimeReport({
        projectName, mapImage: mapImg,
        reportDate: new Date().toISOString().slice(0, 10),
        results, tides, missing, preparedBy: '海岛运维处 · 试算台系统',
      });
    } catch (e: any) {
      console.error('导出失败', e);
      alert('PDF 导出失败：' + (e?.message || '未知错误'));
    } finally { setBusy(false); }
  }

  const sizeCls = size === 'sm' ? '!py-1.5 !px-3 !text-xs' : '';

  return (
    <div className="inline-flex items-center gap-2">
      <button
        className={`${variant === 'primary' ? 'btn-primary' : 'btn-secondary'} ${sizeCls} inline-flex items-center gap-1.5`}
        onClick={goReport}
      >
        <FileText className="w-4 h-4" />
        <span>预览报告</span>
      </button>
      <button
        className={`${variant === 'primary' ? 'btn-secondary' : 'btn-primary'} ${sizeCls} inline-flex items-center gap-1.5`}
        onClick={doExport}
        disabled={busy}
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
        <span>{busy ? '生成中…' : '导出PDF'}</span>
      </button>
    </div>
  );
}

export function PrintButton() {
  return (
    <button className="btn-secondary inline-flex items-center gap-1.5" onClick={() => window.print()}>
      <Printer className="w-4 h-4" /> 打印
    </button>
  );
}
