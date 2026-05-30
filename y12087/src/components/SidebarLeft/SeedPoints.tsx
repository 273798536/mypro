import { useCallback, useState } from 'react';
import { Plus, Trash2, MapPin, Upload, Download } from 'lucide-react';
import type { SeedPoint } from '@/types';
import { useVectorFieldStore } from '@/store/vectorFieldStore';
import { generateId } from '@/utils/math';
import { saveSeedPoints, importFromJson, exportToJson } from '@/utils/storage';
import { generateGridSeedPoints } from '@/data/seedPoints';
import { clsx } from '@/lib/utils';

interface SeedPointRowProps {
  point: SeedPoint;
  onDelete: () => void;
  isFirst?: boolean;
}

function SeedPointRow({ point, onDelete, isFirst }: SeedPointRowProps) {
  return (
    <div
      className={clsx(
        'flex items-center gap-2 p-2 rounded-lg text-xs font-mono transition-colors',
        isFirst
          ? 'bg-slate-700/50 border border-slate-600'
          : 'bg-slate-800/30 border border-transparent hover:bg-slate-700/30'
      )}
    >
      <MapPin size={12} className="text-blue-400 flex-shrink-0" />
      <span className="text-slate-500 w-6 flex-shrink-0">
        {point.label?.replace('种子点 ', '#') || '#?'}
      </span>
      <div className="flex-1 grid grid-cols-3 gap-1 text-[10px]">
        <span className="text-cyan-400">{point.x.toFixed(2)}</span>
        <span className="text-emerald-400">{point.y.toFixed(2)}</span>
        <span className="text-violet-400">{point.z.toFixed(2)}</span>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="p-1 hover:bg-red-500/20 rounded transition-colors text-slate-500 hover:text-red-400"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}

export function SeedPoints() {
  const seedPoints = useVectorFieldStore((s) => s.seedPoints);
  const setSeedPoints = useVectorFieldStore((s) => s.setSeedPoints);
  const addSeedPoint = useVectorFieldStore((s) => s.addSeedPoint);
  const removeSeedPoint = useVectorFieldStore((s) => s.removeSeedPoint);
  const currentFormula = useVectorFieldStore((s) =>
    s.formulas.find((f) => f.id === s.currentFormulaId)
  );

  const [newPoint, setNewPoint] = useState({ x: 0, y: 0, z: 0 });

  const handleAddPoint = useCallback(() => {
    const point: SeedPoint = {
      id: generateId('seed'),
      x: newPoint.x,
      y: newPoint.y,
      z: newPoint.z,
      label: `种子点 ${seedPoints.length + 1}`,
    };
    addSeedPoint(point);
    saveSeedPoints([...seedPoints, point]);
  }, [newPoint, seedPoints, addSeedPoint]);

  const handleDeletePoint = useCallback(
    (id: string) => {
      removeSeedPoint(id);
      saveSeedPoints(seedPoints.filter((p) => p.id !== id));
    },
    [seedPoints, removeSeedPoint]
  );

  const handleImport = useCallback(async () => {
    const data = await importFromJson<SeedPoint[]>();
    if (data && Array.isArray(data)) {
      setSeedPoints(data);
      saveSeedPoints(data);
    }
  }, [setSeedPoints]);

  const handleExport = useCallback(() => {
    exportToJson(seedPoints, `seed-points-${Date.now()}.json`);
  }, [seedPoints]);

  const handleResetToDefault = useCallback(() => {
    if (currentFormula) {
      const newPoints = generateGridSeedPoints(
        currentFormula.params.xRange,
        currentFormula.params.yRange,
        currentFormula.params.zRange,
        10,
        42
      );
      setSeedPoints(newPoints);
      saveSeedPoints(newPoints);
    }
  }, [currentFormula, setSeedPoints]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          种子点 ({seedPoints.length})
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={handleImport}
            className="p-1.5 hover:bg-slate-700 rounded transition-colors text-slate-400 hover:text-slate-300"
            title="导入种子点"
          >
            <Upload size={14} />
          </button>
          <button
            onClick={handleExport}
            className="p-1.5 hover:bg-slate-700 rounded transition-colors text-slate-400 hover:text-slate-300"
            title="导出种子点"
          >
            <Download size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1 mb-2">
        <input
          type="number"
          placeholder="X"
          value={newPoint.x}
          onChange={(e) =>
            setNewPoint((p) => ({ ...p, x: parseFloat(e.target.value) || 0 }))
          }
          className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-cyan-400 focus:outline-none focus:border-blue-500"
          step="0.1"
        />
        <input
          type="number"
          placeholder="Y"
          value={newPoint.y}
          onChange={(e) =>
            setNewPoint((p) => ({ ...p, y: parseFloat(e.target.value) || 0 }))
          }
          className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-emerald-400 focus:outline-none focus:border-blue-500"
          step="0.1"
        />
        <input
          type="number"
          placeholder="Z"
          value={newPoint.z}
          onChange={(e) =>
            setNewPoint((p) => ({ ...p, z: parseFloat(e.target.value) || 0 }))
          }
          className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-violet-400 focus:outline-none focus:border-blue-500"
          step="0.1"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleAddPoint}
          className="flex-1 flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-500 text-white text-xs py-2 px-3 rounded-lg transition-colors"
        >
          <Plus size={14} />
          添加种子点
        </button>
        <button
          onClick={handleResetToDefault}
          className="flex items-center justify-center gap-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs py-2 px-3 rounded-lg transition-colors"
        >
          重置
        </button>
      </div>

      <div className="space-y-1 max-h-[30vh] overflow-y-auto pr-1">
        {seedPoints.map((point, index) => (
          <SeedPointRow
            key={point.id}
            point={point}
            onDelete={() => handleDeletePoint(point.id)}
            isFirst={index === 0}
          />
        ))}
      </div>

      {seedPoints.length === 0 && (
        <div className="text-center text-slate-500 text-xs py-4">
          暂无种子点，请添加或导入
        </div>
      )}
    </div>
  );
}
