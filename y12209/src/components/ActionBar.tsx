import React from 'react';
import { CheckCircle, Download, FileSpreadsheet } from 'lucide-react';
import { MatchRecord } from '../types';

interface ActionBarProps {
  selectedCount: number;
  totalCount: number;
  onConfirm: () => void;
  onExport: () => void;
  onExportAll: () => void;
  isConfirming: boolean;
}

export const ActionBar: React.FC<ActionBarProps> = ({
  selectedCount,
  totalCount,
  onConfirm,
  onExport,
  onExportAll,
  isConfirming
}) => {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 mt-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <span className="text-sm text-slate-400">
          共 <span className="text-slate-200 font-medium">{totalCount}</span> 条记录
        </span>
        {selectedCount > 0 && (
          <span className="text-sm text-blue-400">
            已选择 <span className="font-medium">{selectedCount}</span> 条
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {selectedCount > 0 && (
          <button
            onClick={onConfirm}
            disabled={isConfirming}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:text-blue-400 text-white rounded text-sm font-medium transition-colors"
          >
            <CheckCircle className="w-4 h-4" />
            {isConfirming ? '确认中...' : `确认选中 (${selectedCount})`}
          </button>
        )}
        <button
          onClick={onExport}
          disabled={selectedCount === 0}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 text-slate-200 rounded text-sm font-medium transition-colors"
        >
          <Download className="w-4 h-4" />
          导出选中
        </button>
        <button
          onClick={onExportAll}
          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-sm font-medium transition-colors"
        >
          <FileSpreadsheet className="w-4 h-4" />
          导出全部
        </button>
      </div>
    </div>
  );
};

export default ActionBar;
