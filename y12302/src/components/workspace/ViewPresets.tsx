import { Camera, View, RotateCcw, Eye } from 'lucide-react';

interface ViewPresetsProps {
  onReset?: () => void;
}

export function ViewPresets({ onReset }: ViewPresetsProps) {
  const presets = [
    { name: '前视图', icon: View },
    { name: '后视图', icon: View },
    { name: '侧视图', icon: View },
    { name: '俯视图', icon: View },
    { name: '轴视图', icon: View },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-slate-300">
        <Camera size={18} />
        <h3 className="font-semibold text-sm">视角预设</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        {presets.map((preset) => (
          <button
            key={preset.name}
            className="flex items-center justify-center gap-1 px-2 py-1.5 bg-slate-700/50 hover:bg-slate-600 rounded text-xs text-slate-300 hover:text-white transition-colors"
          >
            <preset.icon size={14} />
            {preset.name}
          </button>
        ))}
      </div>

      <button
        onClick={onReset}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-700/50 hover:bg-slate-600 rounded text-xs text-slate-300 hover:text-white transition-colors"
      >
        <RotateCcw size={14} />
        重置视角
      </button>
    </div>
  );
}
