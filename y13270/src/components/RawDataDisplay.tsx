import { RawPoint } from '../types';
import { FileText, Hash, Calendar, Globe } from 'lucide-react';
import { formatDateTime } from '../utils/geo';

interface RawDataDisplayProps {
  rawPoint: RawPoint;
}

export function RawDataDisplay({ rawPoint }: RawDataDisplayProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-start gap-2">
          <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
          <div>
            <div className="text-xs text-gray-500">数据来源</div>
            <div className="text-gray-700">{rawPoint.source}</div>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Hash className="w-4 h-4 text-gray-400 mt-0.5" />
          <div>
            <div className="text-xs text-gray-500">来源行号</div>
            <div className="text-gray-700">第 {rawPoint.sourceLine} 行</div>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Globe className="w-4 h-4 text-gray-400 mt-0.5" />
          <div>
            <div className="text-xs text-gray-500">导入批次</div>
            <div className="text-gray-700 font-mono-data text-xs">
              {rawPoint.importBatch}
            </div>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
          <div>
            <div className="text-xs text-gray-500">导入时间</div>
            <div className="text-gray-700">{formatDateTime(rawPoint.createdAt)}</div>
          </div>
        </div>
      </div>

      <div>
        <div className="text-xs text-gray-500 mb-2">原始名称（完整保留）</div>
        <div className="raw-data-box">
          <div className="text-gray-700 font-medium mb-2">
            原始名称: <span className="line-through decoration-orange-500">{rawPoint.rawName}</span>
          </div>
          <div className="text-gray-600 mb-2">
            原始坐标: ({rawPoint.rawLat}, {rawPoint.rawLng})
          </div>
          <div className="border-t border-gray-300 pt-2 mt-2">
            <div className="text-xs text-gray-500 mb-1">完整原始数据 JSON:</div>
            <pre className="text-xs overflow-x-auto">
              {JSON.stringify(rawPoint.rawData, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
