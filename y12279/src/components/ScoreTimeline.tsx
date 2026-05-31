import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Download, Music, Crosshair, AlertCircle, ChevronDown, ChevronUp, FileJson, FileSpreadsheet } from 'lucide-react';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { ERROR_COLORS, ERROR_TYPE_LABELS } from '@/types';
import { cn } from '@/lib/utils';

export function ScoreTimeline() {
  const { session, currentTime, setCurrentTime, jumpToError, getCorrespondenceData } = usePlaybackStore();
  const [showCorrespondence, setShowCorrespondence] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * session.totalDuration;
    setCurrentTime(newTime);
  };

  const exportCorrespondence = (format: 'json' | 'csv') => {
    const data = getCorrespondenceData();
    
    if (format === 'json') {
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      downloadFile(blob, `correspondence_${Date.now()}.json`);
    } else {
      const headers = ['时间戳(s)', '小节号', '关键点ID', '错误ID'];
      const rows = data.map(d => [
        d.timestamp.toFixed(2),
        d.measureNumber,
        d.keypointIds.join(';'),
        d.errorIds.join(';')
      ]);
      const csvStr = [headers, ...rows].map(row => row.join(',')).join('\n');
      const blob = new Blob([csvStr], { type: 'text/csv' });
      downloadFile(blob, `correspondence_${Date.now()}.csv`);
    }
  };

  const downloadFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getCurrentMeasure = () => {
    return session.measures.find(
      m => currentTime >= m.startTime && currentTime < m.endTime
    );
  };

  const currentMeasure = getCurrentMeasure();

  return (
    <div className="h-full flex flex-col bg-slate-900/95 text-white rounded-lg overflow-hidden">
      <div className="p-3 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Music className="w-4 h-4 text-emerald-400" />
          <span className="font-medium text-sm">乐谱时间轴</span>
          {currentMeasure && (
            <span className="text-xs text-slate-400 ml-2">
              当前: 第{currentMeasure.measureNumber}小节
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCorrespondence(!showCorrespondence)}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-slate-700 hover:bg-slate-600 transition-colors"
          >
            <Crosshair className="w-3 h-3" />
            对应关系
            {showCorrespondence ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {showCorrespondence && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="border-b border-slate-700 bg-slate-800/50"
        >
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400">关键点-小节-截图对应关系</span>
              <div className="flex gap-2">
                <button
                  onClick={() => exportCorrespondence('json')}
                  className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-blue-600 hover:bg-blue-500 transition-colors"
                >
                  <FileJson className="w-3 h-3" />
                  JSON
                </button>
                <button
                  onClick={() => exportCorrespondence('csv')}
                  className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-emerald-600 hover:bg-emerald-500 transition-colors"
                >
                  <FileSpreadsheet className="w-3 h-3" />
                  CSV
                </button>
              </div>
            </div>
            <div className="max-h-32 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="text-slate-400 sticky top-0 bg-slate-800">
                  <tr>
                    <th className="text-left py-1 px-2">时间</th>
                    <th className="text-left py-1 px-2">小节</th>
                    <th className="text-left py-1 px-2">关键点数</th>
                    <th className="text-left py-1 px-2">错误数</th>
                  </tr>
                </thead>
                <tbody>
                  {getCorrespondenceData().map((row, i) => (
                    <tr key={i} className="border-t border-slate-700/50 hover:bg-slate-700/30">
                      <td className="py-1 px-2 font-mono">{row.timestamp.toFixed(2)}s</td>
                      <td className="py-1 px-2">第{row.measureNumber}小节</td>
                      <td className="py-1 px-2">{row.keypointIds.length}</td>
                      <td className="py-1 px-2">
                        {row.errorIds.length > 0 ? (
                          <span className="text-red-400">{row.errorIds.length}</span>
                        ) : (
                          <span className="text-slate-500">0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      <div className="flex-1 p-3 flex flex-col">
        <div className="flex gap-1 mb-2 overflow-x-auto pb-1">
          {session.measures.map((measure) => {
            const errorsInMeasure = session.errors.filter(
              e => e.measureNumber === measure.measureNumber
            );
            const isActive = currentMeasure?.measureNumber === measure.measureNumber;
            
            return (
              <motion.div
                key={measure.measureNumber}
                whileHover={{ scale: 1.05 }}
                className={cn(
                  "flex-shrink-0 w-16 p-2 rounded cursor-pointer transition-all text-center",
                  isActive 
                    ? 'bg-emerald-600 ring-2 ring-emerald-400' 
                    : errorsInMeasure.length > 0 
                      ? 'bg-red-900/50 hover:bg-red-800/50' 
                      : 'bg-slate-800 hover:bg-slate-700'
                )}
                onClick={() => setCurrentTime(measure.startTime)}
              >
                <div className="text-xs font-medium">第{measure.measureNumber}小节</div>
                <div className="text-xs text-slate-400 mt-1">
                  {measure.notes.slice(0, 2).join(' ')}
                  {measure.notes.length > 2 && '...'}
                </div>
                {errorsInMeasure.length > 0 && (
                  <div className="mt-1 flex justify-center gap-0.5">
                    {errorsInMeasure.slice(0, 3).map(err => (
                      <div
                        key={err.id}
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: ERROR_COLORS[err.type] }}
                        title={ERROR_TYPE_LABELS[err.type]}
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        <div className="flex-1 flex items-center">
          <div
            ref={timelineRef}
            className="relative w-full h-16 bg-slate-800 rounded-lg cursor-pointer overflow-hidden"
            onClick={handleTimelineClick}
          >
            <div className="absolute inset-x-0 top-0 h-8 border-b border-slate-700">
              {session.measures.map((measure) => {
                const leftPercent = (measure.startTime / session.totalDuration) * 100;
                const widthPercent = ((measure.endTime - measure.startTime) / session.totalDuration) * 100;
                return (
                  <div
                    key={measure.measureNumber}
                    className="absolute top-0 h-full border-r border-slate-700/50 flex items-center justify-center"
                    style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
                  >
                    <span className="text-xs text-slate-500">{measure.measureNumber}</span>
                  </div>
                );
              })}
            </div>

            {session.errors.map((error) => {
              const leftPercent = (error.timestamp / session.totalDuration) * 100;
              return (
                <motion.div
                  key={error.id}
                  className="absolute bottom-2 w-3 h-3 rounded-full cursor-pointer z-10 border-2 border-slate-900"
                  style={{ 
                    left: `calc(${leftPercent}% - 6px)`,
                    backgroundColor: ERROR_COLORS[error.type],
                  }}
                  whileHover={{ scale: 1.3 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    jumpToError(error.id);
                  }}
                  title={`${ERROR_TYPE_LABELS[error.type]} - ${error.timestamp.toFixed(2)}s`}
                />
              );
            })}

            <motion.div
              className="absolute top-0 bottom-0 w-0.5 bg-white z-20"
              style={{ left: `${(currentTime / session.totalDuration) * 100}%` }}
            >
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full" />
            </motion.div>

            <div className="absolute bottom-0 inset-x-0 h-8 flex items-center px-2">
              <div className="text-xs text-slate-500 font-mono">
                {currentTime.toFixed(2)}s / {session.totalDuration.toFixed(2)}s
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-3 border-t border-slate-700 bg-slate-800/30">
        <div className="flex items-center justify-center gap-6 text-xs text-slate-400">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ERROR_COLORS.missing_keypoint }} />
            <span>关键点丢失</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ERROR_COLORS.measure_misalignment }} />
            <span>小节错位</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ERROR_COLORS.hand_confusion }} />
            <span>左右手混淆</span>
          </div>
        </div>
      </div>
    </div>
  );
}
