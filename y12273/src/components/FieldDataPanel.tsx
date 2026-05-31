import { useFieldStore } from "@/store/fieldStore";
import { calculateFieldAtPoint } from "@/utils/fieldCalculator";

export default function FieldDataPanel() {
  const hoveredFieldPoint = useFieldStore((s) => s.hoveredFieldPoint);
  const charges = useFieldStore((s) => s.charges);
  const selectedChargeId = useFieldStore((s) => s.selectedChargeId);
  const overlapDetected = useFieldStore((s) => s.overlapDetected);

  const selectedCharge = charges.find((c) => c.id === selectedChargeId);

  const selectedField = selectedCharge
    ? calculateFieldAtPoint(
        [
          selectedCharge.position[0] + 0.3,
          selectedCharge.position[1],
          selectedCharge.position[2],
        ],
        charges
      )
    : null;

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">场强数据</h3>

      {overlapDetected && (
        <div className="p-2 rounded-lg bg-yellow-500/15 border border-yellow-500/30 text-yellow-300 text-[10px]">
          ⚠ 检测到电荷重叠，场强已取上限，方向箭头保留原始方向
        </div>
      )}

      {hoveredFieldPoint && (
        <div className="p-2 rounded-lg bg-white/5 border border-white/10 space-y-1">
          <div className="text-[10px] text-white/40">悬停点场强</div>
          <div className="grid grid-cols-3 gap-1 text-[10px]">
            <div>
              <span className="text-white/40">Ex: </span>
              <span className="text-white/80 font-mono">{hoveredFieldPoint.fieldVector[0].toFixed(2)}</span>
            </div>
            <div>
              <span className="text-white/40">Ey: </span>
              <span className="text-white/80 font-mono">{hoveredFieldPoint.fieldVector[1].toFixed(2)}</span>
            </div>
            <div>
              <span className="text-white/40">Ez: </span>
              <span className="text-white/80 font-mono">{hoveredFieldPoint.fieldVector[2].toFixed(2)}</span>
            </div>
          </div>
          <div className="text-[10px]">
            <span className="text-white/40">|E| = </span>
            <span className="text-cyan-300 font-mono font-semibold">{hoveredFieldPoint.magnitude.toFixed(2)}</span>
          </div>
        </div>
      )}

      {selectedField && selectedCharge && (
        <div className="p-2 rounded-lg bg-white/5 border border-white/10 space-y-1">
          <div className="text-[10px] text-white/40">
            {selectedCharge.label} 附近场强 (偏移0.3)
          </div>
          <div className="grid grid-cols-3 gap-1 text-[10px]">
            <div>
              <span className="text-white/40">Ex: </span>
              <span className="text-white/80 font-mono">{selectedField.fieldVector[0].toFixed(2)}</span>
            </div>
            <div>
              <span className="text-white/40">Ey: </span>
              <span className="text-white/80 font-mono">{selectedField.fieldVector[1].toFixed(2)}</span>
            </div>
            <div>
              <span className="text-white/40">Ez: </span>
              <span className="text-white/80 font-mono">{selectedField.fieldVector[2].toFixed(2)}</span>
            </div>
          </div>
          <div className="text-[10px]">
            <span className="text-white/40">|E| = </span>
            <span className="text-cyan-300 font-mono font-semibold">{selectedField.magnitude.toFixed(2)}</span>
          </div>
        </div>
      )}

      {!hoveredFieldPoint && !selectedField && (
        <div className="p-2 rounded-lg bg-white/5 border border-white/10 text-[10px] text-white/30">
          选择或悬停电荷以查看场强数据
        </div>
      )}
    </div>
  );
}
