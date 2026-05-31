import { useState } from 'react';
import { Search, Filter, Save, RotateCcw, Bookmark, Trash2, X } from 'lucide-react';
import { useStore } from '@/store/useStore';

export default function TopBar() {
  const {
    filters,
    setFilters,
    resetFilters,
    viewpoints,
    saveViewpoint,
    loadViewpoint,
    deleteViewpoint,
    resetViewpoint,
    getFilteredRecords,
  } = useStore();

  const [showViewpointModal, setShowViewpointModal] = useState(false);
  const [newViewpointName, setNewViewpointName] = useState('');
  const filteredCount = getFilteredRecords().length;

  const handleSaveViewpoint = () => {
    if (newViewpointName.trim()) {
      saveViewpoint(newViewpointName.trim());
      setNewViewpointName('');
      setShowViewpointModal(false);
    }
  };

  return (
    <div className="bg-slate-800 border-b border-slate-700 px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-white">
            风洞实验相似准则
          </h1>
          <span className="text-xs text-slate-400 bg-slate-700 px-2 py-1 rounded">
            显示 {filteredCount} 条记录
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="搜索实验编号..."
              value={filters.experimentNo}
              onChange={(e) => setFilters({ experimentNo: e.target.value })}
              className="bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 w-40"
            />
          </div>

          <select
            value={filters.materialType}
            onChange={(e) => setFilters({ materialType: e.target.value })}
            className="bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">全部材料</option>
            <option value="金属">金属</option>
            <option value="复合材料">复合材料</option>
            <option value="塑料">塑料</option>
          </select>

          <select
            value={filters.status}
            onChange={(e) => setFilters({ status: e.target.value as any })}
            className="bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">全部状态</option>
            <option value="valid">正常</option>
            <option value="warning">警告</option>
            <option value="error">错误</option>
          </select>

          <button
            onClick={resetFilters}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-sm transition-colors"
          >
            <Filter className="w-4 h-4" />
            重置筛选
          </button>

          <div className="h-6 w-px bg-slate-600" />

          <button
            onClick={() => setShowViewpointModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm transition-colors"
          >
            <Save className="w-4 h-4" />
            保存视角
          </button>

          <select
            value=""
            onChange={(e) => {
              if (e.target.value) {
                loadViewpoint(e.target.value);
                e.target.value = '';
              }
            }}
            className="bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">加载视角</option>
            {viewpoints.map((vp) => (
              <option key={vp.id} value={vp.id}>
                {vp.name}
              </option>
            ))}
          </select>

          <button
            onClick={resetViewpoint}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-sm transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            重置视角
          </button>
        </div>
      </div>

      {showViewpointModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-600 rounded-lg p-6 w-96">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">保存当前视角</h3>
              <button
                onClick={() => setShowViewpointModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <input
              type="text"
              placeholder="输入视角名称..."
              value={newViewpointName}
              onChange={(e) => setNewViewpointName(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 mb-4"
              autoFocus
            />

            {viewpoints.length > 0 && (
              <div className="mb-4">
                <div className="text-sm text-slate-400 mb-2">已保存的视角</div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {viewpoints.map((vp) => (
                    <div
                      key={vp.id}
                      className="flex items-center justify-between bg-slate-700 rounded px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <Bookmark className="w-4 h-4 text-blue-400" />
                        <span className="text-white text-sm">{vp.name}</span>
                      </div>
                      <button
                        onClick={() => deleteViewpoint(vp.id)}
                        className="text-slate-400 hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowViewpointModal(false)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm"
              >
                取消
              </button>
              <button
                onClick={handleSaveViewpoint}
                disabled={!newViewpointName.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:text-slate-400 text-white rounded text-sm"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
