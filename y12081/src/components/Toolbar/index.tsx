import { useState } from 'react';
import { RotateCcw, Camera, Play, Pause, Filter, Save } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import type { RecordStatus } from '../../types';

const statusOptions: { value: RecordStatus | 'all'; label: string }[] = [
  { value: 'all', label: '全部状态' },
  { value: 'normal', label: '正常' },
  { value: 'warning', label: '预警' },
  { value: 'danger', label: '危险' },
];

export function Toolbar() {
  const [showViewMenu, setShowViewMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  
  const savedViews = useAppStore((state) => state.savedViews);
  const autoRotate = useAppStore((state) => state.autoRotate);
  const filterStatus = useAppStore((state) => state.filterStatus);
  const toggleAutoRotate = useAppStore((state) => state.toggleAutoRotate);
  const setFilterStatus = useAppStore((state) => state.setFilterStatus);

  const currentFilterLabel = statusOptions.find(o => o.value === filterStatus)?.label || '全部状态';

  return (
    <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
      <div className="flex items-center gap-1 bg-slate-800/90 backdrop-blur-sm rounded-lg p-1 border border-slate-700">
        <button
          onClick={toggleAutoRotate}
          className={`p-2 rounded-md transition-colors ${
            autoRotate ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'
          }`}
          title={autoRotate ? '停止旋转' : '自动旋转'}
        >
          {autoRotate ? <Pause size={18} /> : <Play size={18} />}
        </button>

        <button
          className="p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          title="重置视角"
        >
          <RotateCcw size={18} />
        </button>

        <div className="relative">
          <button
            onClick={() => {
              setShowViewMenu(!showViewMenu);
              setShowFilterMenu(false);
            }}
            className="p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 transition-colors flex items-center gap-1"
            title="视角选择"
          >
            <Camera size={18} />
          </button>
          
          {showViewMenu && (
            <div className="absolute top-full left-0 mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden min-w-32">
              {savedViews.map((view) => (
                <button
                  key={view.id}
                  className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 transition-colors"
                  onClick={() => setShowViewMenu(false)}
                >
                  {view.name}
                </button>
              ))}
              <div className="border-t border-slate-700">
                <button
                  className="w-full px-3 py-2 text-left text-sm text-blue-400 hover:bg-slate-700 transition-colors flex items-center gap-2"
                  onClick={() => setShowViewMenu(false)}
                >
                  <Save size={14} />
                  保存当前视角
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="relative">
        <button
          onClick={() => {
            setShowFilterMenu(!showFilterMenu);
            setShowViewMenu(false);
          }}
          className="flex items-center gap-2 px-3 py-2 bg-slate-800/90 backdrop-blur-sm rounded-lg border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
        >
          <Filter size={16} />
          <span className="text-sm">{currentFilterLabel}</span>
        </button>

        {showFilterMenu && (
          <div className="absolute top-full left-0 mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden min-w-32">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  setFilterStatus(option.value);
                  setShowFilterMenu(false);
                }}
                className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                  filterStatus === option.value
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'text-slate-300 hover:bg-slate-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {(showViewMenu || showFilterMenu) && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => {
            setShowViewMenu(false);
            setShowFilterMenu(false);
          }}
        />
      )}
    </div>
  );
}
