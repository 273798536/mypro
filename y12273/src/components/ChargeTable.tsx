import { useFieldStore } from "@/store/fieldStore";
import { Plus, Trash2 } from "lucide-react";

export default function ChargeTable() {
  const charges = useFieldStore((s) => s.charges);
  const selectedChargeId = useFieldStore((s) => s.selectedChargeId);
  const selectCharge = useFieldStore((s) => s.selectCharge);
  const removeCharge = useFieldStore((s) => s.removeCharge);
  const updateChargeValue = useFieldStore((s) => s.updateChargeValue);
  const addCharge = useFieldStore((s) => s.addCharge);

  const handleAddCharge = () => {
    const isPositive = Math.random() > 0.5;
    const id = `q${Date.now()}`;
    const angle = Math.random() * Math.PI * 2;
    const r = 1.5 + Math.random() * 2;
    addCharge({
      id,
      position: [r * Math.cos(angle), 0, r * Math.sin(angle)],
      charge: isPositive ? +(1 + Math.random()).toFixed(1) : -(1 + Math.random()).toFixed(1),
      label: isPositive ? `${id.split("").pop()} +` : `${id.split("").pop()} −`,
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">电荷参数</h3>
        <button
          onClick={handleAddCharge}
          className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 transition-colors border border-cyan-500/30"
        >
          <Plus size={12} />
          添加
        </button>
      </div>
      <div className="space-y-1">
        {charges.map((c) => (
          <div
            key={c.id}
            onClick={() => selectCharge(c.id)}
            className={`p-2 rounded-lg cursor-pointer transition-all duration-200 border ${
              selectedChargeId === c.id
                ? "bg-cyan-500/15 border-cyan-500/40 shadow-[0_0_8px_rgba(0,245,212,0.15)]"
                : "bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    c.charge > 0 ? "bg-red-400 shadow-[0_0_6px_rgba(255,71,87,0.5)]" : "bg-blue-400 shadow-[0_0_6px_rgba(30,144,255,0.5)]"
                  }`}
                />
                <span className="text-xs text-white/90 font-medium">{c.label}</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeCharge(c.id);
                }}
                className="p-1 rounded hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors"
              >
                <Trash2 size={11} />
              </button>
            </div>
            <div className="mt-1 grid grid-cols-4 gap-1 text-[10px]">
              <div className="text-white/40">x</div>
              <div className="text-white/40">z</div>
              <div className="text-white/40">q</div>
              <div />
              <div className="text-white/80 font-mono">{c.position[0].toFixed(1)}</div>
              <div className="text-white/80 font-mono">{c.position[2].toFixed(1)}</div>
              <div>
                <input
                  type="number"
                  value={c.charge}
                  step={0.5}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val) && val !== 0) updateChargeValue(c.id, val);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className={`w-14 bg-transparent font-mono text-center rounded px-1 py-0.5 border border-white/10 focus:border-cyan-500/50 focus:outline-none transition-colors ${
                    c.charge > 0 ? "text-red-300" : "text-blue-300"
                  }`}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
