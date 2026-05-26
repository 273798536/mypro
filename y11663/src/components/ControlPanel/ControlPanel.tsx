
import { useState } from 'react';
import { Settings, RotateCw, Wind, Save, Camera, Download } from 'lucide-react';
import type { Airfoil, DataSource } from '../../types';
import { AIRFOILS } from '../../data/airfoils';
import { useExperimentStore } from '../../store/useExperimentStore';

interface ControlPanelProps {
  onScreenshot?: () => void;
}

export function ControlPanel({ onScreenshot }: ControlPanelProps) {
  const {
    airfoil,
    params,
    setAirfoil,
    setAngleOfAttack,
    setVelocity,
    saveRecord,
  } = useExperimentStore();

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveNotes, setSaveNotes] = useState('');
  const [saveSource, setSaveSource] = useState<DataSource>('manual');

  const handleSave = () => {
    saveRecord(saveSource, saveNotes);
    setShowSaveModal(false);
    setSaveNotes('');
  };

  return (
    <div className="bg-slate-800/90 backdrop-blur-sm rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-2 text-cyan-400 font-semibold border-b border-slate-700 pb-2">
        <Settings size={18} />
        <span>实验参数控制</span>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-slate-300 mb-2">翼型选择</label>
          <select
            value={airfoil.id}
            onChange={(e) => {
              const selected = AIRFOILS.find((a) => a.id === e.target.value);
              if (selected) setAirfoil(selected);
            }}
            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
          >
            {AIRFOILS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-slate-300 mb-2 flex items-center gap-2">
            <RotateCw size={14} />
            迎角: {params.angleOfAttack.toFixed(1)}°
          </label>
          <input
            type="range"
            min="-50"
            max="50"
            step="0.5"
            value={params.angleOfAttack}
            onChange={(e) => setAngleOfAttack(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>-50°</span>
            <span className="text-yellow-500">警告区</span>
            <span>50°</span>
          </div>
        </div>

        <div>
          <label className="block text-sm text-slate-300 mb-2 flex items-center gap-2">
            <Wind size={14} />
            流速: {params.velocity.toFixed(0)} m/s
          </label>
          <input
            type="range"
            min="0"
            max="150"
            step="1"
            value={params.velocity}
            onChange={(e) => setVelocity(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>0</span>
            <span className="text-yellow-500">警告区</span>
            <span>150 m/s</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-slate-700/50 rounded p-2">
            <div className="text-slate-400">雷诺数</div>
            <div className="text-white font-mono">
              {(params.reynoldsNumber / 1e6).toFixed(2)}e6
            </div>
          </div>
          <div className="bg-slate-700/50 rounded p-2">
            <div className="text-slate-400">空气密度</div>
            <div className="text-white font-mono">
              {params.airDensity.toFixed(3)} kg/m³
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={() => setShowSaveModal(true)}
            className="flex-1 flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white py-2 px-4 rounded transition-colors text-sm"
          >
            <Save size={16} />
            保存记录
          </button>
          <button
            onClick={onScreenshot}
            className="flex-1 flex items-center justify-center gap-2 bg-slate-600 hover:bg-slate-500 text-white py-2 px-4 rounded transition-colors text-sm"
          >
            <Camera size={16} />
            截图
          </button>
        </div>
      </div>

      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 w-96 space-y-4">
            <h3 className="text-lg font-semibold text-white">保存实验记录</h3>

            <div>
              <label className="block text-sm text-slate-300 mb-2">数据来源</label>
              <select
                value={saveSource}
                onChange={(e) => setSaveSource(e.target.value as DataSource)}
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
              >
                <option value="manual">手动输入</option>
                <option value="import">导入数据</option>
                <option value="lecture">讲义截图</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-2">备注</label>
              <textarea
                value={saveNotes}
                onChange={(e) => setSaveNotes(e.target.value)}
                placeholder="输入实验备注..."
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white h-24 resize-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowSaveModal(false)}
                className="flex-1 bg-slate-600 hover:bg-slate-500 text-white py-2 rounded"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white py-2 rounded"
              >
                确认保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
