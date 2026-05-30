import type { CameraHistory } from '@/types';
import { User, Clock } from 'lucide-react';

interface TimelineProps {
  history: CameraHistory[];
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const fieldLabels: Record<string, string> = {
  'position.x': 'X轴坐标',
  'position.y': 'Y轴坐标',
  'position.z': 'Z轴坐标',
  'rotation.pan': '水平转角',
  'rotation.tilt': '垂直俯仰',
  'rotation.roll': '滚转角',
  'lens.focalLength': '焦距',
  'lens.fov': '视场角',
  'name': '机位名称',
  'number': '机位编号',
  'operator': '负责人',
  'source': '数据来源',
};

export default function Timeline({ history }: TimelineProps) {
  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        暂无修改记录
      </div>
    );
  }
  
  const sortedHistory = [...history].sort(
    (a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
  );
  
  return (
    <div className="relative">
      <div className="absolute left-3 top-0 bottom-0 w-px bg-gray-700" />
      
      <div className="space-y-4">
        {sortedHistory.map((item, index) => (
          <div key={item.id} className="relative pl-8">
            <div className={`absolute left-0 w-6 h-6 rounded-full border-2 ${
              index === 0 ? 'bg-blue-600 border-blue-500' : 'bg-gray-800 border-gray-600'
            } flex items-center justify-center`}>
              <div className={`w-2 h-2 rounded-full ${
                index === 0 ? 'bg-white' : 'bg-gray-500'
              }`} />
            </div>
            
            <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-medium ${
                  index === 0 ? 'text-blue-400' : 'text-gray-400'
                }`}>
                  {fieldLabels[item.fieldName] || item.fieldName}
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  {formatDate(item.changedAt)}
                </span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">原值:</span>
                <span className="px-2 py-0.5 bg-red-900/30 text-red-400 rounded text-xs font-mono">
                  {item.oldValue}
                </span>
                <span className="text-gray-600">→</span>
                <span className="px-2 py-0.5 bg-green-900/30 text-green-400 rounded text-xs font-mono">
                  {item.newValue}
                </span>
              </div>
              
              <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                <User className="w-3 h-3" />
                {item.operator}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
