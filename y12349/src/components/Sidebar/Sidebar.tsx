import { useState } from 'react';
import { Battery, Activity, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { CycleList } from './CycleList';
import { CapacityChart } from './CapacityChart';
import { AnomalyList } from './AnomalyList';
import { useBatteryStore } from '../../store/useBatteryStore';

type TabType = 'cycles' | 'chart' | 'anomalies';

export const Sidebar = () => {
  const [activeTab, setActiveTab] = useState<TabType>('cycles');
  const [isExpanded, setIsExpanded] = useState(true);
  const { currentBatch } = useBatteryStore();

  if (!currentBatch) return null;

  const tabs = [
    { id: 'cycles' as TabType, label: '循环记录', icon: Battery },
    { id: 'chart' as TabType, label: '衰减曲线', icon: Activity },
    { id: 'anomalies' as TabType, label: '异常事件', icon: AlertTriangle },
  ];

  return (
    <div className="h-full flex flex-col bg-dark-light border-r border-dark-lighter">
      <div className="p-4 border-b border-dark-lighter">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-bold text-white">电池循环衰减分析</h1>
            <p className="text-xs text-gray-400">{currentBatch.name}</p>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded hover:bg-dark-lighter transition-colors"
          >
            {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-dark-lighter/50 rounded-lg p-2">
            <div className="text-xs text-gray-500">化学体系</div>
            <div className="font-mono text-sm text-primary">{currentBatch.chemistry}</div>
          </div>
          <div className="bg-dark-lighter/50 rounded-lg p-2">
            <div className="text-xs text-gray-500">标称容量</div>
            <div className="font-mono text-sm text-green-400">{currentBatch.nominalCapacity}mAh</div>
          </div>
          <div className="bg-dark-lighter/50 rounded-lg p-2">
            <div className="text-xs text-gray-500">总循环</div>
            <div className="font-mono text-sm text-yellow-400">{currentBatch.cycles.length}</div>
          </div>
        </div>
      </div>

      <div className="flex border-b border-dark-lighter">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {isExpanded && (
        <div className="flex-1 overflow-hidden">
          {activeTab === 'cycles' && <CycleList />}
          {activeTab === 'chart' && <CapacityChart />}
          {activeTab === 'anomalies' && <AnomalyList />}
        </div>
      )}
    </div>
  );
};
