import { useMineStore } from '@/store/useMineStore';
import { Database, Clock, User, Edit3 } from 'lucide-react';

export function SourceInfo() {
  const selectedRecord = useMineStore((state) => state.getSelectedRecord());

  if (!selectedRecord) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Database className="w-4 h-4 text-blue-400" />
        <h3 className="text-sm font-semibold text-gray-200">数据来源</h3>
      </div>

      <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
        <div className="space-y-2 text-xs">
          <div className="flex items-start gap-2">
            <Database className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-gray-400">来源系统</p>
              <p className="text-gray-200 font-mono">{selectedRecord.source}</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Clock className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-gray-400">记录日期</p>
              <p className="text-gray-200">{selectedRecord.date}</p>
            </div>
          </div>
        </div>
      </div>

      {selectedRecord.revisionHistory.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-2">
            <Edit3 className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-gray-200">修正历史</h3>
          </div>

          <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
            {selectedRecord.revisionHistory.map((revision) => (
              <div
                key={revision.id}
                className="bg-gray-800/30 rounded-lg p-2 border border-gray-700/30 text-xs"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-blue-400 font-medium">
                    {revision.field}
                  </span>
                  <span className="text-gray-500">{revision.timestamp}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400 mb-1">
                  <User className="w-3 h-3" />
                  <span>{revision.author}</span>
                </div>
                <div className="text-gray-300">
                  <span className="text-red-400 line-through">{revision.oldValue}</span>
                  <span className="mx-1">→</span>
                  <span className="text-green-400">{revision.newValue}</span>
                </div>
                <p className="text-gray-500 mt-1 italic">{revision.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
