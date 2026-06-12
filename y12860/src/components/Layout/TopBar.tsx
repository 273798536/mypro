import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  Search,
  User,
  Save,
  Eye,
  ChevronsUpDown,
  X,
} from 'lucide-react';
import { useTrackerStore } from '@/store/useTrackerStore';
import { cn } from '@/lib/utils';

const breadcrumbMap: Record<string, string> = {
  dashboard: '仪表盘',
  events: '事件追踪',
  'risk-matrix': '风险矩阵',
  'tide-report': '潮汐报告',
  'data-cleaner': '数据清洗',
  delivery: '结果交付',
};

export default function TopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    savedViews,
    currentViewId,
    setCurrentView,
    saveView,
    searchKeyword,
    setSearchKeyword,
    statusFilter,
    buoys,
  } = useTrackerStore();

  const [viewDropdownOpen, setViewDropdownOpen] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newViewName, setNewViewName] = useState('');
  const [newViewDesc, setNewViewDesc] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const saveDialogRef = useRef<HTMLDivElement>(null);

  const pathParts = location.pathname.split('/').filter(Boolean);
  const breadcrumbs = pathParts.map((part, idx) => {
    const path = '/' + pathParts.slice(0, idx + 1).join('/');
    const label = breadcrumbMap[part] || (part.length === 36 ? part.slice(0, 8) + '...' : part);
    return { path, label };
  });

  const currentView = savedViews.find((v) => v.id === currentViewId);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setViewDropdownOpen(false);
      }
      if (
        saveDialogRef.current &&
        !saveDialogRef.current.contains(e.target as Node)
      ) {
        setShowSaveDialog(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSaveView = () => {
    if (!newViewName.trim()) return;
    saveView({
      name: newViewName.trim(),
      description: newViewDesc.trim(),
      filter: {
        statuses: statusFilter,
        buoyIds: [],
      },
      zoomLevel: 1,
    });
    setNewViewName('');
    setNewViewDesc('');
    setShowSaveDialog(false);
  };

  return (
    <header className="h-16 bg-ocean-950/90 backdrop-blur-md border-b border-ocean-700/50 flex items-center gap-4 px-6 shrink-0 sticky top-0 z-30">
      <nav className="flex items-center gap-1 text-sm shrink-0">
        <button
          onClick={() => navigate('/dashboard')}
          className="text-ocean-400 hover:text-ocean-200 transition-colors"
        >
          首页
        </button>
        {breadcrumbs.map((bc, idx) => (
          <div key={bc.path} className="flex items-center gap-1">
            <ChevronRight className="w-4 h-4 text-ocean-600" />
            {idx === breadcrumbs.length - 1 ? (
              <span className="text-seafoam-300 font-medium">{bc.label}</span>
            ) : (
              <button
                onClick={() => navigate(bc.path)}
                className="text-ocean-400 hover:text-ocean-200 transition-colors"
              >
                {bc.label}
              </button>
            )}
          </div>
        ))}
      </nav>

      <div className="h-8 w-px bg-ocean-700/50 shrink-0" />

      <div className="relative shrink-0" ref={dropdownRef}>
        <button
          onClick={() => setViewDropdownOpen(!viewDropdownOpen)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm
                     bg-ocean-800/60 border border-ocean-700/50 text-ocean-200
                     hover:bg-ocean-800 hover:border-ocean-600 transition-all min-w-[200px]"
        >
          <Eye className="w-4 h-4 text-seafoam-400" />
          <span className="flex-1 text-left truncate">
            {currentView ? currentView.name : '选择视角'}
          </span>
          <ChevronsUpDown className="w-4 h-4 text-ocean-400" />
        </button>

        {viewDropdownOpen && (
          <div className="absolute top-full left-0 mt-2 w-72 rounded-xl bg-ocean-900 border border-ocean-700/60 shadow-nautical overflow-hidden animate-float-up z-50">
            <div className="px-3 py-2 border-b border-ocean-700/40 text-xs text-ocean-400">
              已保存的视角
            </div>
            <div className="max-h-64 overflow-y-auto">
              {savedViews.length === 0 && (
                <div className="px-4 py-6 text-center text-sm text-ocean-500">
                  暂无保存的视角
                </div>
              )}
              {savedViews.map((view) => (
                <button
                  key={view.id}
                  onClick={() => {
                    setCurrentView(view.id);
                    setViewDropdownOpen(false);
                  }}
                  className={cn(
                    'w-full px-3 py-2.5 text-left border-b border-ocean-700/30 last:border-0 transition-colors',
                    view.id === currentViewId
                      ? 'bg-seafoam-500/10 text-seafoam-300'
                      : 'text-ocean-200 hover:bg-ocean-800/60'
                  )}
                >
                  <div className="text-sm font-medium truncate">{view.name}</div>
                  {view.description && (
                    <div className="text-xs text-ocean-400 truncate mt-0.5">
                      {view.description}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="relative shrink-0" ref={saveDialogRef}>
        <button
          onClick={() => setShowSaveDialog(!showSaveDialog)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm
                     bg-seafoam-500/15 border border-seafoam-500/30 text-seafoam-300
                     hover:bg-seafoam-500/25 transition-all"
        >
          <Save className="w-4 h-4" />
          <span>保存视角</span>
        </button>

        {showSaveDialog && (
          <div className="absolute top-full right-0 mt-2 w-72 rounded-xl bg-ocean-900 border border-ocean-700/60 shadow-nautical p-3 animate-float-up z-50">
            <div className="text-sm font-medium text-ocean-100 mb-3">保存当前视角</div>
            <div className="space-y-2">
              <div>
                <label className="block text-xs text-ocean-400 mb-1">视角名称</label>
                <input
                  type="text"
                  value={newViewName}
                  onChange={(e) => setNewViewName(e.target.value)}
                  placeholder="输入名称..."
                  className="input-nautical"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs text-ocean-400 mb-1">描述（可选）</label>
                <input
                  type="text"
                  value={newViewDesc}
                  onChange={(e) => setNewViewDesc(e.target.value)}
                  placeholder="简要描述..."
                  className="input-nautical"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setShowSaveDialog(false)}
                  className="flex-1 nautical-btn py-1.5"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveView}
                  disabled={!newViewName.trim()}
                  className="flex-1 nautical-btn-primary py-1.5"
                >
                  保存
                </button>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-ocean-700/40 text-[11px] text-ocean-500">
              将保存当前状态（筛选器：{statusFilter.length > 0 ? `${statusFilter.length} 种状态` : '全部'}，浮标：{buoys.length} 个）
            </div>
          </div>
        )}
      </div>

      <div className="flex-1" />

      <div className="relative w-64 shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ocean-400" />
        {searchKeyword && (
          <button
            onClick={() => setSearchKeyword('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ocean-400 hover:text-ocean-200"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <input
          type="text"
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          placeholder="搜索浮标名称、编号、操作员..."
          className="w-full pl-10 pr-10 py-2 rounded-lg text-sm
                     bg-ocean-800/60 border border-ocean-700/50 text-ocean-100
                     placeholder:text-ocean-500
                     focus:outline-none focus:ring-2 focus:ring-seafoam-500/40 focus:border-seafoam-400/40
                     transition-all"
        />
      </div>

      <div className="h-8 w-px bg-ocean-700/50 shrink-0" />

      <div className="flex items-center gap-3 shrink-0">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-ocean-600 to-ocean-700 border border-ocean-500/50 flex items-center justify-center">
          <User className="w-4.5 h-4.5 text-seafoam-300" />
        </div>
        <div className="hidden sm:block">
          <div className="text-sm font-medium text-ocean-100 leading-tight">
            海洋监测员
          </div>
          <div className="text-[11px] text-ocean-400">系统管理员</div>
        </div>
      </div>
    </header>
  );
}
