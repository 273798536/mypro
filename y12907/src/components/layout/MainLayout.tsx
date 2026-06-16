import { NavLink } from 'react-router-dom';
import {
  Home,
  Upload,
  BarChart3,
  GitBranch,
  FileDown,
  ShieldCheck
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

interface MainLayoutProps {
  children: React.ReactNode;
}

// 主导航布局
export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { ui, currentRecordId, analysisResult } = useAppStore();

  const navItems = [
    { path: '/', label: '启动', icon: Home, end: true },
    { path: '/import', label: '导入', icon: Upload },
    { path: '/analysis', label: '分析', icon: BarChart3 },
    { path: '/version', label: '版本', icon: GitBranch },
    { path: '/export', label: '导出', icon: FileDown }
  ];

  return (
    <div className="h-full flex bg-cool-gray-50">
      {/* 左侧导航栏 */}
      <aside className="w-64 bg-navy-900 text-white flex flex-col shadow-lg">
        {/* Logo区域 */}
        <div className="p-6 border-b border-navy-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-serif-cn text-lg font-bold leading-tight">
                安全拒答
              </h1>
              <p className="text-xs text-navy-300">样本归因系统</p>
            </div>
          </div>
        </div>

        {/* 当前处理记录状态 */}
        {currentRecordId && (
          <div className="p-4 border-b border-navy-700 bg-navy-800/50">
            <div className="text-xs text-navy-400 mb-1">当前处理记录</div>
            <div className="font-mono-data text-sm text-amber-400">
              {currentRecordId.substring(0, 15)}...
            </div>
            {analysisResult && (
              <div className="mt-2 flex items-center gap-2 text-xs">
                <span className="text-navy-400">异常</span>
                <span className="bg-coral-500 text-white px-1.5 py-0.5 rounded">
                  {analysisResult.anomalySamples.length}
                </span>
                <span className="text-navy-400 ml-1">冲突</span>
                <span className="bg-amber-500 text-white px-1.5 py-0.5 rounded">
                  {analysisResult.labelConflicts.length}
                </span>
              </div>
            )}
            {analysisResult?.reproducibility && (
              <div className="mt-2 text-xs text-emerald-400 font-mono-data">
                运行ID: {analysisResult.reproducibility.runId.substring(0, 18)}...
              </div>
            )}
          </div>
        )}

        {/* 导航菜单 */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                      : 'text-navy-200 hover:bg-navy-800 hover:text-white'
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* 底部版本信息 */}
        <div className="p-4 border-t border-navy-700 text-xs text-navy-400">
          <p>版本 v1.0.0</p>
          <p className="mt-1">© 2024 数据标注团队</p>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部状态栏 */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <h2 className="font-serif-cn text-lg font-semibold text-navy-900">
              {navItems.find(n => window.location.pathname === n.path || 
                (n.path !== '/' && window.location.pathname.startsWith(n.path)))?.label || '系统'}
            </h2>
            {ui.isLoading && (
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                <span>{ui.loadingText || '处理中...'}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {currentRecordId && (
              <span className="text-sm text-gray-500 flex items-center gap-1">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse-slow" />
                数据已加载
              </span>
            )}
          </div>
        </header>

        {/* 内容区域 */}
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
};
