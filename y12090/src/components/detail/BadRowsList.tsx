import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import type { BadRow } from '../../types/seat';

interface BadRowsListProps {
  badRows: BadRow[];
}

export const BadRowsList: React.FC<BadRowsListProps> = ({ badRows }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (badRows.length === 0) return null;

  return (
    <div className="border-t border-slate-700">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 bg-red-900/20 hover:bg-red-900/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-red-400" />
          <span className="text-sm font-medium text-red-400">坏行记录</span>
          <span className="text-xs bg-red-500/20 text-red-300 px-2 py-0.5 rounded">
            {badRows.length}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp size={16} className="text-red-400" />
        ) : (
          <ChevronDown size={16} className="text-red-400" />
        )}
      </button>

      {isExpanded && (
        <div className="max-h-48 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-slate-800">
              <tr className="text-slate-400">
                <th className="p-2 text-left">行号</th>
                <th className="p-2 text-left">原因</th>
              </tr>
            </thead>
            <tbody>
              {badRows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-slate-700/50 hover:bg-slate-700/30"
                >
                  <td className="p-2 text-slate-300 font-mono">
                    {row.lineNumber}
                  </td>
                  <td className="p-2 text-slate-400">
                    <div>{row.reason}</div>
                    {row.rawContent && (
                      <div className="text-slate-600 mt-1 font-mono text-[10px] truncate max-w-[200px]">
                        原始: {row.rawContent || '(空)'}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
