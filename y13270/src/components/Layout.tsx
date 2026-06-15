import { NavLink, Outlet } from 'react-router-dom';
import { MapPin, Clock, Upload, Database } from 'lucide-react';
import { usePointStore } from '../store';

export function Layout() {
  const { mergedPoints, history, loadDemoData, clearAllData } = usePointStore();
  const hasData = mergedPoints.length > 0;

  const pendingCount = mergedPoints.filter(p => p.status === 'pending').length;
  const confirmedCount = mergedPoints.filter(p => p.status === 'confirmed').length;
  const onsiteCount = mergedPoints.filter(p => p.status === 'onsite').length;
  const conflictCount = mergedPoints.filter(p => p.status === 'conflict').length;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-city-blue-600 text-white shadow-lg">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded flex items-center justify-center">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <h1 className="font-serif-cn text-xl font-bold tracking-wide">
                  公交港湾点位归并系统
                </h1>
                <p className="text-xs text-city-blue-100 mt-0.5">
                  原始数据保留 · 全操作可追溯 · 坐标偏移检测
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {hasData ? (
                <button
                  onClick={clearAllData}
                  className="text-xs text-city-blue-200 hover:text-white transition-colors"
                >
                  清空数据
                </button>
              ) : (
                <button
                  onClick={loadDemoData}
                  className="text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded transition-colors"
                >
                  加载演示数据
                </button>
              )}
              <div className="hidden sm:flex items-center gap-3 text-sm">
                <div className="flex items-center gap-1">
                  <Database className="w-4 h-4 text-city-blue-200" />
                  <span className="text-city-blue-100">{mergedPoints.length} 点位</span>
                </div>
                <div className="w-px h-4 bg-city-blue-400/50" />
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4 text-city-blue-200" />
                  <span className="text-city-blue-100">{history.length} 条记录</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <nav className="border-t border-white/10">
          <div className="container">
            <div className="flex gap-1">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `px-4 py-3 text-sm font-medium transition-all ${
                    isActive
                      ? 'text-white border-b-2 border-white -mb-px'
                      : 'text-city-blue-200 hover:text-white'
                  }`
                }
              >
                <span className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  点位列表
                  {pendingCount > 0 && (
                    <span className="bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                      {pendingCount}
                    </span>
                  )}
                </span>
              </NavLink>
              <NavLink
                to="/timeline"
                className={({ isActive }) =>
                  `px-4 py-3 text-sm font-medium transition-all ${
                    isActive
                      ? 'text-white border-b-2 border-white -mb-px'
                      : 'text-city-blue-200 hover:text-white'
                  }`
                }
              >
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  历史时间线
                </span>
              </NavLink>
              <NavLink
                to="/import"
                className={({ isActive }) =>
                  `px-4 py-3 text-sm font-medium transition-all ${
                    isActive
                      ? 'text-white border-b-2 border-white -mb-px'
                      : 'text-city-blue-200 hover:text-white'
                  }`
                }
              >
                <span className="flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  数据导入
                </span>
              </NavLink>
            </div>
          </div>
        </nav>
      </header>

      {hasData && (
        <div className="bg-white border-b border-gray-200">
          <div className="container py-2">
            <div className="flex gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-gray-400" />
                <span className="text-gray-600">待复核 {pendingCount}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-gray-600">已处理 {confirmedCount}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-gray-600">待现场 {onsiteCount}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-orange-500" />
                <span className="text-gray-600">冲突 {conflictCount}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="container py-6">
        <Outlet />
      </main>

      <footer className="border-t border-gray-200 bg-white mt-auto">
        <div className="container py-4 text-center text-xs text-gray-500">
          公交港湾点位归并系统 · 原始数据永不修改 · 所有操作自动留痕
        </div>
      </footer>
    </div>
  );
}
