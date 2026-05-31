import { useState } from 'react';
import {
  LayoutDashboard,
  ListMusic,
  Shuffle,
  Gauge,
  FileCheck,
  Music,
  Download,
  Upload,
  RotateCcw,
  User,
  ChevronDown,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';

interface LayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { id: 'dashboard', label: '题库总览', icon: LayoutDashboard },
  { id: 'questions', label: '题库列表', icon: ListMusic },
  { id: 'generator', label: '智能抽题', icon: Shuffle },
  { id: 'quality', label: '质量监控', icon: Gauge },
  { id: 'answers', label: '答题补录', icon: FileCheck },
];

export default function Layout({ children }: LayoutProps) {
  const { currentPage, setCurrentPage, currentUser, toggleUserRole, exportData, importData, resetToSeed } = useStore();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `题库备份-${new Date().toLocaleDateString('zh-CN')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const data = ev.target?.result as string;
          importData(data);
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-amber-50/30">
      <div className="flex h-screen overflow-hidden">
        <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-2xl z-10">
          <div className="p-6 border-b border-slate-700/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center shadow-lg">
                <Music className="w-6 h-6 text-slate-900" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight">听辨题库</h1>
                <p className="text-xs text-slate-400">音乐课堂管理系统</p>
              </div>
            </div>
          </div>

          <div className="flex-1 py-6 px-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentPage(item.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group',
                    isActive
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/30 translate-x-1'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white hover:translate-x-1'
                  )}
                >
                  <Icon className={cn('w-5 h-5 transition-transform', isActive ? 'scale-110' : 'group-hover:scale-110')} />
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="p-4 border-t border-slate-700/50 space-y-2">
            <button
              onClick={handleExport}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              导出数据
            </button>
            <button
              onClick={handleImport}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors"
            >
              <Upload className="w-4 h-4" />
              导入数据
            </button>
            <button
              onClick={resetToSeed}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              重置示例数据
            </button>
          </div>
        </aside>

        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/50 flex items-center justify-between px-6 sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold text-slate-800">
                {navItems.find((n) => n.id === currentPage)?.label}
              </h2>
            </div>

            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-3 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-slate-700">{currentUser.name}</p>
                  <p className="text-xs text-slate-500">
                    {currentUser.role === 'teacher' ? '音乐教师' : '音乐教研员'}
                  </p>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-500" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-sm font-medium text-slate-700">{currentUser.name}</p>
                    <p className="text-xs text-slate-500">
                      {currentUser.role === 'teacher' ? '音乐教师' : '音乐教研员'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      toggleUserRole();
                      setShowUserMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-slate-600 hover:bg-slate-100 flex items-center gap-2"
                  >
                    <User className="w-4 h-4" />
                    切换角色
                  </button>
                </div>
              )}
            </div>
          </header>

          <main className="flex-1 overflow-auto p-6">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
