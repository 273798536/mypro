import React from 'react';
import { History, Trash2, Download, Play, Clock, Trophy } from 'lucide-react';
import type { GameRecord } from '@/types';
import { getGrade, formatDateTime } from '@/utils/helpers';
import { deleteGameRecord, downloadGameRecord } from '@/utils/dataManager';

interface HistoryListProps {
  records: GameRecord[];
  onDelete: () => void;
  onReplay: (record: GameRecord) => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({ records, onDelete, onReplay }) => {
  const handleDelete = (recordId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('确定要删除这条记录吗？')) {
      deleteGameRecord(recordId);
      onDelete();
    }
  };

  const handleExport = (record: GameRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    downloadGameRecord(record, 'json');
  };

  if (records.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 text-center">
        <History size={48} className="mx-auto mb-4 text-gray-300" />
        <p className="text-gray-500">暂无培训记录</p>
        <p className="text-sm text-gray-400 mt-1">完成培训后将在这里显示</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="text-blue-600" size={20} />
          <h2 className="text-lg font-bold text-gray-800">历史记录</h2>
        </div>
        <span className="text-sm text-gray-500">共 {records.length} 条</span>
      </div>

      <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
        {records.map((record) => {
          const { grade, color } = getGrade(record.totalScore, record.maxScore);
          const accuracy = record.maxScore > 0 ? Math.round((record.totalScore / record.maxScore) * 100) : 0;

          return (
            <div
              key={record.id}
              className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => onReplay(record)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center ${color}`}>
                    <span className="text-xl font-bold">{grade}</span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <Trophy size={14} className="text-yellow-500" />
                      <span className="font-semibold text-gray-800">
                        {record.totalScore} / {record.maxScore}
                      </span>
                      <span className="text-sm text-gray-500">({accuracy}%)</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                      <Clock size={12} />
                      <span>{formatDateTime(record.startTime)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleExport(record, e)}
                    className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                    title="导出"
                  >
                    <Download size={16} />
                  </button>
                  <button
                    onClick={(e) => handleDelete(record.id, e)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="删除"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="flex gap-4 mt-3 text-xs">
                <span className="px-2 py-1 bg-red-50 text-red-600 rounded">
                  危重漏分: {record.criticalMissCount}
                </span>
                <span className="px-2 py-1 bg-yellow-50 text-yellow-600 rounded">
                  超时: {record.timeoutCount}
                </span>
                <span className="px-2 py-1 bg-purple-50 text-purple-600 rounded">
                  复评: {record.reEvaluateCount}
                </span>
                <span className="px-2 py-1 bg-green-50 text-green-600 rounded">
                  处理: {record.patientSnapshots.filter(p => p.status === 'completed').length}人
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HistoryList;
