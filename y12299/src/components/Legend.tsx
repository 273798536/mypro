import { useAppStore } from '../store/useAppStore';

export function Legend() {
  const { showLegend } = useAppStore();

  if (!showLegend) return null;

  return (
    <div className="absolute bottom-4 left-4 bg-slate-900/90 backdrop-blur-sm rounded-lg p-4 border border-slate-700 z-10">
      <h4 className="text-white text-sm font-semibold mb-3">图例说明</h4>
      
      <div className="space-y-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-gradient-to-r from-cyan-300 to-cyan-500 rounded" />
          <span className="text-slate-300">正常流线 (低速→高速)</span>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
          <span className="text-slate-300">角度越界</span>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse" />
          <span className="text-slate-300">采样过密</span>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-slate-300">尾流反向</span>
        </div>
      </div>
    </div>
  );
}
