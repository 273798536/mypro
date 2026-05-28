import React, { useState } from 'react';
import { Camera, FileText, History, X, Trash2, Clock } from 'lucide-react';
import { HistoryRecord, CalculationInput, CalculationResult, ValidationError } from '../../types';
import { formatNumber } from '../../utils/calculator';
import { captureScreenshot, generateReport, downloadReport } from '../../utils/exporter';

interface ToolbarProps {
  input: CalculationInput;
  result: CalculationResult | null;
  errors: ValidationError[];
  history: HistoryRecord[];
  onDeleteRecord: (id: string) => void;
  onClearHistory: () => void;
  onLoadRecord: (input: CalculationInput) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  input,
  result,
  errors,
  history,
  onDeleteRecord,
  onClearHistory,
  onLoadRecord,
}) => {
  const [showHistory, setShowHistory] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleScreenshot = async () => {
    setIsExporting(true);
    try {
      await captureScreenshot('main-content', '液压千斤顶计算-' + Date.now() + '.png');
    } catch (e) {
      alert('截图导出失败，请重试');
    }
    setIsExporting(false);
  };

  const handleReport = () => {
    if (!result) return;
    const report = generateReport(input, result, errors);
    downloadReport(report, '液压千斤顶计算报告-' + Date.now() + '.txt');
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={handleScreenshot}
              disabled={!result || isExporting}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                result && !isExporting
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Camera size={16} />
              {isExporting ? '导出中...' : '截图导出'}
            </button>
            <button
              onClick={handleReport}
              disabled={!result}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                result
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              <FileText size={16} />
              生成报告
            </button>
          </div>
          <button
            onClick={() => setShowHistory(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-all"
          >
            <History size={16} />
            历史记录
            {history.length > 0 && (
              <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                {history.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {showHistory && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="flex items-center gap-2">
                <Clock size={20} className="text-blue-600" />
                <h3 className="text-lg font-bold text-gray-800">历史记录</h3>
              </div>
              <div className="flex items-center gap-2">
                {history.length > 0 && (
                  <button
                    onClick={onClearHistory}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 size={14} />
                    清空
                  </button>
                )}
                <button
                  onClick={() => setShowHistory(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-all"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {history.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <History size={48} className="mx-auto mb-4 opacity-50" />
                  <p>暂无历史记录</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((record) => (
                    <div
                      key={record.id}
                      className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all cursor-pointer group"
                    >
                      <div className="flex items-start justify-between">
                        <div
                          className="flex-1"
                          onClick={() => {
                            onLoadRecord(record.input);
                            setShowHistory(false);
                          }}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-xs text-gray-400">
                              {new Date(record.timestamp).toLocaleString('zh-CN')}
                            </span>
                            {record.input.source && (
                              <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded">
                                {record.input.source}
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-sm">
                            <div className="text-gray-500">
                              <span className="text-gray-400">面积比:</span>
                              <span className="font-mono text-gray-700">
                                {formatNumber(record.result.amplificationRatio, 1)}×
                              </span>
                            </div>
                            <div className="text-gray-500">
                              <span className="text-gray-400">输出力:</span>
                              <span className="font-mono text-green-600">
                                {formatNumber(record.result.outputForce)}{record.result.outputForceUnit}
                              </span>
                            </div>
                            <div className="text-gray-500">
                              <span className="text-gray-400">效率:</span>
                              <span className="font-mono text-gray-700">
                                {formatNumber(record.input.efficiency * 100, 0)}%
                              </span>
                            </div>
                          </div>
                          {record.errors.length > 0 && (
                            <div className="mt-2 text-xs text-red-500">
                              包含 {record.errors.length} 条提示
                            </div>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteRecord(record.id);
                          }}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
