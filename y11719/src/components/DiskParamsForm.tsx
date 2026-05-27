import { Circle } from 'lucide-react';
import { useExperimentStore } from '../store/useExperimentStore';
import { UnitSelector, lengthUnitOptions, massUnitOptions } from './UnitSelector';

export function DiskParamsForm() {
  const {
    diskParams,
    setDiskRadius,
    setDiskRadiusUnit,
    setDiskMass,
    setDiskMassUnit,
  } = useExperimentStore();

  return (
    <div className="bg-slate-800 rounded-lg p-4 shadow-lg border border-slate-700">
      <div className="flex items-center gap-2 mb-4">
        <Circle className="w-5 h-5 text-teal-400" />
        <h3 className="text-lg font-semibold text-slate-100">转盘参数</h3>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-slate-400 mb-1">转盘半径</label>
          <div className="flex gap-2">
            <input
              type="number"
              value={diskParams.radius}
              onChange={(e) => setDiskRadius(parseFloat(e.target.value) || 0)}
              step="0.001"
              min="0"
              className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <UnitSelector
              value={diskParams.radiusUnit}
              onChange={setDiskRadiusUnit}
              options={lengthUnitOptions}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1">转盘质量</label>
          <div className="flex gap-2">
            <input
              type="number"
              value={diskParams.mass}
              onChange={(e) => setDiskMass(parseFloat(e.target.value) || 0)}
              step="0.01"
              min="0"
              className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <UnitSelector
              value={diskParams.massUnit}
              onChange={setDiskMassUnit}
              options={massUnitOptions}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
