import React, { useState } from 'react';
import { BookOpen, CheckCircle, AlertTriangle, XCircle, Play } from 'lucide-react';
import { sampleRecords } from '../data/sampleRecords';
import { useGameStore } from '../store/useGameStore';

interface SampleSelectorProps {
  onClose: () => void;
}

export const SampleSelector: React.FC<SampleSelectorProps> = ({ onClose }) => {
  const { loadGameState } = useGameStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'normal':
        return <CheckCircle className="text-green-500" size={24} />;
      case 'boundary':
        return <AlertTriangle className="text-yellow-500" size={24} />;
      case 'bad':
        return <XCircle className="text-red-500" size={24} />;
      default:
        return <BookOpen className="text-gray-500" size={24} />;
    }
  };

  const getTypeBg = (type: string) => {
    switch (type) {
      case 'normal':
        return 'bg-green-50 border-green-200 hover:border-green-400';
      case 'boundary':
        return 'bg-yellow-50 border-yellow-200 hover:border-yellow-400';
      case 'bad':
        return 'bg-red-50 border-red-200 hover:border-red-400';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'normal':
        return { text: '正常记录', color: 'text-green-700 bg-green-100' };
      case 'boundary':
        return { text: '边界记录', color: 'text-yellow-700 bg-yellow-100' };
      case 'bad':
        return { text: '错误示例', color: 'text-red-700 bg-red-100' };
      default:
        return { text: '未知', color: 'text-gray-700 bg-gray-100' };
    }
  };

  const handleLoadSample = (record: typeof sampleRecords[0]) => {
    loadGameState(record.gameState);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="bg-indigo-600 p-6 text-white">
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <BookOpen size={28} />
            教学样例库
          </h2>
          <p className="text-white/80 mt-2">
            选择预设样例查看不同灌溉策略的处理结果
          </p>
        </div>

        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {sampleRecords.map((record) => {
            const label = getTypeLabel(record.type);
            return (
              <div
                key={record.id}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  selectedId === record.id
                    ? 'ring-2 ring-indigo-500'
                    : ''
                } ${getTypeBg(record.type)}`}
                onClick={() => setSelectedId(record.id)}
              >
                <div className="flex items-start gap-4">
                  {getTypeIcon(record.type)}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-gray-800">{record.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${label.color}`}>
                        {label.text}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{record.description}</p>
                    <div className="bg-white/50 rounded-lg p-3">
                      <p className="text-xs text-gray-500">
                        <span className="font-medium">预期结果：</span>
                        {record.expectedOutcome}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLoadSample(record);
                    }}
                    className="flex items-center gap-1 bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Play size={14} />
                    加载
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 bg-gray-50 border-t">
          <p className="text-xs text-gray-500 text-center">
            💡 样例数据来源：农技站教学案例库 | 每次加载都会保留完整操作痕迹和异常记录
          </p>
        </div>
      </div>
    </div>
  );
};
