import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { AlertTriangle, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react';
import type { BadRowSource } from '@/types';

const SOURCE_LABELS: Record<BadRowSource, string> = {
  fuel_bar: '燃料条',
  mission_log: '任务日志',
  orbit_data: '轨道数据',
};

const SOURCE_STYLES: Record<BadRowSource, string> = {
  fuel_bar: 'bg-amber-500/20 text-amber-300',
  mission_log: 'bg-blue-500/20 text-blue-300',
  orbit_data: 'bg-purple-500/20 text-purple-300',
};

export default function BadRowPanel() {
  const badRows = useGameStore(s => s.badRows);
  const [expanded, setExpanded] = useState(false);

  if (badRows.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-green-900/20 rounded-lg border border-green-800/30">
        <CheckCircle size={16} className="text-green-400" />
        <span className="text-sm text-green-400">数据校验通过</span>
      </div>
    );
  }

  return (
    <div className="rounded-lg overflow-hidden border border-amber-800/30">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2 bg-amber-900/30 text-amber-300 text-sm hover:bg-amber-900/40 transition-colors"
      >
        <span className="flex items-center gap-2">
          <AlertTriangle size={14} />
          异常数据
          <span className="px-1.5 py-0.5 rounded-full bg-amber-500/30 text-amber-200 text-xs font-bold">
            {badRows.length}
          </span>
        </span>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          expanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-amber-900/20 text-amber-400/70">
              <th className="px-2 py-1.5 text-left font-medium">行号</th>
              <th className="px-2 py-1.5 text-left font-medium">原始内容</th>
              <th className="px-2 py-1.5 text-left font-medium">原因</th>
              <th className="px-2 py-1.5 text-left font-medium">来源</th>
            </tr>
          </thead>
          <tbody>
            {badRows.map((row, i) => (
              <tr key={i} className="bg-amber-900/10 border-b border-amber-800/20">
                <td className="px-2 py-1.5 text-amber-300/80 font-mono">{row.lineNumber}</td>
                <td className="px-2 py-1.5 text-amber-200/60 max-w-[200px] truncate">{row.rawContent}</td>
                <td className="px-2 py-1.5 text-amber-300/70">{row.reason}</td>
                <td className="px-2 py-1.5">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${SOURCE_STYLES[row.source]}`}>
                    {SOURCE_LABELS[row.source]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
