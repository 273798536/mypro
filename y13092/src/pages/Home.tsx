import CadCanvas from '@/components/cad-canvas/CadCanvas';
import LayerPanel from '@/components/layer-panel/LayerPanel';
import RightPanel from '@/components/right-panel/RightPanel';
import Timeline from '@/components/timeline/Timeline';
import MaterialImportPanel from '@/components/material-import/MaterialImportPanel';
import { useAppStore } from '@/store/useAppStore';
import {
  Construction,
  Settings,
  Bell,
  User,
  Database,
  RefreshCw,
  Download,
  X,
  HardDrive,
  Save,
} from 'lucide-react';

export default function Home() {
  const {
    session,
    lastPersistedAt,
    isInitializedFromStorage,
    lastError,
    clearLastError,
    resetAllData,
    exportAllData,
    timeSegments,
    layers,
  } = useAppStore();

  const coordSysSet = new Set(
    layers.filter((l) => l.visible).map((l) => l.coordinateSystem),
  );
  const coordMixed = coordSysSet.size > 1;
  const suspendedCount = timeSegments.filter(
    (s) => s.status === 'suspended' || s.status === 'missing',
  ).length;

  const handleReset = () => {
    if (
      window.confirm(
        '确定要重置所有数据吗？\n将清空本地存储并恢复初始演示数据，此操作不可撤销。',
      )
    ) {
      resetAllData(session.operator);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {lastError && (
        <div className="bg-red-500/10 border-b border-red-500/30 px-4 py-2 flex items-center justify-between">
          <p className="text-xs text-red-400">{lastError}</p>
          <button
            onClick={clearLastError}
            className="p-1 text-red-400 hover:text-red-300 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <header className="h-14 bg-slate-800 border-b border-slate-700 px-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
            <Construction size={18} />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-slate-100">
              桥隧检修平台碰撞预审
            </h1>
            <p className="text-xs text-slate-500">
              Bridge & Tunnel Maintenance Platform Collision Pre-check
            </p>
          </div>
          <div className="flex items-center gap-2 ml-3 text-xs">
            {isInitializedFromStorage ? (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-green-500/10 text-green-400 rounded border border-green-500/30">
                <HardDrive size={11} />
                已从本地存储恢复
              </span>
            ) : (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded border border-blue-500/30">
                <Database size={11} />
                使用初始演示数据
              </span>
            )}
            {lastPersistedAt && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-slate-700/50 text-slate-400 rounded border border-slate-600">
                <Save size={11} />
                {lastPersistedAt}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-400">
            {coordMixed && (
              <span className="px-2 py-1 bg-yellow-500/10 text-yellow-400 rounded border border-yellow-500/30">
                坐标系混杂
              </span>
            )}
            {suspendedCount > 0 && (
              <span className="px-2 py-1 bg-orange-500/10 text-orange-400 rounded border border-orange-500/30">
                {suspendedCount}处挂起/缺段
              </span>
            )}
          </div>

          <MaterialImportPanel compact />

          <button
            onClick={() => exportAllData(session.operator)}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs rounded transition-colors"
            title="导出全量数据JSON"
          >
            <Download size={13} />
            导出
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-700 hover:bg-red-600/80 text-slate-300 hover:text-white text-xs rounded transition-colors"
            title="重置所有数据"
          >
            <RefreshCw size={13} />
            <span className="hidden md:inline">重置</span>
          </button>

          <button className="p-2 hover:bg-slate-700 rounded transition-colors text-slate-400 hover:text-slate-200">
            <Bell size={16} />
          </button>
          <button className="p-2 hover:bg-slate-700 rounded transition-colors text-slate-400 hover:text-slate-200">
            <Settings size={16} />
          </button>
          <div className="flex items-center gap-2 pl-3 border-l border-slate-700">
            <div className="w-7 h-7 bg-slate-600 rounded-full flex items-center justify-center">
              <User size={13} className="text-slate-400" />
            </div>
            <span className="text-sm text-slate-300 hidden md:inline">
              {session.operator}
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 flex gap-4 overflow-hidden">
        <aside className="w-64 flex-shrink-0 hidden lg:block">
          <LayerPanel />
        </aside>

        <div className="flex-1 flex flex-col gap-4 min-w-0">
          <div className="flex-1 min-h-0">
            <CadCanvas width={800} height={500} />
          </div>
          <div className="flex-shrink-0">
            <Timeline />
          </div>
        </div>

        <aside className="w-80 flex-shrink-0 hidden md:block">
          <RightPanel />
        </aside>
      </main>

      <footer className="h-8 bg-slate-800 border-t border-slate-700 px-4 flex items-center justify-between text-xs text-slate-500 flex-shrink-0">
        <div className="flex items-center gap-4">
          <span>会话: {session.id}</span>
          <span className="text-slate-600">|</span>
          <span>负责人: {session.operator}</span>
          <span className="text-slate-600">|</span>
          <span>创建: {session.createdAt}</span>
          <span className="text-slate-600">|</span>
          <span>最后更新: {session.updatedAt}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <span
              className={`w-2 h-2 rounded-full ${lastPersistedAt ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`}
            />
            {lastPersistedAt ? '已持久化到本地存储' : '待持久化'}
          </span>
          <span className="text-slate-600">v1.2.0</span>
        </div>
      </footer>
    </div>
  );
}
