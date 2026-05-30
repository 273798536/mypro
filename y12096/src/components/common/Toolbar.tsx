import { useState } from 'react';
import { Camera, Save, RotateCcw, Eye, EyeOff, Menu, Plus, Download, Upload } from 'lucide-react';
import { useViewStore } from '../../store/useViewStore';
import { useParamStore } from '../../store/useParamStore';
import { useRecordStore } from '../../store/useRecordStore';
import { generateSampleRecords } from '../../data/samples';

export function Toolbar() {
  const [saveViewOpen, setSaveViewOpen] = useState(false);
  const [viewName, setViewName] = useState('');
  const [showSamples, setShowSamples] = useState(false);

  const { savedViews, saveCurrentView, restoreView, deleteView, resetToDefault, toggleLeftPanel, toggleRightPanel, leftPanelOpen, rightPanelOpen } = useViewStore();
  const { currentResult, validateAndCalculate, ...params } = useParamStore();
  const { createRecord, records, loadFromStorage } = useRecordStore();

  const handleSaveView = () => {
    if (viewName.trim()) {
      saveCurrentView(viewName.trim());
      setViewName('');
      setSaveViewOpen(false);
    }
  };

  const handleSaveRecord = () => {
    if (currentResult) {
      const paramState = {
        functionExpr: params.functionExpr,
        rotationAxis: params.rotationAxis,
        axisOffset: params.axisOffset,
        intervalA: params.intervalA,
        intervalB: params.intervalB,
        sliceCount: params.sliceCount,
        showSlices: params.showSlices,
        method: params.method,
        validation: params.validation,
      };
      createRecord(paramState, currentResult);
    }
  };

  const handleLoadSamples = () => {
    const samples = generateSampleRecords();
    samples.forEach((sample) => {
      const existing = records.find((r) => r.id === sample.id);
      if (!existing) {
        useRecordStore.setState((state) => ({
          records: [sample, ...state.records],
        }));
      }
    });
    localStorage.setItem('rotation_solid_records', JSON.stringify([...generateSampleRecords(), ...records]));
    loadFromStorage();
    setShowSamples(false);
  };

  return (
    <div className="h-14 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700/50 flex items-center justify-between px-4 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleLeftPanel}
          className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-colors"
          title={leftPanelOpen ? '隐藏左侧面板' : '显示左侧面板'}
        >
          {leftPanelOpen ? <Menu size={18} /> : <Eye size={18} />}
        </button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">∫</span>
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white">微积分旋转体教具</h1>
            <p className="text-xs text-slate-400">Three.js Web3D</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative group">
          <button
            onClick={resetToDefault}
            className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-colors"
            title="重置视角"
          >
            <RotateCcw size={18} />
          </button>
        </div>

        <div className="relative">
          <button
            onClick={() => setSaveViewOpen(!saveViewOpen)}
            className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1"
            title="保存/恢复视角"
          >
            <Camera size={18} />
            {savedViews.length > 0 && (
              <span className="text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded-full">
                {savedViews.length}
              </span>
            )}
          </button>

          {saveViewOpen && (
            <div className="absolute top-full right-0 mt-2 w-64 bg-slate-800/95 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-2xl p-3 z-50">
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="text"
                  value={viewName}
                  onChange={(e) => setViewName(e.target.value)}
                  placeholder="视角名称..."
                  className="flex-1 px-3 py-1.5 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveView()}
                />
                <button
                  onClick={handleSaveView}
                  className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
                >
                  <Save size={16} />
                </button>
              </div>

              {savedViews.length > 0 ? (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {savedViews.map((view) => (
                    <div
                      key={view.id}
                      className="flex items-center justify-between p-2 hover:bg-slate-700/50 rounded-lg group/item"
                    >
                      <button
                        onClick={() => {
                          restoreView(view.id);
                          setSaveViewOpen(false);
                        }}
                        className="flex-1 text-left text-sm text-slate-300 hover:text-white"
                      >
                        {view.name}
                      </button>
                      <button
                        onClick={() => deleteView(view.id)}
                        className="p-1 text-slate-500 hover:text-red-400 opacity-0 group-hover/item:opacity-100 transition-all"
                      >
                        <EyeOff size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 text-center py-2">暂无保存的视角</p>
              )}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setShowSamples(!showSamples)}
            className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-colors"
            title="加载示例"
          >
            <Download size={18} />
          </button>

          {showSamples && (
            <div className="absolute top-full right-0 mt-2 w-56 bg-slate-800/95 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-2xl p-3 z-50">
              <p className="text-xs text-slate-400 mb-2">加载示例数据？</p>
              <p className="text-xs text-slate-500 mb-3">将添加5条预置样例记录</p>
              <div className="flex gap-2">
                <button
                  onClick={handleLoadSamples}
                  className="flex-1 py-1.5 px-3 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-500 transition-colors"
                >
                  确认加载
                </button>
                <button
                  onClick={() => setShowSamples(false)}
                  className="flex-1 py-1.5 px-3 bg-slate-700/50 text-slate-300 rounded-lg text-sm hover:bg-slate-700 transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleSaveRecord}
          disabled={!currentResult}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-sm font-medium hover:from-blue-500 hover:to-indigo-500 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={16} />
          保存记录
        </button>

        <button
          onClick={toggleRightPanel}
          className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-colors"
          title={rightPanelOpen ? '隐藏右侧面板' : '显示右侧面板'}
        >
          {rightPanelOpen ? <Menu size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}
