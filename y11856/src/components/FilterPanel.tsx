import { useState, useMemo, useCallback } from 'react';
import { useStore } from '@/store/useStore';
import { CATEGORY_COLORS, MISJUDGED_COLOR } from '@/types';
import { Check, X } from 'lucide-react';

const CATEGORIES = ['A', 'B', 'C'];

export default function FilterPanel() {
  const selectedCategories = useStore((s) => s.selectedCategories);
  const samples = useStore((s) => s.samples);
  const toggleCategory = useStore((s) => s.toggleCategory);

  const [showMisjudged, setShowMisjudged] = useState(true);

  const allSelected = CATEGORIES.every((c) => selectedCategories.has(c));

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of CATEGORIES) {
      map[c] = samples.filter((s) => s.trueLabel === c).length;
    }
    return map;
  }, [samples]);

  const misjudgedCount = useMemo(
    () => samples.filter((s) => s.isMisjudged).length,
    [samples],
  );

  const handleToggleAll = useCallback(() => {
    if (allSelected) {
      CATEGORIES.forEach((c) => {
        if (selectedCategories.has(c)) toggleCategory(c);
      });
    } else {
      CATEGORIES.forEach((c) => {
        if (!selectedCategories.has(c)) toggleCategory(c);
      });
    }
  }, [allSelected, selectedCategories, toggleCategory]);

  return (
    <div className="flex flex-col gap-4 bg-[#0f1629] border-r border-[#1a2040] p-4 text-white/80">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wide text-white/50" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          类别筛选
        </span>
        <button
          onClick={handleToggleAll}
          className="text-xs text-[#4d9fff] hover:text-[#3d8fee] transition-colors"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {allSelected ? '全不选' : '全选'}
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategories.has(cat);
          const color = CATEGORY_COLORS[cat] ?? '#888';
          return (
            <label
              key={cat}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <span
                className="flex items-center justify-center w-4 h-4 rounded border transition-colors"
                style={{
                  borderColor: isSelected ? color : '#2a3060',
                  backgroundColor: isSelected ? `${color}25` : 'transparent',
                }}
              >
                {isSelected && <Check size={10} style={{ color }} />}
              </span>
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-sm flex-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {cat}
              </span>
              <span className="text-xs text-white/40" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {counts[cat] ?? 0}
              </span>
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleCategory(cat)}
                className="sr-only"
              />
            </label>
          );
        })}
      </div>

      <div className="border-t border-[#1a2040] pt-3">
        <label className="flex items-center gap-3 cursor-pointer group">
          <span
            className="flex items-center justify-center w-4 h-4 rounded border transition-colors"
            style={{
              borderColor: showMisjudged ? MISJUDGED_COLOR : '#2a3060',
              backgroundColor: showMisjudged ? `${MISJUDGED_COLOR}25` : 'transparent',
            }}
          >
            {showMisjudged && <X size={10} style={{ color: MISJUDGED_COLOR }} />}
          </span>
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: MISJUDGED_COLOR }}
          />
          <span className="text-sm flex-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            误判点
          </span>
          <span className="text-xs text-white/40" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {misjudgedCount}
          </span>
          <input
            type="checkbox"
            checked={showMisjudged}
            onChange={() => setShowMisjudged(!showMisjudged)}
            className="sr-only"
          />
        </label>
      </div>
    </div>
  );
}
