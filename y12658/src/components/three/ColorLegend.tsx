import { Html } from '@react-three/drei';
import { useDataStore } from '@/store/useDataStore';
import { createViridisScale } from '@/utils/colorScale';

const STOPS = 11;

export default function ColorLegend() {
  const range = useDataStore((s) => s.valueRange);
  const hoveredId = useDataStore((s) => s.hoveredRecordId);
  const records = useDataStore((s) => s.records);
  const hovered = records.find((r) => r.id === hoveredId);
  const scale = createViridisScale(range.min, range.max);

  return (
    <Html position={[5.2, 0, 0]} style={{ pointerEvents: 'none' }}>
      <div className="panel-ocean p-3 w-44">
        <div className="text-xs font-mono text-slate-300 mb-2">流场值颜色图例</div>
        <div className="flex gap-2">
          <div
            className="w-3 rounded-sm"
            style={{
              background: `linear-gradient(to top, ${Array.from({ length: STOPS })
                .map((_, i) => scale.getCssColor(range.min + (i / (STOPS - 1)) * (range.max - range.min)))
                .join(', ')})`,
            }}
          />
          <div className="flex-1 flex flex-col justify-between text-[10px] font-mono text-slate-400">
            <span className="text-data-cyan">{range.max.toFixed(3)}</span>
            <span>—</span>
            <span className="text-data-green">{range.min.toFixed(3)}</span>
          </div>
        </div>
        {hovered && (
          <div className="mt-2 pt-2 border-t border-ocean-700 text-[10px] font-mono">
            <div className="text-slate-500">当前悬浮</div>
            <div className="text-data-cyan">值: {hovered.value.toFixed(4)}</div>
            <div className="text-slate-400">设备: {hovered.deviceId}</div>
            <div className="text-slate-400">坐标: ({hovered.x}, {hovered.y}, {hovered.z})</div>
          </div>
        )}
      </div>
    </Html>
  );
}
