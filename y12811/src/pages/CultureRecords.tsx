import { FlaskConical } from 'lucide-react';
import { cultureRecords } from '@/data';

export default function CultureRecords() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-white">培养记录</h2>
        <p className="text-lab-400 mt-1">共 {cultureRecords.length} 条培养记录</p>
      </div>

      <div className="glass-card p-6 rounded-xl">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 rounded-2xl bg-teal-400/10 flex items-center justify-center mb-4">
            <FlaskConical className="w-8 h-8 text-teal-400" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">培养记录列表</h3>
          <p className="text-lab-400 text-center max-w-md">
            完整的培养记录列表功能正在开发中，敬请期待...
          </p>
        </div>
      </div>
    </div>
  );
}
