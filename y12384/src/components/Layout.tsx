import React from 'react';
import { 
  LayoutDashboard, AlertTriangle, GitCompare, FileBarChart, Radio } from 'lucide-react';
import { usePlaylistStore } from '../store/usePlaylistStore';
import { TabType } from '../types';

interface LayoutProps {
  children: React.ReactNode;
}

const tabs: { id: TabType; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'overview', label: '歌单总览', icon: LayoutDashboard },
  { id: 'conflicts', label: '冲突检测', icon: AlertTriangle },
  { id: 'versions', label: '版本历史', icon: GitCompare },
  { id: 'report', label: '编排报告', icon: FileBarChart },
];

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { activeTab, setActiveTab, currentPlaylist } = usePlaylistStore();

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-white shadow-lg border-r border-surface-200">
        <div className="p-6 border-b border-surface-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-600 rounded-lg">
              <Radio className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-surface-800 font-display">
                歌单平衡器
              </h1>
              <p className="text-xs text-surface-500">Playlist Balancer</p>
            </div>
          </div>
        </div>

        <nav className="p-4">
          <ul className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <li key={tab.id}>
                  <button
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                      activeTab === tab.id
                        ? 'bg-primary-50 text-primary-600 font-medium'
                        : 'text-surface-600 hover:bg-surface-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{tab.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {currentPlaylist && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-surface-200 bg-white">
            <div className="p-3 bg-surface-50 rounded-lg">
              <p className="text-xs text-surface-500">当前歌单</p>
              <p className="font-medium text-surface-700">
                {currentPlaylist.name}
              </p>
              <p className="text-xs text-surface-500 mt-1">
                {currentPlaylist.version} · {currentPlaylist.items.length} 首歌曲
              </p>
            </div>
          </div>
        )}
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
};
