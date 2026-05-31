import { useStore } from '@/store/useStore';
import { Layers, BookOpen, ArrowRight } from 'lucide-react';

export default function MaterialLibrary() {
  const { materials, applyMaterialToForm } = useStore();

  const categories = [...new Set(materials.map((m) => m.category))];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Layers className="w-5 h-5 text-blue-400" />
        <h3 className="text-white font-semibold">材料参数库</h3>
      </div>

      <div className="space-y-4 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
        {categories.map((category) => (
          <div key={category}>
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">
              {category}
            </div>
            <div className="space-y-2">
              {materials
                .filter((m) => m.category === category)
                .map((material) => (
                  <div
                    key={material.id}
                    className="bg-slate-800/50 border border-slate-700 rounded p-3 hover:border-slate-600 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="text-white text-sm font-medium">
                          {material.name}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-1">
                          <BookOpen className="w-3 h-3" />
                          {material.source}
                        </div>
                      </div>
                      <button
                        onClick={() => applyMaterialToForm(material)}
                        className="flex items-center gap-1 px-2 py-1 bg-slate-700 hover:bg-blue-600 text-slate-300 hover:text-white rounded text-xs transition-colors"
                      >
                        选用
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      <div>
                        <span className="text-slate-500">密度: </span>
                        <span className="text-slate-300 font-mono">
                          {material.density} kg/m³
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">热导率: </span>
                        <span className="text-slate-300 font-mono">
                          {material.thermalConductivity} W/(m·K)
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
