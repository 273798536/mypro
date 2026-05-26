import { useState } from 'react';
import { useTrajectoryStore } from '@/store/useTrajectoryStore';
import { useCompareStore } from '@/store/useCompareStore';
import { generateReportContent } from '@/utils/reportGenerator';
import { FileText, Download, Copy } from 'lucide-react';

export function ReportExporter() {
  const currentResult = useTrajectoryStore((s) => s.currentResult);
  const compareItems = useCompareStore((s) => s.items);
  const [notes, setNotes] = useState('');

  const getAllResults = () => {
    const results = [];
    if (currentResult) results.push(currentResult);
    compareItems.forEach((item) => {
      if (item.id !== 'current') results.push(item.result);
    });
    return results;
  };

  const handleExportMarkdown = () => {
    const results = getAllResults();
    if (results.length === 0) return;

    const content = generateReportContent(results, notes);
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `golf_report_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyReport = () => {
    const results = getAllResults();
    if (results.length === 0) return;

    const content = generateReportContent(results, notes);
    navigator.clipboard.writeText(content).then(() => {
      alert('报告已复制到剪贴板');
    });
  };

  if (!currentResult && compareItems.length === 0) {
    return null;
  }

  return (
    <div className="glass-panel rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <FileText size={14} className="text-golf-green" />
        <h3 className="text-sm font-semibold text-golf-green">导出报告</h3>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-400 block mb-1">备注（可选）</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="添加训练备注或说明..."
            className="w-full h-16 p-2 rounded-lg bg-golf-dark border border-golf-teal/30 text-sm text-gray-300 resize-none focus:border-golf-green focus:outline-none"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleExportMarkdown}
            className="btn-secondary flex items-center gap-1 flex-1 justify-center"
          >
            <Download size={12} />
            导出MD
          </button>
          <button
            onClick={handleCopyReport}
            className="btn-secondary flex items-center gap-1 flex-1 justify-center"
          >
            <Copy size={12} />
            复制
          </button>
        </div>
      </div>
    </div>
  );
}
