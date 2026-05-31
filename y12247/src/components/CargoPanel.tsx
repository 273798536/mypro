import type { Cargo } from '@/types';
import { CARGO_COLORS, CARGO_LABELS, CATEGORY_ICONS } from '@/types';

interface CargoPanelProps {
  cargos: Cargo[];
  selectedCargoId: string | null;
  onSelect: (cargoId: string | null) => void;
  onUnload: (cargoId: string) => void;
  submitted: boolean;
}

export default function CargoPanel({
  cargos,
  selectedCargoId,
  onSelect,
  onUnload,
  submitted,
}: CargoPanelProps) {
  return (
    <div className="w-72 bg-slate-900 border-l border-slate-700 flex flex-col h-full">
      <div className="p-3 border-b border-slate-700">
        <h2 className="text-sm font-semibold text-slate-200 tracking-wide">货物清单</h2>
        <p className="text-xs text-slate-400 mt-1">
          {cargos.filter((c) => c.loaded).length} / {cargos.length} 已装载
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {cargos.map((cargo) => {
          const color = CARGO_COLORS[cargo.category];
          const isLoaded = cargo.loaded;
          const isSelected = selectedCargoId === cargo.id;

          return (
            <div
              key={cargo.id}
              onClick={() => {
                if (!isLoaded && !submitted) {
                  onSelect(isSelected ? null : cargo.id);
                }
              }}
              className={`relative bg-slate-800 rounded-lg p-3 border-l-4 transition-all ${
                isLoaded
                  ? 'opacity-60 cursor-default'
                  : isSelected
                    ? 'ring-2 ring-orange-400 shadow-lg shadow-orange-400/20 cursor-pointer'
                    : 'hover:bg-slate-700 cursor-pointer'
              }`}
              style={{ borderLeftColor: color }}
            >
              {isSelected && !isLoaded && (
                <span className="absolute top-1.5 right-1.5 text-[10px] bg-orange-500/80 text-white px-1.5 py-0.5 rounded-full animate-pulse">
                  点击甲板放置
                </span>
              )}
              {isLoaded && (
                <span className="absolute top-1.5 right-1.5 text-[10px] bg-emerald-600/80 text-white px-1.5 py-0.5 rounded-full">
                  已装载
                  {cargo.position != null && (
                    <span className="ml-0.5">
                      R{cargo.position.row}C{cargo.position.col}
                    </span>
                  )}
                </span>
              )}
              <div className="flex items-start gap-2">
                <span className="text-lg leading-none mt-0.5">{CATEGORY_ICONS[cargo.category]}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{cargo.name}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                    <span>{cargo.weight} 吨</span>
                    <span className="text-slate-600">·</span>
                    <span>{cargo.volume} m³</span>
                  </div>
                  <span
                    className="inline-block mt-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                    style={{
                      backgroundColor: `${color}22`,
                      color,
                    }}
                  >
                    {CARGO_LABELS[cargo.category]}
                  </span>
                </div>
                {isLoaded && !submitted && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onUnload(cargo.id); }}
                    className="shrink-0 mt-0.5 p-1 text-slate-500 hover:text-red-400 transition-colors"
                    title="卸载"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-4 h-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {selectedCargoId && !submitted && (
        <div className="p-3 border-t border-slate-700 bg-orange-500/10">
          <p className="text-xs text-orange-300">
            🎯 已选中货物，点击甲板网格放置，再次点击货物取消选择
          </p>
        </div>
      )}
    </div>
  );
}
