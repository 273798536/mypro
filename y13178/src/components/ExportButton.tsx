import { useState } from 'react';
import { Download, CheckCircle, AlertCircle } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { generateReportHTML, downloadHTML, verifyStats } from '@/utils/export';
import { getAttributionStats } from '@/utils/format';

export default function ExportButton() {
  const records = useAppStore((s) => s.records);
  const exceptions = useAppStore((s) => s.exceptions);
  const currentScene = useAppStore((s) => s.currentScene);
  const viewMode = useAppStore((s) => s.viewMode);

  const [exportStatus, setExportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');

  const handleExport = () => {
    try {
      const stats = getAttributionStats(records);
      const verify = verifyStats(records);

      if (
        verify.oldNoteWeight !== stats.byType.old_note ||
        verify.normalWeight !== stats.byType.normal ||
        verify.verbalWeight !== stats.byType.verbal
      ) {
        throw new Error('数据校验不一致');
      }

      const html = generateReportHTML({
        scene: currentScene,
        records,
        exceptions,
        viewMode,
      });

      const timestamp = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const dateStr = `${timestamp.getFullYear()}${pad(timestamp.getMonth() + 1)}${pad(timestamp.getDate())}`;
      const timeStr = `${pad(timestamp.getHours())}${pad(timestamp.getMinutes())}${pad(timestamp.getSeconds())}`;
      const filename = `激光散斑误差归因报告_${currentScene.title}_${dateStr}_${timeStr}.html`;

      downloadHTML(filename, html);

      setExportStatus('success');
      setMessage(
        `已导出 · 旧版${verify.oldNoteWeight}/正常${verify.normalWeight}/口头${verify.verbalWeight}/总${verify.totalWeight}`
      );

      setTimeout(() => {
        setExportStatus('idle');
        setMessage('');
      }, 3500);
    } catch (err: any) {
      console.error('[Export] failed:', err);
      setExportStatus('error');
      setMessage(err?.message || '导出失败');
      setTimeout(() => {
        setExportStatus('idle');
        setMessage('');
      }, 4000);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {message && (
        <div
          className={`flex items-center gap-1 text-xs px-2 py-1 rounded border ${
            exportStatus === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}
        >
          {exportStatus === 'success' ? (
            <CheckCircle size={12} />
          ) : (
            <AlertCircle size={12} />
          )}
          <span>{message}</span>
        </div>
      )}
      <button
        onClick={handleExport}
        className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded transition-all ${
          exportStatus === 'success'
            ? 'bg-emerald-500 hover:bg-emerald-400 text-white'
            : exportStatus === 'error'
            ? 'bg-red-500 hover:bg-red-400 text-white'
            : 'bg-cyan-500 hover:bg-cyan-400 text-white'
        }`}
      >
        <Download size={16} />
        <span>
          {exportStatus === 'success' ? '已导出' : exportStatus === 'error' ? '导出失败' : '导出报告'}
        </span>
      </button>
    </div>
  );
}
