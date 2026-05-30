import { useState, useRef } from 'react';
import { Camera, Plus, Trash2, Download, X } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { formatTime } from '../../utils/dataMapper';

export function ViewManager() {
  const [isOpen, setIsOpen] = useState(false);
  const [newViewName, setNewViewName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  const savedViews = useAppStore(state => state.savedViews);
  const saveView = useAppStore(state => state.saveView);
  const loadView = useAppStore(state => state.loadView);
  const deleteView = useAppStore(state => state.deleteView);
  const filters = useAppStore(state => state.filters);

  const handleSave = () => {
    if (!newViewName.trim()) return;
    saveView(newViewName);
    setNewViewName('');
  };

  const handleLoad = (id: string) => {
    loadView(id);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-[#1E1E2A] hover:bg-[#2A2A3A] border border-[#3A3A4A] rounded transition-colors"
      >
        <Camera size={16} className="text-[#F5F0E6]" />
        <span className="text-[#F5F0E6] text-sm">视角</span>
        {savedViews.length > 0 && (
          <span className="px-1.5 py-0.5 bg-[#1A5276] text-white text-xs rounded">
            {savedViews.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-[#1E1E2A] border border-[#3A3A4A] rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-[#3A3A4A]">
            <h3 className="text-[#F5F0E6] font-medium text-sm">视角管理</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-[#2A2A3A] rounded"
            >
              <X size={14} className="text-[#A0A0A0]" />
            </button>
          </div>

          <div className="p-3 border-b border-[#3A3A4A]">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={newViewName}
                onChange={(e) => setNewViewName(e.target.value)}
                placeholder="输入视角名称..."
                className="flex-1 px-3 py-2 bg-[#2A2A3A] border border-[#3A3A4A] rounded text-[#F5F0E6] text-sm focus:outline-none focus:border-[#8B2323]"
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              />
              <button
                onClick={handleSave}
                disabled={!newViewName.trim()}
                className="px-3 py-2 bg-[#8B2323] hover:bg-[#A52A2A] disabled:bg-[#3A3A4A] disabled:cursor-not-allowed text-white rounded transition-colors flex items-center gap-1"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {savedViews.length === 0 ? (
              <div className="p-6 text-center text-[#A0A0A0] text-sm">
                暂无保存的视角
              </div>
            ) : (
              <div className="divide-y divide-[#3A3A4A]">
                {savedViews.map(view => (
                  <div
                    key={view.id}
                    className="p-3 hover:bg-[#2A2A3A] transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[#F5F0E6] text-sm font-medium">
                        {view.name}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleLoad(view.id)}
                          className="p-1.5 hover:bg-[#3A3A4A] rounded text-[#1A5276] transition-colors"
                          title="加载视角"
                        >
                          <Download size={14} />
                        </button>
                        <button
                          onClick={() => deleteView(view.id)}
                          className="p-1.5 hover:bg-[#3A3A4A] rounded text-[#E74C3C] transition-colors"
                          title="删除"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="text-[#A0A0A0] text-xs mb-2">
                      {new Date(view.createdAt).toLocaleString('zh-CN')}
                    </div>
                    
                    <div className="flex flex-wrap gap-1">
                      {view.filters.fingerTypes.length > 0 && (
                        <span className="px-1.5 py-0.5 bg-[#8B2323]/20 text-[#8B2323] text-xs rounded">
                          {view.filters.fingerTypes.length}种指法
                        </span>
                      )}
                      <span className="px-1.5 py-0.5 bg-[#27AE60]/20 text-[#27AE60] text-xs rounded">
                        {formatTime(view.filters.timeRange[0])}-{formatTime(view.filters.timeRange[1])}
                      </span>
                      {view.filters.quality.length > 0 && (
                        <span className="px-1.5 py-0.5 bg-[#F39C12]/20 text-[#F39C12] text-xs rounded">
                          {view.filters.quality.length}种质量
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
