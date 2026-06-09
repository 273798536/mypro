import { useState } from 'react';
import { Download, FileJson, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { useVerificationStore } from '@/store/useVerificationStore';

export default function ExportButton() {
  const { exportReport, validateExport } = useVerificationStore();
  const [open, setOpen] = useState(false);
  const [tip, setTip] = useState<{ ok: boolean; msg: string } | null>(null);

  const handleExport = (fmt: 'pdf' | 'json') => {
    const check = validateExport();
    if (!check.ok) {
      setTip({ ok: false, msg: check.mismatches.slice(0, 2).join('；') });
      setTimeout(() => setTip(null), 4000);
      return;
    }
    const result = exportReport(fmt);
    if (result.ok) {
      setTip({ ok: true, msg: `已导出 ${fmt.toUpperCase()} 报告，内容与界面摘要一致` });
    } else {
      setTip({ ok: false, msg: result.message || '导出失败' });
    }
    setOpen(false);
    setTimeout(() => setTip(null), 4000);
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        {tip && (
          <span
            className={
              'chip ' +
              (tip.ok ? 'bg-pass-50 text-pass-700 border border-pass-500/30' : 'bg-fail-50 text-fail-700 border border-fail-500/30')
            }
          >
            {tip.ok ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
            {tip.msg}
          </span>
        )}
        <div className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            className="btn-primary"
          >
            <Download size={16} />
            导出报告
          </button>
          {open && (
            <div className="absolute right-0 mt-2 w-44 card p-1 z-20">
              <button
                onClick={() => handleExport('pdf')}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 rounded-md text-left"
              >
                <FileText size={16} className="text-brand-700" />
                导出 PDF
              </button>
              <button
                onClick={() => handleExport('json')}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 rounded-md text-left"
              >
                <FileJson size={16} className="text-brand-700" />
                导出 JSON（含溯源）
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
