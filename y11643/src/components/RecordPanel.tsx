import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FlightRecord } from '../types/game';
import { loadFlightRecords, deleteFlightRecord, clearFlightRecords } from '../utils/flightRecorder';
import { exportToJSON, exportToCSV, exportFlightDataJSON } from '../utils/export';
import { getSampleRecords } from '../data/sampleData';
import { getGradeFromScore } from '../utils/scoring';

interface RecordPanelProps {
  onReplay: (record: FlightRecord) => void;
}

export const RecordPanel: React.FC<RecordPanelProps> = ({ onReplay }) => {
  const [records, setRecords] = useState<FlightRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<FlightRecord | null>(null);
  const [showSampleData, setShowSampleData] = useState(false);

  useEffect(() => {
    refreshRecords();
  }, []);

  const refreshRecords = () => {
    const savedRecords = loadFlightRecords();
    setRecords(savedRecords);
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这条记录吗？')) {
      deleteFlightRecord(id);
      refreshRecords();
    }
  };

  const handleClearAll = () => {
    if (confirm('确定要清空所有记录吗？此操作不可恢复。')) {
      clearFlightRecords();
      refreshRecords();
    }
  };

  const handleLoadSamples = () => {
    const samples = getSampleRecords();
    setRecords(prev => [...prev, ...samples]);
    setShowSampleData(false);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const allRecords = showSampleData 
    ? [...records, ...getSampleRecords()]
    : records;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-slate-900/90 backdrop-blur-sm rounded-xl p-4 border border-purple-500/30 shadow-lg shadow-purple-500/10 h-full flex flex-col"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-purple-400 font-bold text-sm flex items-center gap-2">
          <span className="text-lg">📋</span> 飞行记录
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSampleData(!showSampleData)}
            className={`text-xs px-2 py-1 rounded transition-all ${
              showSampleData 
                ? 'bg-purple-500 text-white' 
                : 'bg-slate-700 text-gray-400 hover:bg-slate-600'
            }`}
          >
            {showSampleData ? '隐藏样例' : '显示样例'}
          </button>
          {records.length > 0 && (
            <button
              onClick={handleClearAll}
              className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all"
            >
              清空
            </button>
          )}
        </div>
      </div>

      {records.length === 0 && !showSampleData && (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">🚀</div>
          <p className="text-sm">暂无飞行记录</p>
          <p className="text-xs mt-1">完成一次飞行后记录将显示在这里</p>
          <button
            onClick={handleLoadSamples}
            className="mt-4 text-xs px-3 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-all"
          >
            加载样例数据
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        <AnimatePresence>
          {allRecords.map((record, index) => {
            const grade = getGradeFromScore(record.score);
            return (
              <motion.div
                key={record.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setSelectedRecord(record)}
                className={`bg-slate-800/50 rounded-lg p-3 cursor-pointer transition-all hover:bg-slate-800 border-l-4 ${
                  record.success ? 'border-green-500' : 'border-red-500'
                } ${selectedRecord?.id === record.id ? 'ring-2 ring-purple-500/50' : ''}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{record.success ? '✅' : '❌'}</span>
                    <div>
                      <div className="text-white text-sm font-medium">
                        {record.success ? '着陆成功' : '着陆失败'}
                      </div>
                      <div className="text-gray-500 text-xs">
                        {formatDate(record.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div 
                      className="text-lg font-black"
                      style={{ color: grade.color }}
                    >
                      {record.success ? grade.grade : '-'}
                    </div>
                    <div className="text-white font-mono text-sm">
                      {record.score.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">时间</span>
                    <div className="text-gray-300 font-mono">
                      {record.summary.flightTime.toFixed(1)}s
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">燃料</span>
                    <div className="text-gray-300 font-mono">
                      {record.summary.fuelUsed.toFixed(0)}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">精度</span>
                    <div className="text-gray-300 font-mono">
                      {record.summary.landingAccuracy.toFixed(0)}%
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {records.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-700 flex gap-2">
          <button
            onClick={() => exportToCSV(records)}
            className="flex-1 text-xs py-2 bg-slate-700 text-gray-300 rounded-lg hover:bg-slate-600 transition-all flex items-center justify-center gap-1"
          >
            📊 导出CSV
          </button>
          <button
            onClick={() => exportFlightDataJSON(records)}
            className="flex-1 text-xs py-2 bg-slate-700 text-gray-300 rounded-lg hover:bg-slate-600 transition-all flex items-center justify-center gap-1"
          >
            📄 导出JSON
          </button>
        </div>
      )}

      <AnimatePresence>
        {selectedRecord && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setSelectedRecord(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-slate-900 rounded-2xl p-6 max-w-lg w-full mx-4 border border-purple-500/30 max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-xl font-bold text-white flex items-center gap-2">
                    {selectedRecord.success ? '✅' : '❌'}
                    {selectedRecord.success ? '着陆成功' : '着陆失败'}
                  </h4>
                  <p className="text-gray-500 text-sm">
                    {formatDate(selectedRecord.createdAt)}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>

              {selectedRecord.failureReason && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
                  <div className="text-red-400 font-bold text-sm mb-2">⚠️ 失败原因</div>
                  <div className="text-red-300 text-sm space-y-1">
                    {selectedRecord.failureReason.split('; ').map((reason, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="text-red-500">•</span>
                        <span>{reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center bg-slate-800 rounded-lg p-4">
                  <div className="text-gray-400 text-xs mb-1">得分</div>
                  <div 
                    className="text-3xl font-black"
                    style={{ color: getGradeFromScore(selectedRecord.score).color }}
                  >
                    {selectedRecord.score.toLocaleString()}
                  </div>
                  <div 
                    className="text-lg"
                    style={{ color: getGradeFromScore(selectedRecord.score).color }}
                  >
                    {getGradeFromScore(selectedRecord.score).grade}
                  </div>
                </div>
                <div className="bg-slate-800 rounded-lg p-4">
                  <div className="text-gray-400 text-xs mb-1">飞行时间</div>
                  <div className="text-white text-2xl font-mono">
                    {selectedRecord.summary.flightTime.toFixed(1)}
                    <span className="text-sm text-gray-400 ml-1">s</span>
                  </div>
                  <div className="text-gray-400 text-xs mt-2">最大高度</div>
                  <div className="text-cyan-400 text-xl font-mono">
                    {selectedRecord.summary.maxAltitude.toFixed(0)}
                    <span className="text-sm text-gray-400 ml-1">m</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800 rounded-lg p-4 mb-6">
                <div className="text-gray-400 text-xs mb-3">详细数据</div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">最大速度</span>
                    <span className="text-white font-mono">
                      {selectedRecord.summary.maxVelocity.toFixed(1)} m/s
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">撞击速度</span>
                    <span className="text-white font-mono">
                      {selectedRecord.summary.impactSpeed.toFixed(1)} m/s
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">燃料使用</span>
                    <span className="text-white font-mono">
                      {selectedRecord.summary.fuelUsed.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">着陆精度</span>
                    <span className="text-white font-mono">
                      {selectedRecord.summary.landingAccuracy.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    onReplay(selectedRecord);
                    setSelectedRecord(null);
                  }}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  🎬 慢动作回放
                </button>
                <button
                  onClick={() => {
                    exportToJSON(selectedRecord);
                    setSelectedRecord(null);
                  }}
                  className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-6 rounded-lg transition-all"
                >
                  📥 导出
                </button>
                {!selectedRecord.id.startsWith('sample-') && (
                  <button
                    onClick={() => {
                      handleDelete(selectedRecord.id);
                      setSelectedRecord(null);
                    }}
                    className="bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold py-3 px-6 rounded-lg transition-all"
                  >
                    🗑️ 删除
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
