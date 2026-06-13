import { SlidersHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useFilterStore } from "@/stores/filterStore";
import { cablewayObjects } from "@/utils/mockData";
import type { ObjectStatus, ObjectType } from "@/shared/types";

const FLOORS = Array.from(new Set(cablewayObjects.map((o) => o.floor))).sort();
const UNITS = Array.from(new Set(cablewayObjects.map((o) => o.unit))).sort();
const TYPES: { value: ObjectType; label: string }[] = [
  { value: "STATION", label: "站房" },
  { value: "TOWER", label: "支架" },
  { value: "CAR", label: "吊厢" },
  { value: "CABLE", label: "钢缆" },
];
const STATUSES: { value: ObjectStatus; label: string; color: string }[] = [
  { value: "NORMAL", label: "正常", color: "text-pass-400" },
  { value: "WARNING", label: "警告", color: "text-fix-400" },
  { value: "ERROR", label: "异常", color: "text-cable-400" },
];

export function FilterPanel() {
  const [collapsed, setCollapsed] = useState(false);
  const { filters, toggleFloor, toggleUnit, toggleType, toggleStatus, objects } =
    useFilterStore();

  const count = (arr: unknown[]) => (arr.length ? `(${arr.length})` : "");

  const Chip = ({
    active,
    onClick,
    children,
    color,
  }: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
    color?: string;
  }) => (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded text-[11px] font-mono border transition ${
        active
          ? "bg-cable-500/20 border-cable-500/60 text-cable-300 shadow-glow-cable"
          : "bg-mine-800/50 border-mine-600 text-silver-300 hover:border-mine-500"
      }`}
    >
      <span className={color}>{children}</span>
    </button>
  );

  return (
    <div
      className={`absolute left-0 top-14 bottom-28 z-20 transition-all duration-300 ${
        collapsed ? "w-10" : "w-64"
      }`}
    >
      <div className="h-full glass m-3 ml-3 rounded-lg border border-mine-700/60 flex flex-col overflow-hidden scan-bg">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-mine-700/60">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-cable-400" />
              <span className="font-display text-[13px] text-silver-200">
                筛选条件
              </span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-6 h-6 rounded flex items-center justify-center hover:bg-mine-700/60 text-silver-300"
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>
        {!collapsed && (
          <div className="flex-1 overflow-y-auto p-3 space-y-4 text-[12px]">
            <section>
              <div className="text-silver-400 text-[10px] font-mono mb-1.5 tracking-wider">
                楼层 FLOOR {count(filters.floors)}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {FLOORS.map((f) => (
                  <Chip
                    key={f}
                    active={filters.floors.includes(f)}
                    onClick={() => toggleFloor(f)}
                  >
                    {f}
                  </Chip>
                ))}
              </div>
            </section>
            <section>
              <div className="text-silver-400 text-[10px] font-mono mb-1.5 tracking-wider">
                单位 UNIT {count(filters.units)}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {UNITS.map((u) => (
                  <Chip
                    key={u}
                    active={filters.units.includes(u)}
                    onClick={() => toggleUnit(u)}
                  >
                    {u}
                  </Chip>
                ))}
              </div>
            </section>
            <section>
              <div className="text-silver-400 text-[10px] font-mono mb-1.5 tracking-wider">
                设备类型 TYPE {count(filters.types)}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {TYPES.map((t) => (
                  <Chip
                    key={t.value}
                    active={filters.types.includes(t.value)}
                    onClick={() => toggleType(t.value)}
                  >
                    {t.label}
                  </Chip>
                ))}
              </div>
            </section>
            <section>
              <div className="text-silver-400 text-[10px] font-mono mb-1.5 tracking-wider">
                运行状态 STATUS {count(filters.statuses)}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {STATUSES.map((s) => (
                  <Chip
                    key={s.value}
                    active={filters.statuses.includes(s.value)}
                    onClick={() => toggleStatus(s.value)}
                    color={s.color}
                  >
                    {s.label}
                  </Chip>
                ))}
              </div>
            </section>
            <section className="pt-2 border-t border-mine-700/50">
              <div className="text-silver-400 text-[10px] font-mono mb-1.5 tracking-wider">
                当前对象数 TOTAL
              </div>
              <div className="font-display text-2xl text-cable-400">
                {objects.length}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
