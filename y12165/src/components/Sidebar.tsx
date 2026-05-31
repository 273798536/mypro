import { useStore } from '@/store/useStore';
import { Calculator, FileText, Layers, AlertCircle, AlertTriangle } from 'lucide-react';
import ScaleConverter from './ScaleConverter';
import RecordList from './RecordList';
import MaterialLibrary from './MaterialLibrary';

export default function Sidebar() {
  const { activeTab, setActiveTab, getFilteredRecords } = useStore();
  const records = getFilteredRecords();
  
  const errorCount = records.filter((r) => r.status === 'error').length;
  const warningCount = records.filter((r) => r.status === 'warning').length;

  const tabs = [
    { id: 'converter' as const, label: '尺度换算', icon: Calculator },
    { id: 'records' as const, label: '实验记录', icon: FileText, badge: records.length },
    { id: 'materials' as const, label: '材料库', icon: Layers },
  ];

  return (
    <div className="w-full h-full bg-slate-900 border-l border-slate-700 flex flex-col">
      <div className="flex border-b border-slate-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors relative ${
              activeTab === tab.id
                ? 'text-blue-400 bg-slate-800/50'
                : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/30'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span className="text-xs bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">
                {tab.badge}
              </span>
            )}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
            )}
          </button>
        ))}
      </div>

      {(errorCount > 0 || warningCount > 0) && (
        <div className="px-4 py-2 border-b border-slate-700 bg-slate-800/30">
          <div className="flex items-center gap-4 text-xs">
            {errorCount > 0 && (
              <div className="flex items-center gap-1.5 text-red-400">
                <AlertCircle className="w-4 h-4" />
                <span>{errorCount} 条错误</span>
              </div>
            )}
            {warningCount > 0 && (
              <div className="flex items-center gap-1.5 text-yellow-400">
                <AlertTriangle className="w-4 h-4" />
                <span>{warningCount} 条警告</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'converter' && <ScaleConverter />}
        {activeTab === 'records' && <RecordList />}
        {activeTab === 'materials' && <MaterialLibrary />}
      </div>
    </div>
  );
}
