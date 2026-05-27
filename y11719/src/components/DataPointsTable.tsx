import { Plus, Trash2, Table2 } from 'lucide-react';
import { useExperimentStore } from '../store/useExperimentStore';
import { UnitSelector, timeUnitOptions, angularVelocityUnitOptions } from './UnitSelector';

export function DataPointsTable() {
  const {
    dataPoints,
    setDataPointTime,
    setDataPointTimeUnit,
    setDataPointAngularVelocity,
    setDataPointAngularVelocityUnit,
    setDataPointValid,
    addDataPoint,
    removeDataPoint,
    activeDataPointIndex,
    setActiveDataPointIndex,
  } = useExperimentStore();

  return (
    <div className="bg-slate-800 rounded-lg p-4 shadow-lg border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Table2 className="w-5 h-5 text-teal-400" />
          <h3 className="text-lg font-semibold text-slate-100">实验数据</h3>
        </div>
        <button
          onClick={addDataPoint}
          className="flex items-center gap-1 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          添加
        </button>
      </div>

      <div className="overflow-x-auto max-h-80 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-800">
            <tr className="text-slate-400 border-b border-slate-700">
              <th className="py-2 px-2 text-left">#</th>
              <th className="py-2 px-2 text-left">时间</th>
              <th className="py-2 px-2 text-left">单位</th>
              <th className="py-2 px-2 text-left">角速度</th>
              <th className="py-2 px-2 text-left">单位</th>
              <th className="py-2 px-2 text-center">有效</th>
              <th className="py-2 px-2 text-center">操作</th>
            </tr>
          </thead>
          <tbody>
            {dataPoints.map((point, index) => (
              <tr
                key={point.index}
                onMouseEnter={() => setActiveDataPointIndex(index)}
                onMouseLeave={() => setActiveDataPointIndex(null)}
                className={`border-b border-slate-700/50 transition-colors ${
                  !point.isValid ? 'opacity-50' : ''
                } ${activeDataPointIndex === index ? 'bg-slate-700/50' : ''}`}
              >
                <td className="py-2 px-2 text-slate-400">{index + 1}</td>
                <td className="py-2 px-2">
                  <input
                    type="number"
                    value={point.time}
                    onChange={(e) => setDataPointTime(index, parseFloat(e.target.value) || 0)}
                    step="0.1"
                    min="0"
                    className="w-20 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </td>
                <td className="py-2 px-2">
                  <UnitSelector
                    value={point.timeUnit}
                    onChange={(unit) => setDataPointTimeUnit(index, unit)}
                    options={timeUnitOptions}
                  />
                </td>
                <td className="py-2 px-2">
                  <input
                    type="number"
                    value={point.angularVelocity}
                    onChange={(e) => setDataPointAngularVelocity(index, parseFloat(e.target.value) || 0)}
                    step="0.1"
                    min="0"
                    className="w-20 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </td>
                <td className="py-2 px-2">
                  <UnitSelector
                    value={point.angularVelocityUnit}
                    onChange={(unit) => setDataPointAngularVelocityUnit(index, unit)}
                    options={angularVelocityUnitOptions}
                  />
                </td>
                <td className="py-2 px-2 text-center">
                  <input
                    type="checkbox"
                    checked={point.isValid}
                    onChange={(e) => setDataPointValid(index, e.target.checked)}
                    className="w-4 h-4 accent-teal-500 cursor-pointer"
                  />
                </td>
                <td className="py-2 px-2 text-center">
                  <button
                    onClick={() => removeDataPoint(index)}
                    className="p-1 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded transition-colors"
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
