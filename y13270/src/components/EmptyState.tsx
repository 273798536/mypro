import { Database } from 'lucide-react';
import { usePointStore } from '../store';

export function EmptyState() {
  const { loadDemoData } = usePointStore();

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
        <Database className="w-10 h-10 text-gray-400" />
      </div>
      <h2 className="text-xl font-semibold text-gray-700 mb-2 font-serif-cn">
        暂无点位数据
      </h2>
      <p className="text-gray-500 mb-6 max-w-md">
        请先导入GIS点位数据，或加载演示数据体验系统功能。
        <br />
        <span className="text-sm">演示数据包含：同地点多名、坐标偏移、后补备注等典型场景</span>
      </p>
      <div className="flex gap-3">
        <button onClick={loadDemoData} className="btn-primary">
          加载演示数据
        </button>
      </div>
    </div>
  );
}
