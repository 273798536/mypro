import { useFlightStore } from '../store/useFlightStore';
import { aircraftSpecs } from '../data/aircraft';
import { Save, RotateCcw, History, FileDown, Plane, MapPin } from 'lucide-react';
import { useState } from 'react';

interface ToolbarProps {
  onExport: () => void;
  onShowHistory: () => void;
}

const Toolbar = ({ onExport, onShowHistory }: ToolbarProps) => {
  const {
    currentRoute,
    updateRouteName,
    setCruiseAlt,
    setAircraftSpec,
    aircraftSpec,
    resetRoute,
    saveRoute,
  } = useFlightStore();

  const [routeName, setRouteName] = useState(currentRoute?.name || '新航线规划');

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRouteName(e.target.value);
    updateRouteName(e.target.value);
  };

  const handleAltChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const alt = parseInt(e.target.value);
    if (!isNaN(alt)) {
      setCruiseAlt(alt);
    }
  };

  const handleAircraftChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const spec = aircraftSpecs.find(a => a.type === e.target.value);
    if (spec) {
      setAircraftSpec(spec);
    }
  };

  const handleSave = () => {
    saveRoute('手动保存航线');
    alert('航线已保存到历史记录！');
  };

  if (!currentRoute) return null;

  return (
    <div className="absolute top-0 left-0 right-0 z-10 bg-slate-900/90 backdrop-blur-md border-b border-slate-700">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Plane className="w-6 h-6 text-blue-400" />
            <h1 className="text-xl font-bold text-white">航空航线规划系统</h1>
          </div>
          <div className="h-6 w-px bg-slate-600" />
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-green-400" />
            <input
              type="text"
              value={routeName}
              onChange={handleNameChange}
              className="bg-slate-800 text-white px-3 py-1 rounded border border-slate-600 focus:border-blue-500 focus:outline-none text-sm"
              placeholder="航线名称"
            />
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <label className="text-slate-400 text-sm">巡航高度:</label>
            <input
              type="number"
              value={currentRoute.cruiseAlt}
              onChange={handleAltChange}
              min={0}
              max={15000}
              step={500}
              className="bg-slate-800 text-white px-2 py-1 rounded border border-slate-600 focus:border-blue-500 focus:outline-none text-sm w-24"
            />
            <span className="text-slate-400 text-sm">米</span>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-slate-400 text-sm">机型:</label>
            <select
              value={aircraftSpec.type}
              onChange={handleAircraftChange}
              className="bg-slate-800 text-white px-3 py-1 rounded border border-slate-600 focus:border-blue-500 focus:outline-none text-sm"
            >
              {aircraftSpecs.map(spec => (
                <option key={spec.type} value={spec.type}>
                  {spec.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
            >
              <Save className="w-4 h-4" />
              保存
            </button>
            <button
              onClick={resetRoute}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm"
            >
              <RotateCcw className="w-4 h-4" />
              重置
            </button>
            <button
              onClick={onShowHistory}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm"
            >
              <History className="w-4 h-4" />
              历史
            </button>
            <button
              onClick={onExport}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm"
            >
              <FileDown className="w-4 h-4" />
              导出报告
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Toolbar;
