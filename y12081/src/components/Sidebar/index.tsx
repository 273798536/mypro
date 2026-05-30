import { StabilityPanel } from './StabilityPanel';
import { RecordList } from './RecordList';
import { SourcePanel } from './SourcePanel';

export function Sidebar() {
  return (
    <div className="w-80 h-full bg-slate-900 border-l border-slate-700 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-slate-700">
        <h1 className="text-lg font-bold text-white">船舶稳性装载模型</h1>
        <p className="text-xs text-slate-400 mt-1">3D可视化分析系统 v1.0</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <StabilityPanel />
        <div className="border-t border-slate-700 pt-6">
          <RecordList />
        </div>
        <div className="border-t border-slate-700 pt-6">
          <SourcePanel />
        </div>
      </div>

      <div className="p-4 border-t border-slate-700 bg-slate-800/50">
        <div className="text-xs text-slate-500 text-center">
          最后更新: {new Date().toLocaleDateString('zh-CN')}
        </div>
      </div>
    </div>
  );
}
