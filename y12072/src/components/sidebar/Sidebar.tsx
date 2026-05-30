import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Music, Waves, AlertCircle, FileText } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { Timeline } from './Timeline';
import { SegmentDetail } from './SegmentDetail';
import { AnnotationList } from './AnnotationList';
import { SpectrumChart } from './SpectrumChart';
import { IssuePanel } from './IssuePanel';

type TabType = 'timeline' | 'detail' | 'annotations' | 'spectrum' | 'issues';

const tabConfig = [
  { id: 'timeline' as TabType, label: '时间轴', icon: Music },
  { id: 'detail' as TabType, label: '详情', icon: FileText },
  { id: 'annotations' as TabType, label: '标注', icon: Waves },
  { id: 'spectrum' as TabType, label: '频谱', icon: AlertCircle },
  { id: 'issues' as TabType, label: '问题', icon: AlertCircle }
];

export function Sidebar() {
  const [activeTab, setActiveTab] = useState<TabType>('timeline');
  const sidebarCollapsed = useAppStore(state => state.sidebarCollapsed);
  const toggleSidebar = useAppStore(state => state.toggleSidebar);
  const issues = useAppStore(state => state.issues);
  const pendingIssues = issues.filter(i => i.status === 'pending').length;

  const renderContent = () => {
    switch (activeTab) {
      case 'timeline':
        return <Timeline />;
      case 'detail':
        return <SegmentDetail />;
      case 'annotations':
        return <AnnotationList />;
      case 'spectrum':
        return <SpectrumChart />;
      case 'issues':
        return <IssuePanel />;
      default:
        return null;
    }
  };

  return (
    <>
      <button
        onClick={toggleSidebar}
        className={`absolute top-1/2 -translate-y-1/2 z-20 bg-[#1E1E2A] border border-[#3A3A4A] p-2 rounded-l-lg hover:bg-[#2A2A3A] transition-all ${
          sidebarCollapsed ? 'right-0' : 'right-[420px]'
        }`}
      >
        {sidebarCollapsed ? (
          <ChevronLeft size={18} className="text-[#F5F0E6]" />
        ) : (
          <ChevronRight size={18} className="text-[#F5F0E6]" />
        )}
      </button>
      
      <div
        className={`fixed right-0 top-0 h-full bg-[#121218] border-l border-[#3A3A4A] transition-all duration-300 z-10 ${
          sidebarCollapsed ? 'w-0 overflow-hidden' : 'w-[420px]'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex border-b border-[#3A3A4A] bg-[#1E1E2A]">
            {tabConfig.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const hasBadge = tab.id === 'issues' && pendingIssues > 0;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-3 px-2 text-xs flex flex-col items-center gap-1 transition-all relative ${
                    isActive
                      ? 'text-[#8B2323] border-b-2 border-[#8B2323] bg-[#121218]'
                      : 'text-[#A0A0A0] hover:text-[#F5F0E6] hover:bg-[#2A2A3A]'
                  }`}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                  {hasBadge && (
                    <span className="absolute top-1 right-2 w-4 h-4 bg-[#E74C3C] text-white text-xs rounded-full flex items-center justify-center">
                      {pendingIssues}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {renderContent()}
          </div>
        </div>
      </div>
    </>
  );
}
