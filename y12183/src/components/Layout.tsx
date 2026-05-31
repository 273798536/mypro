import { NavLink, useNavigate } from 'react-router-dom';
import { Settings, PlayCircle, Edit3, BarChart3, RefreshCw } from 'lucide-react';
import { useStore } from '@/store';

export default function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { selectedSampleId, scores, ladders, loadDemoData, samples } = useStore();
  const selectedSample = samples.find((s) => s.id === selectedSampleId);
  const selectedScore = selectedSample ? scores.find((sc) => sc.id === selectedSample.scoreId) : null;
  const selectedLadder = selectedSample ? ladders.find((l) => l.id === selectedSample.ladderId) : null;

  const navItems = [
    { path: '/setup', label: '配置', icon: Settings },
    { path: '/practice', label: '练习', icon: PlayCircle },
    { path: '/correction', label: '补录', icon: Edit3 },
    { path: '/review', label: '复盘', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-bg-primary flex">
      <aside className="w-64 bg-bg-secondary border-r border-accent-secondary/30 flex flex-col">
        <div className="p-6 border-b border-accent-secondary/30">
          <h1 className="text-xl font-bold text-accent-primary">鼓谱练习</h1>
          <p className="text-sm text-text-muted mt-1">速度阶梯工具</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-accent-primary text-white shadow-glow'
                    : 'text-text-secondary hover:bg-accent-secondary/20 hover:text-white'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-accent-secondary/30">
          {selectedSample ? (
            <div className="space-y-2 text-sm">
              <div className="text-text-muted">当前样本</div>
              <div className="text-white font-medium">{selectedSample.studentName}</div>
              <div className="text-text-secondary text-xs">
                {selectedScore?.name} • {selectedLadder?.startBpm}-{selectedLadder?.endBpm} BPM
              </div>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-text-muted text-sm mb-3">暂无数据</p>
              <button
                onClick={() => {
                  loadDemoData();
                  navigate('/practice');
                }}
                className="flex items-center gap-2 mx-auto px-4 py-2 bg-accent-secondary/20 text-text-secondary rounded-lg hover:bg-accent-secondary/30 hover:text-white transition-all text-sm"
              >
                <RefreshCw className="w-4 h-4" />
                加载演示数据
              </button>
            </div>
          )}
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
