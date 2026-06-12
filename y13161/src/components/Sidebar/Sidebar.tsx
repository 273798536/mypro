import React, { useState } from 'react';
import {
  History,
  Play,
  FileText,
  HelpCircle,
  ChevronRight,
  Clock,
  AlertTriangle,
  Database,
  X,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { AnalysisHistory } from '@/types';
import { Modal } from '@/components/common/Modal';

interface SidebarProps {
  onShowGuide: () => void;
  onShowImport: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onShowGuide, onShowImport }) => {
  const {
    history,
    currentHistoryId,
    rawLogs,
    loadHistory,
    reRunAnalysis,
    setShowGuide,
  } = useAppStore();
  const [showHistoryDetail, setShowHistoryDetail] = useState<AnalysisHistory | null>(null);

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFullTime = (date: Date) => {
    return new Date(date).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const handleHistoryClick = (record: AnalysisHistory) => {
    if (record.id === currentHistoryId) {
      setShowHistoryDetail(record);
    } else {
      loadHistory(record.id);
    }
  };

  return (
    <div className="w-72 h-full bg-deep-sea-700 border-r border-deep-sea-500 flex flex-col">
      <div className="p-4 border-b border-deep-sea-500">
        <h1 className="text-lg font-bold font-mono text-gradient mb-1">
          海浪浮标阈值预警
        </h1>
        <p className="text-xs text-deep-sea-300">传感器日志分析系统</p>
      </div>

      <div className="p-3 border-b border-deep-sea-500 space-y-2">
        <button
          onClick={onShowImport}
          className="w-full btn-secondary flex items-center justify-center gap-2 text-sm"
        >
          <Database className="w-4 h-4" />
          导入数据
        </button>
        <button
          onClick={reRunAnalysis}
          disabled={rawLogs.length === 0}
          className="w-full btn-primary flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Play className="w-4 h-4" />
          重跑分析
        </button>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="p-3 border-b border-deep-sea-500 flex items-center gap-2">
          <History className="w-4 h-4 text-deep-sea-300" />
          <h2 className="text-sm font-medium text-deep-sea-200">历史时间线</h2>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin p-2">
          {history.length === 0 ? (
            <div className="text-center py-8 text-deep-sea-400">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">暂无历史记录</p>
              <p className="text-xs mt-1">导入数据后自动保存</p>
            </div>
          ) : (
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-px bg-deep-sea-500" />
              <div className="space-y-1">
                {history.map((record) => (
                  <button
                    key={record.id}
                    onClick={() => handleHistoryClick(record)}
                    className={`w-full text-left relative pl-8 pr-2 py-2 rounded transition-colors group ${
                      record.id === currentHistoryId
                        ? 'bg-ocean-500/20 border border-ocean-500/30'
                        : 'hover:bg-deep-sea-600/50 border border-transparent'
                    }`}
                  >
                    <div
                      className={`absolute left-2.5 top-3 w-3 h-3 rounded-full border-2 ${
                        record.id === currentHistoryId
                          ? 'bg-ocean-400 border-ocean-300'
                          : 'bg-deep-sea-600 border-deep-sea-400 group-hover:border-deep-sea-300'
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-deep-sea-100 truncate">
                          {record.sourceFile}
                        </span>
                        <ChevronRight
                          className={`w-4 h-4 flex-shrink-0 transition-transform ${
                            record.id === currentHistoryId
                              ? 'text-ocean-400 rotate-90'
                              : 'text-deep-sea-400 group-hover:text-deep-sea-200'
                          }`}
                        />
                      </div>
                      <div className="flex items-center gap-2 text-xs text-deep-sea-400 mt-0.5">
                        <span>{formatTime(record.timestamp)}</span>
                        <span className="flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {record.anomalyCount}
                        </span>
                      </div>
                      <div className="text-xs text-deep-sea-500 mt-0.5">
                        {record.recordCount} 条记录
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-3 border-t border-deep-sea-500">
        <button
          onClick={() => setShowGuide(true)}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-deep-sea-300 hover:text-deep-sea-100 hover:bg-deep-sea-600/50 rounded transition-colors"
        >
          <HelpCircle className="w-4 h-4" />
          使用说明
        </button>
      </div>

      <Modal
        isOpen={showHistoryDetail !== null}
        onClose={() => setShowHistoryDetail(null)}
        title="历史记录详情"
      >
        {showHistoryDetail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-deep-sea-700 rounded-lg">
                <div className="text-xs text-deep-sea-400 mb-1">数据源</div>
                <div className="text-sm font-medium text-deep-sea-100 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-ocean-400" />
                  {showHistoryDetail.sourceFile}
                </div>
              </div>
              <div className="p-3 bg-deep-sea-700 rounded-lg">
                <div className="text-xs text-deep-sea-400 mb-1">分析时间</div>
                <div className="text-sm font-medium text-deep-sea-100">
                  {formatFullTime(showHistoryDetail.timestamp)}
                </div>
              </div>
              <div className="p-3 bg-deep-sea-700 rounded-lg">
                <div className="text-xs text-deep-sea-400 mb-1">记录总数</div>
                <div className="text-2xl font-bold text-alert-cyan">
                  {showHistoryDetail.recordCount}
                </div>
              </div>
              <div className="p-3 bg-deep-sea-700 rounded-lg">
                <div className="text-xs text-deep-sea-400 mb-1">异常数量</div>
                <div className="text-2xl font-bold text-alert-red">
                  {showHistoryDetail.anomalyCount}
                </div>
              </div>
            </div>
            <div className="p-3 bg-deep-sea-700 rounded-lg">
              <div className="text-xs text-deep-sea-400 mb-1">参数版本</div>
              <div className="text-sm font-mono text-deep-sea-100">
                {showHistoryDetail.parameterVersionId}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  loadHistory(showHistoryDetail.id);
                  setShowHistoryDetail(null);
                }}
                className="flex-1 btn-primary"
              >
                加载此记录
              </button>
              <button
                onClick={() => setShowHistoryDetail(null)}
                className="btn-secondary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
