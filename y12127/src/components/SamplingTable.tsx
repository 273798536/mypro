import { useState, useCallback } from 'react';
import { Plus, Trash2, AlertTriangle } from 'lucide-react';
import type { SamplingPoint } from '@/types';
import { detectDuplicateX } from '@/utils/interpolation';
import { useExperimentStore } from '@/store/experimentStore';

export default function SamplingTable() {
  const points = useExperimentStore((s) => s.points);
  const setPoints = useExperimentStore((s) => s.setPoints);
  const addPoint = useExperimentStore((s) => s.addPoint);
  const removePoint = useExperimentStore((s) => s.removePoint);
  const updatePoint = useExperimentStore((s) => s.updatePoint);
  const [newX, setNewX] = useState('');
  const [newY, setNewY] = useState('');
  const [hoveredDup, setHoveredDup] = useState<number | null>(null);

  const { clean, duplicates } = detectDuplicateX(points);
  const duplicateXs = new Set(duplicates.map((d) => d.x));

  const handleAdd = useCallback(() => {
    const x = parseFloat(newX);
    const y = parseFloat(newY);
    if (isNaN(x) || isNaN(y)) return;
    addPoint({ x, y });
    setNewX('');
    setNewY('');
  }, [newX, newY, addPoint]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleAdd();
    },
    [handleAdd]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const text = e.clipboardData.getData('text');
      const lines = text.trim().split('\n');
      const parsed: SamplingPoint[] = [];
      for (const line of lines) {
        const parts = line.trim().split(/[\s,;]+/);
        if (parts.length >= 2) {
          const x = parseFloat(parts[0]);
          const y = parseFloat(parts[1]);
          if (!isNaN(x) && !isNaN(y)) parsed.push({ x, y });
        }
      }
      if (parsed.length > 0) {
        setPoints([...points, ...parsed]);
        e.preventDefault();
      }
    },
    [points, setPoints]
  );

  return (
    <div className="bg-[#1a1f36] rounded-lg border border-white/10 overflow-hidden">
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <h3 className="text-sm font-medium text-white/80">采样点 ({clean.length} 有效)</h3>
        {duplicates.length > 0 && (
          <span className="text-xs text-rose-400 flex items-center gap-1">
            <AlertTriangle size={12} />
            {duplicates.length} 个重复值已拦截
          </span>
        )}
      </div>

      <div className="max-h-48 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-[#1a1f36]">
            <tr className="text-white/50">
              <th className="px-3 py-1.5 text-left font-medium">#</th>
              <th className="px-3 py-1.5 text-right font-medium">x</th>
              <th className="px-3 py-1.5 text-right font-medium">y</th>
              <th className="px-3 py-1.5 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {points.map((p, i) => {
              const isDup = duplicateXs.has(p.x);
              return (
                <tr
                  key={i}
                  className={`border-t border-white/5 ${
                    isDup ? 'bg-rose-500/20' : 'hover:bg-white/5'
                  }`}
                  onMouseEnter={() => isDup && setHoveredDup(i)}
                  onMouseLeave={() => setHoveredDup(null)}
                >
                  <td className="px-3 py-1.5 text-white/30">{i + 1}</td>
                  <td className="px-3 py-1.5 text-right">
                    <input
                      type="number"
                      step="any"
                      value={p.x}
                      onChange={(e) =>
                        updatePoint(i, { ...p, x: parseFloat(e.target.value) || 0 })
                      }
                      className={`w-20 bg-transparent text-right text-white/90 outline-none ${
                        isDup ? 'text-rose-400' : ''
                      }`}
                    />
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    <input
                      type="number"
                      step="any"
                      value={p.y}
                      onChange={(e) =>
                        updatePoint(i, { ...p, y: parseFloat(e.target.value) || 0 })
                      }
                      className="w-20 bg-transparent text-right text-white/90 outline-none"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <button
                      onClick={() => removePoint(i)}
                      className="text-white/30 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {hoveredDup !== null && duplicates.length > 0 && (
        <div className="px-4 py-2 bg-rose-500/10 border-t border-rose-500/20 text-xs text-rose-300">
          ⛔ x={points[hoveredDup]?.x} 重复出现。Lagrange 插值基函数 L_i(x) = ∏(x-x_j)/(x_i-x_j) 在
          x_i = x_j 时分母为零，无法定义，因此重复 x 值不能参与插值计算。
        </div>
      )}

      <div className="px-4 py-3 border-t border-white/10 flex gap-2">
        <input
          type="number"
          step="any"
          placeholder="x"
          value={newX}
          onChange={(e) => setNewX(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          className="w-20 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white/90 outline-none focus:border-amber-500/50"
        />
        <input
          type="number"
          step="any"
          placeholder="y"
          value={newY}
          onChange={(e) => setNewY(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-20 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white/90 outline-none focus:border-amber-500/50"
        />
        <button
          onClick={handleAdd}
          className="flex items-center gap-1 px-3 py-1 bg-amber-500/20 text-amber-400 rounded text-xs hover:bg-amber-500/30 transition-colors"
        >
          <Plus size={12} />
          添加
        </button>
      </div>
    </div>
  );
}
