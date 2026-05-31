import React from 'react';
import { FileText, History, Download, Camera } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface WorkbenchLayoutProps {
  leftPanel: React.ReactNode;
  centerPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  onScreenshot?: () => void;
}

export const WorkbenchLayout: React.FC<WorkbenchLayoutProps> = ({
  leftPanel,
  centerPanel,
  rightPanel,
  onScreenshot,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: '/', label: '3D工作台', icon: FileText },
    { path: '/versions', label: '版本管理', icon: History },
    { path: '/report', label: '报告导出', icon: Download },
  ];

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 overflow-hidden">
      <header className="h-12 bg-slate-900 border-b border-slate-700 flex items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <h1 className="text-base font-bold text-slate-100">
            船舶稳性装载舱 · 3D工作台
          </h1>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors',
                  location.pathname === item.path
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                )}
              >
                <item.icon size={14} />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {location.pathname === '/' && onScreenshot && (
            <button
              onClick={onScreenshot}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-slate-300 text-xs font-medium rounded hover:bg-slate-700 transition-colors"
            >
              <Camera size={14} />
              截图
            </button>
          )}
          <div className="h-6 w-px bg-slate-700" />
          <div className="text-xs text-slate-500 font-mono">
            {new Date().toLocaleDateString('zh-CN')}
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-80 flex-shrink-0 overflow-hidden">
          {leftPanel}
        </aside>

        <main className="flex-1 relative overflow-hidden">
          {centerPanel}
        </main>

        <aside className="w-96 flex-shrink-0 overflow-hidden">
          {rightPanel}
        </aside>
      </div>
    </div>
  );
};
