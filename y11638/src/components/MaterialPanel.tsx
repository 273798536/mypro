import { useGameStore } from '../store/useGameStore';
import { Check, Upload, Download } from 'lucide-react';

export default function MaterialPanel() {
  const {
    materials,
    selectedMaterial,
    setSelectedMaterial,
    setShowImportDialog
  } = useGameStore();
  
  return (
    <div className="bg-slate-800/80 backdrop-blur-sm rounded-xl p-4 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">材料选择</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImportDialog(true)}
            className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors text-slate-300 hover:text-white"
            title="导入材料"
          >
            <Upload size={16} />
          </button>
          <button
            onClick={() => {
              const data = JSON.stringify(materials, null, 2);
              const blob = new Blob([data], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'materials.json';
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors text-slate-300 hover:text-white"
            title="导出材料"
          >
            <Download size={16} />
          </button>
        </div>
      </div>
      
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {materials.map(material => {
          const isSelected = selectedMaterial === material.id;
          return (
            <button
              key={material.id}
              onClick={() => setSelectedMaterial(material.id)}
              className={`w-full p-3 rounded-lg text-left transition-all ${
                isSelected
                  ? 'bg-cyan-500/20 border-2 border-cyan-400'
                  : 'bg-slate-700/50 border-2 border-transparent hover:bg-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-6 h-6 rounded"
                    style={{ backgroundColor: material.color }}
                  />
                  <div>
                    <div className="font-medium text-white">{material.name}</div>
                    {material.source && (
                      <div className="text-xs text-slate-400">{material.source}</div>
                    )}
                  </div>
                </div>
                {isSelected && <Check className="text-cyan-400" size={18} />}
              </div>
              
              <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                <div className="text-slate-400">
                  成本: <span className="text-yellow-400">{material.costPerMeter}/m</span>
                </div>
                <div className="text-slate-400">
                  密度: <span className="text-blue-400">{material.density}</span>
                </div>
                <div className="text-slate-400">
                  抗压: <span className="text-green-400">{material.maxCompression}</span>
                </div>
                <div className="text-slate-400">
                  抗拉: <span className="text-red-400">{material.maxTension}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
