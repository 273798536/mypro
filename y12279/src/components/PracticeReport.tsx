import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, AlertCircle, ChevronDown, ChevronUp, Tag, Clock, Music, Crosshair } from 'lucide-react';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { ErrorType, ERROR_TYPE_LABELS, ERROR_SOURCE_LABELS, ERROR_COLORS } from '@/types';
import { cn } from '@/lib/utils';

const errorTypeIcons: Record<ErrorType, React.ReactNode> = {
  missing_keypoint: <Crosshair className="w-4 h-4" />,
  measure_misalignment: <Music className="w-4 h-4" />,
  hand_confusion: <AlertCircle className="w-4 h-4" />,
};

export function PracticeReport() {
  const { session, errorStats, selectedErrorId, jumpToError, setSelectedErrorId } = usePlaybackStore();
  const [expandedType, setExpandedType] = useState<ErrorType | null>(null);
  const [filterType, setFilterType] = useState<ErrorType | 'all'>('all');

  const errorsByType = {
    missing_keypoint: session.errors.filter(e => e.type === 'missing_keypoint'),
    measure_misalignment: session.errors.filter(e => e.type === 'measure_misalignment'),
    hand_confusion: session.errors.filter(e => e.type === 'hand_confusion'),
  };

  const filteredErrors = filterType === 'all' 
    ? session.errors 
    : session.errors.filter(e => e.type === filterType);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-amber-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'high': return '严重';
      case 'medium': return '中等';
      case 'low': return '轻微';
      default: return severity;
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-900/95 text-white rounded-lg overflow-hidden">
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-lg font-semibold flex items-center gap-2" style={{ fontFamily: 'Playfair Display, serif' }}>
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          练习报告
        </h2>
        <p className="text-sm text-slate-400 mt-1">{session.pieceName}</p>
      </div>

      <div className="p-4 grid grid-cols-3 gap-3">
        {(Object.keys(errorsByType) as ErrorType[]).map((type) => (
          <motion.div
            key={type}
            whileHover={{ scale: 1.02 }}
            className="p-3 rounded-lg bg-slate-800 cursor-pointer border-l-4 transition-all"
            style={{ borderLeftColor: ERROR_COLORS[type] }}
            onClick={() => {
              setFilterType(filterType === type ? 'all' : type);
              setExpandedType(expandedType === type ? null : type);
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span style={{ color: ERROR_COLORS[type] }}>
                {errorTypeIcons[type]}
              </span>
              <span className="text-xs text-slate-400">{ERROR_TYPE_LABELS[type]}</span>
            </div>
            <div className="text-2xl font-bold" style={{ color: ERROR_COLORS[type] }}>
              {errorsByType[type].length}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="px-4 py-2 flex gap-2">
        <button
          onClick={() => setFilterType('all')}
          className={cn(
            "px-3 py-1 text-xs rounded-full transition-all",
            filterType === 'all' 
              ? 'bg-slate-600 text-white' 
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          )}
        >
          全部 ({errorStats.total})
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="space-y-2">
          <AnimatePresence>
            {filteredErrors.map((error) => (
              <motion.div
                key={error.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className={cn(
                  "p-3 rounded-lg cursor-pointer transition-all border",
                  selectedErrorId === error.id 
                    ? 'bg-slate-700 border-slate-500' 
                    : 'bg-slate-800 border-slate-700 hover:bg-slate-750'
                )}
                onClick={() => {
                  jumpToError(error.id);
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span 
                      className="p-1.5 rounded" 
                      style={{ backgroundColor: ERROR_COLORS[error.type] + '30', color: ERROR_COLORS[error.type] }}
                    >
                      {errorTypeIcons[error.type]}
                    </span>
                    <div>
                      <div className="text-sm font-medium">
                        {ERROR_TYPE_LABELS[error.type]}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Clock className="w-3 h-3" />
                        {error.timestamp.toFixed(2)}s
                        <span className="text-slate-600">|</span>
                        第{error.measureNumber}小节
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "w-2 h-2 rounded-full",
                      getSeverityColor(error.severity)
                    )} title={getSeverityLabel(error.severity)} />
                    {error.isRetroactivelyAdded && (
                      <span className="flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-blue-500/20 text-blue-400">
                        <Tag className="w-3 h-3" />
                        补录
                      </span>
                    )}
                  </div>
                </div>
                
                <p className="mt-2 text-sm text-slate-300">{error.description}</p>
                
                <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                  <span>来源: {ERROR_SOURCE_LABELS[error.source]}</span>
                  <span>影响关键帧: {error.affectedKeyframeIds.length}</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <div className="p-4 border-t border-slate-700 bg-slate-800/50">
        <div className="grid grid-cols-2 gap-4 text-xs text-slate-400">
          <div>
            <span className="text-slate-500">总时长:</span>
            <span className="ml-2 text-white">{session.totalDuration.toFixed(1)}s</span>
          </div>
          <div>
            <span className="text-slate-500">错误率:</span>
            <span className="ml-2 text-white">
              {((errorStats.total / session.keyframes.length) * 100).toFixed(1)}%
            </span>
          </div>
          <div>
            <span className="text-slate-500">自动检测:</span>
            <span className="ml-2 text-white">
              {session.errors.filter(e => e.source === 'automatic').length}
            </span>
          </div>
          <div>
            <span className="text-slate-500">人工补录:</span>
            <span className="ml-2 text-white">
              {session.errors.filter(e => e.source === 'manual').length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
