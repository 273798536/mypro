import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { formatNumber } from '@/utils/calculations';
import { FileText, ChevronDown, ChevronRight, AlertCircle, AlertTriangle, CheckCircle, Edit3 } from 'lucide-react';

export default function RecordList() {
  const { getFilteredRecords, selectedRecordId, selectRecord, applyRecordToForm } = useStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const records = getFilteredRecords();

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      default:
        return <CheckCircle className="w-4 h-4 text-green-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'error':
        return '错误';
      case 'warning':
        return '警告';
      default:
        return '正常';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-5 h-5 text-blue-400" />
        <h3 className="text-white font-semibold">实验记录</h3>
        <span className="text-xs text-slate-400 bg-slate-700 px-2 py-0.5 rounded">
          {records.length} 条
        </span>
      </div>

      <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
        {records.map((record, index) => (
          <div
            key={record.id}
            className={`rounded border transition-colors ${
              selectedRecordId === record.id
                ? 'bg-blue-900/20 border-blue-500'
                : record.status === 'error'
                ? 'bg-red-900/10 border-red-500/30 hover:border-red-500/50'
                : record.status === 'warning'
                ? 'bg-yellow-900/10 border-yellow-500/30 hover:border-yellow-500/50'
                : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
            }`}
          >
            <div
              className="flex items-center gap-2 p-3 cursor-pointer"
              onClick={() => selectRecord(selectedRecordId === record.id ? null : record.id)}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(record.id);
                }}
                className="text-slate-400 hover:text-white"
              >
                {expandedId === record.id ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-white text-sm font-medium">{record.experimentNo}</span>
                  {getStatusIcon(record.status)}
                  <span className={`text-xs ${
                    record.status === 'error'
                      ? 'text-red-400'
                      : record.status === 'warning'
                      ? 'text-yellow-400'
                      : 'text-green-400'
                  }`}>
                    {getStatusText(record.status)}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {record.materialSource} · {record.date}
                </div>
              </div>

              <div className="text-right text-xs">
                <div className="text-blue-400 font-mono">
                  Re: {formatNumber(record.reynoldsNumber || 0)}
                </div>
                <div className="text-purple-400 font-mono">
                  Ma: {formatNumber(record.machNumber || 0, 3)}
                </div>
              </div>
            </div>

            {expandedId === record.id && (
              <div className="px-3 pb-3 pt-1 border-t border-slate-700/50 space-y-3">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <div>
                    <span className="text-slate-500">模型长度: </span>
                    <span className="text-slate-300 font-mono">
                      {record.modelLength} {record.modelLengthUnit}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">实机长度: </span>
                    <span className="text-slate-300 font-mono">
                      {record.realLength} {record.realLengthUnit}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">风速: </span>
                    <span className="text-slate-300 font-mono">
                      {record.windSpeed} {record.windSpeedUnit}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">温度: </span>
                    <span className="text-slate-300 font-mono">
                      {record.temperature} {record.temperatureUnit}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">空气密度: </span>
                    <span className="text-slate-300 font-mono">
                      {record.airDensity} {record.airDensityUnit}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">空气粘度: </span>
                    <span className="text-slate-300 font-mono">
                      {record.airViscosity} {record.airViscosityUnit}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-700/50 rounded p-2">
                    <div className="text-slate-500 text-xs">尺度比</div>
                    <div className="text-green-400 font-mono text-sm">
                      λ = {formatNumber(record.scaleRatio || 0, 4)}
                    </div>
                  </div>
                  <div className="bg-slate-700/50 rounded p-2">
                    <div className="text-slate-500 text-xs">雷诺数</div>
                    <div className="text-blue-400 font-mono text-sm">
                      Re = {formatNumber(record.reynoldsNumber || 0)}
                    </div>
                  </div>
                  <div className="bg-slate-700/50 rounded p-2">
                    <div className="text-slate-500 text-xs">马赫数</div>
                    <div className="text-purple-400 font-mono text-sm">
                      Ma = {formatNumber(record.machNumber || 0, 3)}
                    </div>
                  </div>
                </div>

                {record.errors.length > 0 && (
                  <div className="space-y-2">
                    {record.errors.map((error, i) => (
                      <div
                        key={i}
                        className={`p-2 rounded text-xs ${
                          error.severity === 'error'
                            ? 'bg-red-900/30 border border-red-500/30'
                            : 'bg-yellow-900/30 border border-yellow-500/30'
                        }`}
                      >
                        <div className="flex items-start gap-1.5">
                          {error.severity === 'error' ? (
                            <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <span className={`font-medium ${
                              error.severity === 'error' ? 'text-red-400' : 'text-yellow-400'
                            }`}>
                              {error.type === 'unit_mismatch' && '单位混乱'}
                              {error.type === 'reynolds_mismatch' && '雷诺数不匹配'}
                              {error.type === 'mach_mismatch' && '马赫数警告'}
                              {error.type === 'invalid_value' && '数值无效'}
                              :{' '}
                            </span>
                            <span className="text-slate-300">{error.message}</span>
                            <div className="text-slate-500 font-mono mt-0.5">
                              {error.location}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    applyRecordToForm(record);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  加载到换算面板
                </button>
              </div>
            )}
          </div>
        ))}

        {records.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <div className="text-sm">没有匹配的实验记录</div>
            <div className="text-xs mt-1">请调整筛选条件</div>
          </div>
        )}
      </div>
    </div>
  );
}
