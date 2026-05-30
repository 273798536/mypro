import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Clock, AlertTriangle, Hash, User, Calendar, FileWarning } from 'lucide-react';
import type { DataSource } from '../../engine/types';

interface DataSourcePanelProps {
  isOpen: boolean;
  dataSource: DataSource | null;
  onClose: () => void;
  isDirty?: boolean;
}

export const DataSourcePanel: React.FC<DataSourcePanelProps> = ({
  isOpen,
  dataSource,
  onClose,
  isDirty = false
}) => {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'stage_map': return FileText;
      case 'patrol_report': return FileText;
      case 'security_report': return FileText;
      case 'weather_data': return FileText;
      default: return FileText;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'stage_map': return '舞台地图';
      case 'patrol_report': return '巡逻报告';
      case 'security_report': return '安保报告';
      case 'weather_data': return '气象数据';
      default: return '未知类型';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'stage_map': return 'text-blue-400 bg-blue-500/20';
      case 'patrol_report': return 'text-green-400 bg-green-500/20';
      case 'security_report': return 'text-orange-400 bg-orange-500/20';
      case 'weather_data': return 'text-cyan-400 bg-cyan-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  const isDirtyData = isDirty || dataSource?.isDirty || false;

  return (
    <AnimatePresence>
      {isOpen && dataSource && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`px-6 py-4 border-b border-slate-700 flex items-center justify-between ${
              isDirtyData ? 'bg-red-900/30' : ''
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getTypeColor(dataSource.type)}`}>
                  {isDirtyData ? (
                    <FileWarning className="w-5 h-5 text-red-400" />
                  ) : (
                    React.createElement(getTypeIcon(dataSource.type), { className: 'w-5 h-5' })
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    {dataSource.name}
                    {isDirtyData && (
                      <span className="px-2 py-0.5 bg-red-500/20 border border-red-500/50 rounded text-xs text-red-400 font-medium">
                        脏数据标记
                      </span>
                    )}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(dataSource.type)}`}>
                      {getTypeLabel(dataSource.type)}
                    </span>
                    {dataSource.format && (
                      <span className="text-slate-500">{dataSource.format.toUpperCase()}</span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {isDirtyData && (
              <div className="px-6 py-3 bg-red-500/10 border-b border-red-500/30">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-red-400">数据质量警告</div>
                    <div className="text-xs text-red-300/80 mt-0.5">
                      该数据源已被标记为脏数据，可能包含错误信息或格式问题。请谨慎使用该数据做出决策。
                      {dataSource.dirtyReason && (
                        <span className="block mt-1">原因: {dataSource.dirtyReason}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-700/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                    <Hash className="w-3 h-3" />
                    <span>数据源ID</span>
                  </div>
                  <div className="text-xs font-mono text-slate-300 break-all">
                    {dataSource.id}
                  </div>
                </div>
                <div className="bg-slate-700/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                    <User className="w-3 h-3" />
                    <span>来源</span>
                  </div>
                  <div className="text-sm text-slate-200">
                    {dataSource.source || '未知来源'}
                  </div>
                </div>
                <div className="bg-slate-700/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                    <Calendar className="w-3 h-3" />
                    <span>生成时间</span>
                  </div>
                  <div className="text-sm text-slate-200">
                    {formatDate(dataSource.timestamp)}
                  </div>
                </div>
                <div className="bg-slate-700/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                    <Clock className="w-3 h-3" />
                    <span>内容哈希</span>
                  </div>
                  <div className="text-xs font-mono text-slate-300 break-all">
                    {dataSource.contentHash || '-'}
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <h4 className="text-sm font-medium text-slate-400 mb-2">数据摘要</h4>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {dataSource.summary}
                </p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-slate-400 mb-2">原始内容</h4>
                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                  {dataSource.format === 'pdf' ? (
                    <div className="text-center py-8">
                      <FileText className="w-12 h-12 mx-auto mb-3 text-red-400" />
                      <div className="text-slate-400 text-sm mb-1">PDF 文档</div>
                      <div className="text-xs text-slate-500">原始文件: {dataSource.originalPath || dataSource.name}</div>
                      <div className="mt-4 text-left">
                        <div className="text-xs text-slate-400 mb-2">内容预览:</div>
                        <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap bg-slate-800/50 p-3 rounded">
                          {typeof dataSource.content === 'string' 
                            ? dataSource.content 
                            : JSON.stringify(dataSource.content, null, 2)}
                        </pre>
                      </div>
                    </div>
                  ) : dataSource.format === 'json' ? (
                    <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap overflow-x-auto">
                      {typeof dataSource.content === 'string' 
                        ? dataSource.content 
                        : JSON.stringify(dataSource.content, null, 2)}
                    </pre>
                  ) : (
                    <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap">
                      {typeof dataSource.content === 'string' 
                        ? dataSource.content 
                        : JSON.stringify(dataSource.content, null, 2)}
                    </pre>
                  )}
                </div>
              </div>

              {dataSource.notes && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-slate-400 mb-2">备注</h4>
                  <p className="text-sm text-slate-300 bg-slate-700/30 rounded-lg p-3">
                    {dataSource.notes}
                  </p>
                </div>
              )}

              {dataSource.tags && dataSource.tags.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-slate-400 mb-2">标签</h4>
                  <div className="flex flex-wrap gap-2">
                    {dataSource.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-slate-700/50 rounded text-xs text-slate-300"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-700 bg-slate-800/50">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>数据溯源信息 - 每条决策都可追溯到原始来源</span>
                <span className="font-mono">{dataSource.id.slice(0, 8)}...</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
