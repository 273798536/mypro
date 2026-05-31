import React, { useState } from 'react';
import { Music, History, GitBranch, Layers } from 'lucide-react';
import AudioPlayer from '../components/AudioPlayer';
import SheetMusic from '../components/SheetMusic';
import AnnotationPanel from '../components/AnnotationPanel';
import ChangeHistory from '../components/ChangeHistory';
import TraceView from '../components/TraceView';

type RightPanelTab = 'annotations' | 'history' | 'trace';

const Workspace: React.FC = () => {
  const [activeTab, setActiveTab] = useState<RightPanelTab>('annotations');

  const tabs = [
    { id: 'annotations' as RightPanelTab, label: '批注', icon: Music },
    { id: 'history' as RightPanelTab, label: '变更历史', icon: History },
    { id: 'trace' as RightPanelTab, label: '追溯链路', icon: GitBranch },
  ];

  return (
    <div className="min-h-screen bg-jazz-ink-900">
      <header className="bg-jazz-ink-800 border-b border-jazz-ink-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-jazz-burgundy-700 flex items-center justify-center">
              <Layers size={22} className="text-white" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-jazz-ink-100">
                即兴Solo结构分析
              </h1>
              <p className="text-xs text-jazz-ink-500">Jazz Improvisation Analyzer</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-jazz-ink-300">张老师</p>
              <p className="text-xs text-jazz-ink-500">爵士乐理论</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-jazz-burgundy-700 flex items-center justify-center text-white font-medium">
              张
            </div>
          </div>
        </div>
      </header>

      <main className="p-6">
        <div className="grid grid-cols-12 gap-6 h-[calc(100vh-140px)]">
          <div className="col-span-4 flex flex-col gap-6">
            <AudioPlayer />
            <div className="flex-1 overflow-hidden">
              <SheetMusic />
            </div>
          </div>

          <div className="col-span-8 flex flex-col">
            <div className="flex gap-1 mb-4 bg-jazz-ink-800 p-1 rounded-lg w-fit">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-all
                      ${activeTab === tab.id
                        ? 'bg-jazz-burgundy-700 text-white shadow-md'
                        : 'text-jazz-ink-400 hover:text-jazz-ink-200 hover:bg-jazz-ink-700'
                      }
                    `}
                  >
                    <Icon size={16} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="flex-1 overflow-hidden">
              {activeTab === 'annotations' && <AnnotationPanel />}
              {activeTab === 'history' && <ChangeHistory />}
              {activeTab === 'trace' && <TraceView />}
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="bg-jazz-ink-800/50 rounded-lg p-4 border border-jazz-ink-700">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-3 h-3 rounded bg-jazz-gold-500"></span>
              <span className="text-sm text-jazz-ink-300">和弦错位</span>
            </div>
            <p className="text-xs text-jazz-ink-500">
              第2小节 D7 → D7b9，缺少属七降九色彩
            </p>
          </div>
          
          <div className="bg-jazz-ink-800/50 rounded-lg p-4 border border-jazz-ink-700">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-3 h-3 rounded bg-jazz-blue-500"></span>
              <span className="text-sm text-jazz-ink-300">外音误判</span>
            </div>
            <p className="text-xs text-jazz-ink-500">
              第3小节 A# 原标记经过音，实为上邻音
            </p>
          </div>
          
          <div className="bg-jazz-ink-800/50 rounded-lg p-4 border border-jazz-ink-700">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-3 h-3 rounded bg-jazz-burgundy-500"></span>
              <span className="text-sm text-jazz-ink-300">片段重复</span>
            </div>
            <p className="text-xs text-jazz-ink-500">
              第5-6小节节奏型完全重复，缺乏变化
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Workspace;
