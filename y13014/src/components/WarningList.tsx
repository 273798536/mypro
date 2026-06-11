import { AlertCircle, Inbox } from 'lucide-react';
import { useWarningStore } from '@/store/useWarningStore';
import WarningCard from './WarningCard';

export default function WarningList() {
  const getFilteredWarnings = useWarningStore((s) => s.getFilteredWarnings);
  const warnings = getFilteredWarnings();
  const sampleLoaded = useWarningStore((s) => s.sampleLoaded);

  if (!sampleLoaded && warnings.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/60 p-16 text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-deep-sea-50 flex items-center justify-center text-deep-sea-500 mb-4">
          <AlertCircle size={32} />
        </div>
        <h3 className="text-lg font-semibold text-slate-800 mb-2">暂无预警记录</h3>
        <p className="text-sm text-slate-500">点击右上角问号图标，选择「放样例」加载示例数据开始体验。</p>
      </div>
    );
  }

  if (warnings.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/60 p-16 text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 mb-4">
          <Inbox size={32} />
        </div>
        <h3 className="text-lg font-semibold text-slate-700 mb-2">没有匹配的预警</h3>
        <p className="text-sm text-slate-500">尝试调整筛选条件或状态分类。</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {warnings.map((w, i) => (
        <WarningCard key={w.id} warning={w} index={i} />
      ))}
    </div>
  );
}
