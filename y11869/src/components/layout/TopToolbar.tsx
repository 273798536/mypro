import { useState } from 'react';
import { Ship, Users, Filter, Camera, RotateCcw, Download, Save, Eye } from 'lucide-react';
import { useYardStore } from '@/store/yardStore';

export function TopToolbar() {
  const {
    voyages,
    currentVoyageId,
    setCurrentVoyage,
    viewConfigs,
    saveView,
    calculateImpact,
    clearImpact,
    isImpactMode,
    modifiedSlotId,
  } = useYardStore();

  const [showViewMenu, setShowViewMenu] = useState(false);
  const [viewName, setViewName] = useState('');

  const currentVoyage = voyages.find(v => v.id === currentVoyageId);

  const handleRecalculate = () => {
    if (modifiedSlotId) {
      calculateImpact(modifiedSlotId);
    }
  };

  const handleSaveView = () => {
    if (viewName.trim()) {
      saveView(viewName, [15, 12, 10], [6, 0, 3]);
      setViewName('');
      setShowViewMenu(false);
    }
  };

  return (
    <div className="h-14 bg-yard-darker/95 border-b border-yard-light/30 flex items-center px-4 gap-4 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <h1 className="text-neutral-light font-mono text-lg font-bold tracking-wider">
          港口堆场箱位沙盘
        </h1>
      </div>

      <div className="h-8 w-px bg-yard-light/30" />

      <div className="flex items-center gap-2">
        <Ship className="w-4 h-4 text-neutral-gray" />
        <select
          value={currentVoyageId || ''}
          onChange={(e) => setCurrentVoyage(e.target.value || null)}
          className="bg-yard-dark border border-yard-light/30 text-neutral-light text-sm px-3 py-1.5 rounded focus:outline-none focus:border-accent-blue font-mono"
        >
          <option value="">全部船期</option>
          {voyages.map((voyage) => (
            <option key={voyage.id} value={voyage.id}>
              {voyage.vesselName} - {voyage.voyageNo}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-neutral-gray" />
        <select className="bg-yard-dark border border-yard-light/30 text-neutral-light text-sm px-3 py-1.5 rounded focus:outline-none focus:border-accent-blue font-mono">
          <option>甲班</option>
          <option>乙班</option>
          <option>丙班</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-neutral-gray" />
        <select className="bg-yard-dark border border-yard-light/30 text-neutral-light text-sm px-3 py-1.5 rounded focus:outline-none focus:border-accent-blue font-mono">
          <option>全部作业</option>
          <option>装船</option>
          <option>卸船</option>
          <option>移箱</option>
        </select>
      </div>

      <div className="h-8 w-px bg-yard-light/30" />

      <div className="relative">
        <button
          onClick={() => setShowViewMenu(!showViewMenu)}
          className="flex items-center gap-2 bg-yard-dark hover:bg-yard-light/20 border border-yard-light/30 text-neutral-light text-sm px-3 py-1.5 rounded transition-colors"
        >
          <Camera className="w-4 h-4" />
          视角
        </button>
        
        {showViewMenu && (
          <div className="absolute top-full left-0 mt-2 bg-yard-darker border border-yard-light/30 rounded p-3 min-w-64 z-50">
            <div className="mb-3">
              <div className="text-xs text-neutral-gray mb-1">保存新视角</div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={viewName}
                  onChange={(e) => setViewName(e.target.value)}
                  placeholder="视角名称"
                  className="flex-1 bg-yard-dark border border-yard-light/30 text-neutral-light text-sm px-2 py-1 rounded focus:outline-none focus:border-accent-blue"
                />
                <button
                  onClick={handleSaveView}
                  className="bg-accent-blue hover:bg-accent-blue/80 text-white text-sm px-3 py-1 rounded transition-colors"
                >
                  <Save className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="text-xs text-neutral-gray mb-1">已保存视角</div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {viewConfigs.map((view) => (
                <button
                  key={view.id}
                  className="w-full flex items-center gap-2 text-left text-sm text-neutral-light hover:bg-yard-light/20 px-2 py-1.5 rounded transition-colors"
                >
                  <Eye className="w-3 h-3" />
                  {view.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1" />

      {isImpactMode ? (
        <button
          onClick={clearImpact}
          className="flex items-center gap-2 bg-accent-orange hover:bg-accent-orange/80 text-white text-sm px-4 py-1.5 rounded transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          清除影响
        </button>
      ) : (
        <button
          onClick={handleRecalculate}
          disabled={!modifiedSlotId}
          className={`flex items-center gap-2 text-sm px-4 py-1.5 rounded transition-colors ${
            modifiedSlotId
              ? 'bg-accent-green hover:bg-accent-green/80 text-white'
              : 'bg-yard-dark text-neutral-gray cursor-not-allowed border border-yard-light/30'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          重算
        </button>
      )}

      <button className="flex items-center gap-2 bg-yard-dark hover:bg-yard-light/20 border border-yard-light/30 text-neutral-light text-sm px-4 py-1.5 rounded transition-colors">
        <Download className="w-4 h-4" />
        导出
      </button>

      {currentVoyage && (
        <div className="flex items-center gap-2 text-xs text-neutral-gray font-mono">
          <span>ETA:</span>
          <span className="text-neutral-light">{currentVoyage.eta.split('T')[0]}</span>
        </div>
      )}
    </div>
  );
}
