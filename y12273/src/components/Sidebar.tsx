import ChargeTable from "./ChargeTable";
import FieldDataPanel from "./FieldDataPanel";
import SampleRecords from "./SampleRecords";
import Timeline from "./Timeline";
import { useFieldStore } from "@/store/fieldStore";
import { Zap } from "lucide-react";

export default function Sidebar() {
  const overlapDetected = useFieldStore((s) => s.overlapDetected);
  const charges = useFieldStore((s) => s.charges);

  return (
    <div className="h-full flex flex-col bg-[#0a0e27]/95 backdrop-blur-xl border-l border-white/10">
      <div className="p-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/30">
            <Zap size={14} className="text-cyan-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-wide" style={{ fontFamily: "Orbitron, monospace" }}>
              E-FIELD SANDBOX
            </h1>
            <p className="text-[9px] text-white/30">粒子电场沙盒</p>
          </div>
        </div>
        {overlapDetected && (
          <div className="mt-2 px-2 py-1 rounded bg-yellow-500/10 border border-yellow-500/20 text-[9px] text-yellow-300 flex items-center gap-1">
            <span>⚡</span> 电荷重叠保护已激活
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4 scrollbar-thin">
        <ChargeTable />
        <FieldDataPanel />
        <SampleRecords />
        <Timeline />
      </div>

      <div className="p-2 border-t border-white/10 text-center">
        <span className="text-[8px] text-white/20">
          {charges.length} 电荷 · 拖动电荷查看实时电场变化
        </span>
      </div>
    </div>
  );
}
