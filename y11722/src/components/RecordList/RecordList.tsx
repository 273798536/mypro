import React, { useState } from 'react';
import { History, Trash2, Download, Play, Calendar, Tag, AlertTriangle } from 'lucide-react';
import { ExperimentRecord, MotionStatus } from '../../types';
import { getStatusText, getStatusColor, toDegrees } from '../../utils/physics';

interface RecordListProps {
  records: ExperimentRecord[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
  onExport: (record: ExperimentRecord) => void;
  onSetJudgment: (id: string, judgment: MotionStatus) => void;
}

export const RecordList: React.FC<RecordListProps> = ({
  records,
  selectedId,
  onSelect,
  onLoad,
  onDelete,
  onExport,
  onSetJudgment,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (records.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-slate-800 border-b pb-3 mb-4">
          📋 实验记录
        </h2>
        <div className="text-center text-slate-400 py-8">
          <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>暂无实验记录</p>
          <p className="text-sm mt-1">调节参数后点击"保存记录"</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-bold text-slate-800 border-b pb-3 mb-4">
        📋 实验记录 <span className="text-sm font-normal text-slate-400">({records.length})</span>
      </h2>

      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
        {records.map((record) => (
          <div
            key={record.id}
            className={`border rounded-lg overflow-hidden transition-all ${
              selectedId === record.id
                ? 'border-primary-500 ring-2 ring-primary-200'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div
              className="p-3 cursor-pointer"
              onClick={() => {
                onSelect(record.id === selectedId ? null : record.id);
                setExpandedId(record.id === expandedId ? null : record.id);
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: getStatusColor(record.analysis.status) }}
                  />
                  <div>
                    <div className="font-medium text-slate-800">
                      {getStatusText(record.analysis.status)}
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(record.createdAt).toLocaleString('zh-CN')}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {record.anomalies.length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                      <AlertTriangle className="w-3 h-3" />
                      {record.anomalies.length}
                    </div>
                  )}
                  <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                    v{record.version}
                  </span>
                </div>
              </div>

              {expandedId === record.id && (
                <div className="mt-3 pt-3 border-t space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-slate-50 p-2 rounded">
                      <div className="text-slate-400">角度</div>
                      <div className="font-mono font-bold text-slate-700">
                        {record.params.angle}°
                      </div>
                    </div>
                    <div className="bg-slate-50 p-2 rounded">
                      <div className="text-slate-400">摩擦系数</div>
                      <div className="font-mono font-bold text-slate-700">
                        {record.params.frictionCoefficient}
                      </div>
                    </div>
                    <div className="bg-slate-50 p-2 rounded">
                      <div className="text-slate-400">临界角</div>
                      <div className="font-mono font-bold text-slate-700">
                        {toDegrees(record.analysis.criticalAngle).toFixed(1)}°
                      </div>
                    </div>
                  </div>

                  {record.source && (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Tag className="w-3 h-3" />
                      来源: {record.source}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onLoad(record.id);
                      }}
                      className="flex-1 flex items-center justify-center gap-1 py-2 px-3 bg-primary-500 text-white text-sm rounded-lg hover:bg-primary-600 transition-colors"
                    >
                      <Play className="w-4 h-4" />
                      加载
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onExport(record);
                      }}
                      className="flex-1 flex items-center justify-center gap-1 py-2 px-3 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      导出
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(record.id);
                      }}
                      className="py-2 px-3 bg-red-100 text-red-600 text-sm rounded-lg hover:bg-red-200 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="pt-2 border-t">
                    <div className="text-xs text-slate-500 mb-2">学生判断（用于批改）</div>
                    <div className="flex gap-2">
                      {(['static', 'sliding', 'critical'] as MotionStatus[]).map((status) => (
                        <button
                          key={status}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSetJudgment(record.id, status);
                          }}
                          className={`flex-1 py-1.5 px-2 text-xs rounded transition-all ${
                            record.studentJudgment === status
                              ? 'bg-slate-700 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {getStatusText(status)}
                        </button>
                      ))}
                    </div>
                    {record.studentJudgment && record.studentJudgment !== record.analysis.status && (
                      <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                        ⚠️ 判断错误！理论上应为「{getStatusText(record.analysis.status)}」
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
