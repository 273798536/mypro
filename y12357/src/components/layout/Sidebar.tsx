import { ParameterInput } from '../sidebar/ParameterInput';
import { InertiaDisplay } from '../sidebar/InertiaDisplay';
import { ErrorAlert } from '../sidebar/ErrorAlert';
import { useSelectedFlywheel } from '../../store/useAppStore';

export function Sidebar() {
  const selectedFlywheel = useSelectedFlywheel();

  return (
    <aside className="w-96 bg-industrial-900 border-r border-industrial-700 flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-industrial-700 bg-industrial-850">
        <h1 className="text-lg font-bold font-mono text-industrial-100 tracking-wide">
          <span className="text-tech-400">FLYWHEEL</span> INERTIA SYSTEM
        </h1>
        <p className="text-xs text-industrial-500 mt-0.5">飞轮转动惯量测算系统 v1.0</p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <ParameterInput flywheel={selectedFlywheel} />
        <InertiaDisplay flywheel={selectedFlywheel} />
        <ErrorAlert flywheel={selectedFlywheel} />
      </div>

      <div className="p-3 border-t border-industrial-700 bg-industrial-850">
        <div className="flex items-center justify-between text-xs text-industrial-500">
          <span>计算引擎: 2024.Q4</span>
          <span>材料库: 32 种</span>
        </div>
      </div>
    </aside>
  );
}
