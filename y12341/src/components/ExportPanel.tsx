import { useState } from 'react';
import { Download, FileSpreadsheet, FileText, CheckCircle2, AlertTriangle, XCircle, Trash2 } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { exportData, type ExportOptions } from '@/utils/exporter';
import { clearState } from '@/utils/storage';

export default function ExportPanel() {
  const { experiments, results, anomalies, dispatch } = useAppStore();
  const [options, setOptions] = useState<ExportOptions>({
    includeNormal: true,
    includePending: true,
    includeAnomaly: true,
    format: 'xlsx',
  });
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const normalCount = results.filter((r) => !isNaN(r.thermalConductivity)).length;
  const pendingCount = experiments.filter((e) => e.status === 'pending').length;
  const anomalyCount = experiments.filter((e) => e.status === 'anomaly').length;

  const hasData = experiments.length > 0;

  const handleExport = () => {
    if (!hasData) return;
    exportData(experiments, results, anomalies, options);
  };

  const handleClearAll = () => {
    dispatch({ type: 'CLEAR_ALL' });
    clearState();
    setShowClearConfirm(false);
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Download className="w-5 h-5 text-slate-700" />
          <h3
            className="font-semibold text-slate-800"
            style={{ fontFamily: 'JetBrains Mono, monospace' }}
          >
            数据导出
          </h3>
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-xs text-slate-600 font-medium mb-2">
          选择导出内容
        </div>

        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={options.includeNormal}
            onChange={(e) =>
              setOptions({ ...options, includeNormal: e.target.checked })
            }
            className="rounded border-slate-300 text-slate-800 focus:ring-slate-500"
          />
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span className="text-slate-700">正常结果</span>
          <span className="text-slate-400">({normalCount})</span>
        </label>

        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={options.includePending}
            onChange={(e) =>
              setOptions({ ...options, includePending: e.target.checked })
            }
            className="rounded border-slate-300 text-slate-800 focus:ring-slate-500"
          />
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span className="text-slate-700">待确认清单</span>
          <span className="text-slate-400">({pendingCount})</span>
        </label>

        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={options.includeAnomaly}
            onChange={(e) =>
              setOptions({ ...options, includeAnomaly: e.target.checked })
            }
            className="rounded border-slate-300 text-slate-800 focus:ring-slate-500"
          />
          <XCircle className="w-4 h-4 text-red-500" />
          <span className="text-slate-700">异常清单</span>
          <span className="text-slate-400">({anomalyCount})</span>
        </label>

        <div className="pt-2">
          <div className="text-xs text-slate-600 font-medium mb-2">
            导出格式
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setOptions({ ...options, format: 'xlsx' })}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded text-sm border transition-colors ${
                options.format === 'xlsx'
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              Excel
            </button>
            <button
              onClick={() => setOptions({ ...options, format: 'csv' })}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded text-sm border transition-colors ${
                options.format === 'csv'
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
              }`}
            >
              <FileText className="w-4 h-4" />
              CSV
            </button>
          </div>
        </div>

        <button
          onClick={handleExport}
          disabled={
            !hasData ||
            (!options.includeNormal &&
              !options.includePending &&
              !options.includeAnomaly) ||
            normalCount + pendingCount + anomalyCount === 0
          }
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 text-white rounded hover:bg-slate-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors mt-2"
        >
          <Download className="w-4 h-4" />
          导出报告
        </button>

        <div className="pt-3 border-t border-slate-200">
          {!showClearConfirm ? (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-red-600 border border-red-200 rounded hover:bg-red-50 transition-colors text-sm"
            >
              <Trash2 className="w-4 h-4" />
              清空所有数据
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-red-600 text-center">
                确定要清空所有数据吗？此操作不可撤销
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 px-3 py-1.5 text-sm text-slate-600 border border-slate-200 rounded hover:bg-slate-50"
                >
                  取消
                </button>
                <button
                  onClick={handleClearAll}
                  className="flex-1 px-3 py-1.5 text-sm text-white bg-red-600 rounded hover:bg-red-700"
                >
                  确认清空
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
