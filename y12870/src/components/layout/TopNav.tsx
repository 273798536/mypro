import { Camera, FileText, Waves, CameraOff, Play, RefreshCw } from 'lucide-react';
import { useCalcStore } from '@/store/useCalcStore';
import { Link, useLocation } from 'react-router-dom';

export default function TopNav() {
  const loc = useLocation();
  const projectName = useCalcStore(s => s.projectName);
  const setProjectName = useCalcStore(s => s.setProjectName);
  const screenshotMode = useCalcStore(s => s.screenshotMode);
  const toggle = useCalcStore(s => s.toggleScreenshotMode);
  const loadMock = useCalcStore(s => s.loadMockData);
  const lastUpdate = useCalcStore(s => s.lastUpdatedAt);

  return (
    <header className="sticky top-0 z-30 bg-ocean-900 text-white shadow-md">
      <div className="flex items-center h-14 px-5 gap-4">
        <div className="flex items-center gap-2 shrink-0">
          <Waves className="w-6 h-6 text-ocean-100" strokeWidth={2} />
          <h1 className="font-serif text-lg font-semibold tracking-wider">
            海浪能试算台
          </h1>
        </div>

        {!screenshotMode && (
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <span className="text-ocean-200 text-xs">项目</span>
            <input
              className="bg-ocean-700/60 border border-ocean-500/30 rounded px-3 py-1 text-sm
                         outline-none focus:ring-2 focus:ring-ocean-500/50 w-[420px] max-w-full"
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
            />
            <span className="text-ocean-200/70 text-xs tabular-nums">更新 {lastUpdate}</span>
          </div>
        )}

        <div className="ml-auto flex items-center gap-2 shrink-0">
          {!screenshotMode && (
            <>
              <button
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded
                           bg-ocean-700/50 hover:bg-ocean-700 text-sm transition-colors"
                onClick={loadMock}
                title="一键载入舟山海域示例数据"
              >
                <Play className="w-4 h-4" />
                <span className="hidden md:inline">载入示例</span>
              </button>
              <button
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors
                            ${screenshotMode ? 'bg-status-deferred text-ocean-900' : 'bg-ocean-700/50 hover:bg-ocean-700'}`}
                onClick={toggle}
              >
                {screenshotMode ? <CameraOff className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
                <span className="hidden md:inline">评审截图模式</span>
              </button>
            </>
          )}
          {screenshotMode && (
            <div className="px-3 py-1 rounded bg-status-deferred text-ocean-900 text-xs font-medium">
              评审截图模式 · 隐藏编辑控件 · 图例/视角保留
            </div>
          )}
          <Link
            to={loc.pathname === '/report' ? '/' : '/report'}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded
                       bg-white/10 hover:bg-white/20 text-sm transition-colors"
          >
            {loc.pathname === '/report' ? (
              <><RefreshCw className="w-4 h-4" /><span>返回工作台</span></>
            ) : (
              <><FileText className="w-4 h-4" /><span className="hidden md:inline">海事处报告</span><span className="md:hidden">报告</span></>
            )}
          </Link>
        </div>
      </div>
      {screenshotMode && (
        <div className="px-5 py-1.5 bg-ocean-900/80 border-t border-ocean-700/40 flex items-center justify-between text-xs text-ocean-100/80">
          <span>视角：{useCalcStore.getState().viewPresets.find(v => v.id === useCalcStore.getState().activeViewId)?.name || '自定义'}</span>
          <span>时间范围：{useCalcStore.getState().weather[0]?.timestamp?.slice(0, 10) || '--'} ~ {useCalcStore.getState().weather.slice(-1)[0]?.timestamp?.slice(0, 10) || '--'}</span>
          <span>海岛运维 · 海浪能设备试算台</span>
        </div>
      )}
    </header>
  );
}
