import { useState, useCallback } from 'react';
import { Copy, Download, Check } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { generateReport } from '@/utils/export';

export default function ReportView() {
  const nodes = useGameStore((s) => s.nodes);
  const members = useGameStore((s) => s.members);
  const actionHistory = useGameStore((s) => s.actionHistory);
  const testResult = useGameStore((s) => s.testResult);
  const budget = useGameStore((s) => s.budget);
  const budgetUsed = useGameStore((s) => s.budgetUsed);

  const [copied, setCopied] = useState(false);

  const report = generateReport(nodes, members, actionHistory, testResult, budget, budgetUsed);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(report).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [report]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bridge-report-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [report]);

  return (
    <div className="flex flex-col rounded-lg border border-slate-700 bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-700 px-4 py-2">
        <h3 className="text-sm font-bold tracking-wider text-slate-300">结构报告</h3>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded bg-slate-700 px-3 py-1.5 text-xs text-slate-200 transition-colors hover:bg-slate-600"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-green-400" />
                <span className="text-green-400">已复制</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>复制</span>
              </>
            )}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 rounded bg-slate-700 px-3 py-1.5 text-xs text-slate-200 transition-colors hover:bg-slate-600"
          >
            <Download className="h-3.5 w-3.5" />
            <span>下载</span>
          </button>
        </div>
      </div>
      <pre className="max-h-96 overflow-auto bg-slate-950 p-4 font-mono text-xs leading-relaxed text-green-300/80">
        {report}
      </pre>
    </div>
  );
}
