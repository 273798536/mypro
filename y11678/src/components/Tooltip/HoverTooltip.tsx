import { useStore } from '../../store/useStore';

export function HoverTooltip() {
  const hoverInfo = useStore((state) => state.hoverInfo);

  if (!hoverInfo.visible) return null;

  return (
    <div
      className="fixed z-50 pointer-events-none glass-card p-3 min-w-[200px]"
      style={{
        left: hoverInfo.position.x + 15,
        top: hoverInfo.position.y + 15,
      }}
    >
      <div className="space-y-2">
        <div className="text-sm font-medium text-primary-500">
          坐标信息
        </div>
        
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-space-400">X</div>
          <div className="col-span-2 text-space-200 font-mono">
            {hoverInfo.worldPosition.x.toFixed(4)}
          </div>
          <div className="text-space-400">Y</div>
          <div className="col-span-2 text-space-200 font-mono">
            {hoverInfo.worldPosition.y.toFixed(4)}
          </div>
          <div className="text-space-400">Z</div>
          <div className="col-span-2 text-space-200 font-mono">
            {hoverInfo.worldPosition.z.toFixed(4)}
          </div>
        </div>

        <div className="border-t border-space-600 pt-2">
          <div className="text-xs text-space-400">方程值</div>
          <div className="text-sm text-space-200 font-mono">
            f(x,y,z) = {hoverInfo.value.toFixed(6)}
          </div>
        </div>

        {hoverInfo.gradient && (
          <div className="border-t border-space-600 pt-2">
            <div className="text-xs text-space-400 mb-1">梯度 ∇f</div>
            <div className="grid grid-cols-3 gap-1 text-xs">
              <span className="text-space-400">∂/∂x:</span>
              <span className="col-span-2 font-mono text-space-200">
                {hoverInfo.gradient.x.toFixed(4)}
              </span>
              <span className="text-space-400">∂/∂y:</span>
              <span className="col-span-2 font-mono text-space-200">
                {hoverInfo.gradient.y.toFixed(4)}
              </span>
              <span className="text-space-400">∂/∂z:</span>
              <span className="col-span-2 font-mono text-space-200">
                {hoverInfo.gradient.z.toFixed(4)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
