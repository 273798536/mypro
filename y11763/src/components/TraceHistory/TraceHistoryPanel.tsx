import { X, Clock, Database, Edit3 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useParticleStore } from '../../store/useParticleStore';
import { twMerge } from 'tailwind-merge';

export default function TraceHistoryPanel() {
  const { showTraceHistory, toggleTraceHistory, importResults } = useAppStore();
  const { modificationRecords, particles } = useParticleStore();

  if (!showTraceHistory) return null;

  return (
    <div className="absolute bottom-20 left-4 w-96 bg-chamber-900/95 backdrop-blur-md rounded-xl border border-chamber-700/50 overflow-hidden z-20">
      <div className="flex items-center justify-between px-4 py-3 border-b border-chamber-700/50">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-400" />
          <h2 className="font-orbitron text-sm font-bold text-white">数据来源与修正</h2>
        </div>
        <button
          onClick={toggleTraceHistory}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="max-h-80 overflow-y-auto">
        {importResults.length > 0 && (
          <div className="p-4 border-b border-chamber-700/50">
            <h3 className="text-xs text-gray-400 font-jetbrains mb-3 flex items-center gap-2">
              <Clock className="w-3 h-3" />
              导入记录
            </h3>
            <div className="space-y-2">
              {importResults.slice().reverse().map((result, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg bg-chamber-800/50 border border-chamber-700/30"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white font-jetbrains truncate max-w-40">
                      {result.filename}
                    </span>
                    <span
                      className={twMerge(
                        'text-xs px-2 py-0.5 rounded',
                        result.success
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                      )}
                    >
                      {result.importMode}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 font-jetbrains">
                    <span>成功: {result.successCount}</span>
                    <span>错误: {result.errorCount}</span>
                    <span>
                      {new Date(result.importedAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {modificationRecords.length > 0 && (
          <div className="p-4">
            <h3 className="text-xs text-gray-400 font-jetbrains mb-3 flex items-center gap-2">
              <Edit3 className="w-3 h-3" />
              修正记录
            </h3>
            <div className="space-y-2">
              {modificationRecords.slice().reverse().slice(0, 20).map((record) => {
                const particle = particles.find((p) => p.id === record.particleId);
                return (
                  <div
                    key={record.id}
                    className="p-3 rounded-lg bg-chamber-800/50 border border-chamber-700/30"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-blue-400 font-jetbrains">
                        {record.fieldName}
                      </span>
                      <span className="text-[10px] text-gray-500 font-jetbrains">
                        {record.source}
                      </span>
                    </div>
                    {particle && (
                      <div className="text-xs text-gray-400 font-jetbrains mt-1">
                        {particle.id}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-2 text-xs font-jetbrains">
                      <span className="text-red-400 line-clamp-1">{record.oldValue}</span>
                      <span className="text-gray-600">→</span>
                      <span className="text-green-400 line-clamp-1">{record.newValue}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {importResults.length === 0 && modificationRecords.length === 0 && (
          <div className="p-8 text-center">
            <Database className="w-8 h-8 mx-auto mb-2 text-gray-600" />
            <p className="text-sm text-gray-500 font-jetbrains">暂无数据记录</p>
          </div>
        )}
      </div>
    </div>
  );
}
