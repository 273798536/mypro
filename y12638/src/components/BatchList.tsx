import { useState } from 'react';
import { Batch, ValidationError } from '../types';

interface Props {
  batches: Batch[];
  currentBatchId: string | null;
  onSelectBatch: (batchId: string) => void;
  onImportBatch: (data: any) => boolean;
  onParseAndImport: (rawInput: string) => ValidationError[] | null;
  onSetErrors: (errors: ValidationError[]) => void;
}

export default function BatchList({ batches, currentBatchId, onSelectBatch, onImportBatch, onParseAndImport, onSetErrors }: Props) {
  const [showImport, setShowImport] = useState(false);
  const [importData, setImportData] = useState('');

  const handleImport = () => {
    const errors = onParseAndImport(importData);
    if (errors) {
      onSetErrors(errors);
    } else {
      setShowImport(false);
      setImportData('');
    }
  };

  const handleMockImport = () => {
    const mockData = {
      batchName: '下午康复课C班',
      devices: [
        { id: '1', name: '轮椅1', type: '移动设备', location: 'C区1号' },
        { id: '2', name: '助行器', type: '辅助设备', location: 'C区2号' }
      ],
      coords: [
        { deviceName: '轮椅1', x: 200, y: 300, source: '底图坐标' },
        { deviceName: '轮椅1', x: 205, y: 305, source: '轨迹记录' },
        { deviceName: '助行器', x: 250, y: 350, source: '底图坐标' },
        { deviceName: '助行器', x: 248, y: 348, source: '轨迹记录' }
      ]
    };
    const success = onImportBatch(mockData);
    if (success) {
      onSetErrors([]);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-gray-900">批次列表</h3>
      </div>
      
      <div className="p-4">
        <div className="flex space-x-2 mb-4">
          <button
            onClick={() => setShowImport(!showImport)}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm"
          >
            导入批次
          </button>
          <button
            onClick={handleMockImport}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded text-sm"
          >
            测试
          </button>
        </div>

        {showImport && (
          <div className="mb-4 space-y-2">
            <textarea
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              placeholder='粘贴JSON数据，格式: {"batchName": "...", "devices": [{"id":"1","name":"设备1","type":"类型","location":"位置"}], "coords": [{"deviceName":"设备1","x":100,"y":200,"source":"底图坐标"}]}'
              className="w-full border rounded p-2 text-sm h-32 font-mono"
            />
            <button
              onClick={handleImport}
              className="w-full bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm"
            >
              确认导入
            </button>
            <p className="text-xs text-gray-500 mt-1">
              提示: source字段只能是"底图坐标"或"轨迹记录"
            </p>
          </div>
        )}

        <div className="space-y-2">
          {batches.map((batch) => (
            <button
              key={batch.id}
              onClick={() => onSelectBatch(batch.id)}
              className={`w-full text-left p-3 rounded-lg border ${
                currentBatchId === batch.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-medium text-sm">{batch.name}</span>
                <span className={`text-xs px-2 py-1 rounded ${
                  batch.status === '通过' ? 'bg-green-100 text-green-700' :
                  batch.status === '待确认' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {batch.status}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {new Date(batch.timestamp).toLocaleDateString()} · {batch.deviceCount}台设备 · {batch.conflictCount}个冲突
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
