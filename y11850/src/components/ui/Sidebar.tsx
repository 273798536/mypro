import { useState } from 'react';
import { Sun, Home, FileCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { ShadowChart } from './ShadowChart';
import { ApartmentTable } from './ApartmentTable';
import { ReviewPanel } from './ReviewPanel';

type TabType = 'shadow' | 'apartment' | 'review';

const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
  { id: 'shadow', label: '日照投影', icon: <Sun className="w-4 h-4" /> },
  { id: 'apartment', label: '住户明细', icon: <Home className="w-4 h-4" /> },
  { id: 'review', label: '人工复核', icon: <FileCheck className="w-4 h-4" /> },
];

export function Sidebar() {
  const [activeTab, setActiveTab] = useState<TabType>('shadow');
  const [collapsed, setCollapsed] = useState(false);

  const renderContent = () => {
    switch (activeTab) {
      case 'shadow':
        return <ShadowChart />;
      case 'apartment':
        return <ApartmentTable />;
      case 'review':
        return <ReviewPanel />;
      default:
        return null;
    }
  };

  if (collapsed) {
    return (
      <div className="w-14 bg-deep-ocean border-l border-white/10 flex flex-col items-center py-4 gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setCollapsed(false);
            }}
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
              activeTab === tab.id
                ? 'bg-sun-orange text-white'
                : 'text-slate-400 hover:bg-white/10 hover:text-white'
            }`}
            title={tab.label}
          >
            {tab.icon}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={() => setCollapsed(false)}
          className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-80 bg-deep-ocean border-l border-white/10 flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-sun-orange text-white shadow-lg shadow-orange-500/20'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="p-1 rounded text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 p-4 overflow-hidden">
        {renderContent()}
      </div>
    </div>
  );
}
