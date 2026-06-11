import { useMemo } from 'react';
import { CadRecord, TimelineGap } from '../../types';
import { COLORS } from '../../utils/constants';
import { formatTimestamp } from '../../utils/dataProcessor';
import { useDataStore } from '../../store/dataStore';
import { AlertCircle } from 'lucide-react';

interface TimelineProps {
  records: CadRecord[];
  gaps: TimelineGap[];
}

export const Timeline = ({ records, gaps }: TimelineProps) => {
  const setSelectedRecord = useDataStore((s) => s.setSelectedRecord);
  const selectedRecordId = useDataStore((s) => s.selectedRecordId);

  const sortedRecords = useMemo(() => {
    return [...records]
      .filter((r) => r.timestamp)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [records]);

  const timeRange = useMemo(() => {
    if (sortedRecords.length < 2) return { min: 0, max: 100 };
    const times = sortedRecords.map((r) => new Date(r.timestamp).getTime());
    return {
      min: Math.min(...times),
      max: Math.max(...times),
    };
  }, [sortedRecords]);

  const getPosition = (timestamp: string) => {
    const time = new Date(timestamp).getTime();
    return ((time - timeRange.min) / (timeRange.max - timeRange.min)) * 100;
  };

  const handleBlockClick = (record: CadRecord) => {
    setSelectedRecord(record.id);
  };

  const handleGapClick = (gap: TimelineGap) => {
    if (gap.affectedRecordIds.length > 0) {
      setSelectedRecord(gap.affectedRecordIds[0]);
    }
  };

  if (records.length === 0) {
    return null;
  }

  return (
    <div className="bg-slate-800/80 rounded-lg border border-slate-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-slate-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-blue-400" />
          时间轴分布
        </h4>
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span>数据点: {sortedRecords.length}</span>
          {gaps.length > 0 && (
            <span className="text-red-400">缺段: {gaps.length}</span>
          )}
        </div>
      </div>

      <div className="relative h-20 bg-slate-900/50 rounded border border-slate-700 overflow-hidden">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full h-1 bg-slate-700 mx-4 relative">
            {sortedRecords.map((record) => {
              const left = getPosition(record.timestamp);
              const isSelected = selectedRecordId === record.id;
              const hasGap = gaps.some((g) => g.affectedRecordIds.includes(record.id));
              
              return (
                <div
                  key={record.id}
                  className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? 'bg-blue-400 ring-2 ring-white ring-offset-1 ring-offset-slate-900'
                      : hasGap
                      ? 'bg-purple-500'
                      : 'bg-blue-500/60 hover:bg-blue-400'
                  }`}
                  style={{ left: `calc(${left}% - 6px)` }}
                  onClick={() => handleBlockClick(record)}
                  title={`${record.id} - ${formatTimestamp(record.timestamp)}`}
                />
              );
            })}

            {gaps.map((gap) => {
              const startLeft = getPosition(gap.startTime);
              const endLeft = getPosition(gap.endTime);
              const width = endLeft - startLeft;

              return (
                <div
                  key={gap.id}
                  className="absolute top-1/2 -translate-y-1/2 h-6 cursor-pointer group"
                  style={{
                    left: `${startLeft}%`,
                    width: `${width}%`,
                  }}
                  onClick={() => handleGapClick(gap)}
                >
                  <div
                    className="w-full h-full border-2 border-dashed border-red-500/60 bg-red-500/10 rounded"
                    style={{
                      backgroundImage:
                        'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(239,68,68,0.2) 4px, rgba(239,68,68,0.2) 8px)',
                    }}
                  />
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-xs text-white px-2 py-1 rounded whitespace-nowrap z-10 border border-slate-700">
                    <div className="text-red-400 font-medium">时间轴缺段</div>
                    <div>时长: {gap.duration} 分钟</div>
                    <div className="text-slate-400">
                      行 {gap.startRow} - {gap.endRow}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="absolute bottom-1 left-4 right-4 flex justify-between text-xs text-slate-500">
          <span>{sortedRecords[0] ? formatTimestamp(sortedRecords[0].timestamp) : '-'}</span>
          <span>
            {sortedRecords[sortedRecords.length - 1]
              ? formatTimestamp(sortedRecords[sortedRecords.length - 1].timestamp)
              : '-'}
          </span>
        </div>
      </div>

      {gaps.length > 0 && (
        <div className="mt-3 space-y-2">
          <div className="text-xs font-medium text-slate-400">检测到的时间轴缺段:</div>
          {gaps.map((gap) => (
            <div
              key={gap.id}
              className="flex items-center justify-between bg-red-500/10 border border-red-500/30 rounded px-3 py-2 text-xs cursor-pointer hover:bg-red-500/20 transition-colors"
              onClick={() => handleGapClick(gap)}
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span className="text-red-300">{gap.id}</span>
              </div>
              <div className="text-slate-300">
                缺段 <span className="text-red-400 font-medium">{gap.duration}</span> 分钟
              </div>
              <div className="text-slate-400">
                影响行: {gap.startRow} - {gap.endRow}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
