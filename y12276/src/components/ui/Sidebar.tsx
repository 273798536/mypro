import { useAppStore } from '@/store/useAppStore';
import { FilterPanel } from './FilterPanel';
import { ConflictList } from './ConflictList';
import { Camera, CameraOff, AlertTriangle, MapPin, Image } from 'lucide-react';

export function Sidebar() {
  const { activeTab, setActiveTab } = useAppStore();

  const tabs = [
    { id: 'conflicts' as const, label: '冲突列表', icon: AlertTriangle, color: '#ff0055' },
    { id: 'routes' as const, label: '路线管理', icon: MapPin, color: '#00aaff' },
    { id: 'screenshots' as const, label: '截图管理', icon: Image, color: '#00ff88' },
  ];

  return (
    <div className="w-80 h-full bg-slate-900/95 backdrop-blur-xl border-r border-slate-700/50 flex flex-col">
      <div className="p-4 border-b border-slate-700/50">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-cyan-500/30">
            🎵
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">舞台线缆模型</h1>
            <p className="text-xs text-slate-500">Stage Cable Visualizer</p>
          </div>
        </div>

        <div className="flex gap-1 p-1 bg-slate-800/50 rounded-lg">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center gap-1 py-2 px-2 rounded-md text-xs transition-all duration-200 ${
                  isActive
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
                style={{
                  boxShadow: isActive ? `inset 0 2px 0 ${tab.color}, 0 0 15px ${tab.color}20` : undefined,
                }}
              >
                <Icon
                  size={18}
                  style={{ color: isActive ? tab.color : undefined }}
                />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'conflicts' && (
          <div className="space-y-6">
            <FilterPanel />
            <div className="pt-4 border-t border-slate-700/50">
              <h3 className="text-sm font-bold text-slate-300 mb-3 tracking-wider uppercase">
                冲突时间线
              </h3>
              <ConflictList />
            </div>
          </div>
        )}

        {activeTab === 'routes' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-400 mb-4">
              乐手走位路线将在3D视图中实时显示，点击底部播放按钮查看动画。
            </p>
            <div className="space-y-2">
              {['主唱', '吉他手', '贝斯手'].map((name, index) => (
                <div
                  key={name}
                  className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/30"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor: ['#00ff88', '#00aaff', '#ffaa00'][index],
                        boxShadow: `0 0 8px ${['#00ff88', '#00aaff', '#ffaa00'][index]}`,
                      }}
                    />
                    <span className="text-sm text-white font-medium">{name}走位</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    舞台前缘往返走位 · 时长约56秒
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'screenshots' && (
          <ScreenshotPanel />
        )}
      </div>
    </div>
  );
}

function ScreenshotPanel() {
  const { screenshots, removeScreenshot } = useAppStore();

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">
        使用底部工具栏的截图按钮捕获当前3D视图，截图将保存在此处便于后续复核。
      </p>

      {screenshots.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <div className="text-4xl mb-3">📷</div>
          <p className="text-sm">暂无截图</p>
          <p className="text-xs mt-1">点击底部相机按钮捕获当前视图</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {screenshots.map((screenshot) => (
            <div
              key={screenshot.id}
              className="group relative bg-slate-800/30 rounded-lg overflow-hidden border border-slate-700/30"
            >
              <img
                src={screenshot.dataUrl}
                alt={screenshot.description}
                className="w-full h-24 object-cover"
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.download = `${screenshot.description.replace(/\s+/g, '_')}_${screenshot.id}.png`;
                    link.href = screenshot.dataUrl;
                    link.click();
                  }}
                  className="p-2 bg-emerald-500 rounded-lg text-white hover:bg-emerald-400 transition-colors"
                >
                  <Camera size={16} />
                </button>
                <button
                  onClick={() => removeScreenshot(screenshot.id)}
                  className="p-2 bg-red-500 rounded-lg text-white hover:bg-red-400 transition-colors"
                >
                  <CameraOff size={16} />
                </button>
              </div>
              <div className="p-2">
                <p className="text-xs text-slate-300 truncate">{screenshot.description}</p>
                <p className="text-[10px] text-slate-500 font-mono">
                  {new Date(screenshot.timestamp).toLocaleTimeString('zh-CN')}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
