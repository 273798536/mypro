import { useWaterStore } from '@/store/useWaterStore';
import { Settings, Save } from 'lucide-react';

export default function ValvePanel() {
  const { valves, segments, selectedValveId, selectValve, toggleValve, saveValveState } = useWaterStore();

  return (
    <div className="p-4 border border-slate-700/50 rounded-lg bg-slate-900/50">
      <div className="flex items-center gap-2 mb-3">
        <Settings size={16} className="text-amber-400" />
        <span className="text-sm text-slate-300">阀门控制</span>
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto">
        {valves.map(valve => {
          const segment = segments.find(s => s.id === valve.pipeSegmentId);
          const isSelected = selectedValveId === valve.id;

          return (
            <div
              key={valve.id}
              className={`flex items-center gap-2 p-2 rounded border transition-colors cursor-pointer ${
                isSelected
                  ? 'border-cyan-500/50 bg-cyan-500/10'
                  : 'border-slate-700/50 hover:border-slate-600'
              }`}
              onClick={() => selectValve(valve.id)}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleValve(valve.id);
                }}
                className={`w-10 h-5 rounded-full relative transition-colors ${
                  valve.isOpen ? 'bg-emerald-500' : 'bg-red-500'
                }`}
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                    valve.isOpen ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>

              <div className="flex-1 min-w-0">
                <div className="text-xs text-white font-medium">{valve.id}</div>
                <div className="text-xs text-slate-400">{valve.pipeSegmentId}</div>
              </div>

              {!valve.isSaved && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveValveState(valve.id);
                  }}
                  className="text-xs px-2 py-1 bg-amber-500/20 text-amber-400 rounded hover:bg-amber-500/30 flex items-center gap-1"
                >
                  <Save size={10} />
                  保存
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
