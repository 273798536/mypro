import { Calculator, Waves, Droplets, Fish, Navigation, FileText } from 'lucide-react';
import type { ReportTab } from '../types';

interface SidebarProps {
  activeTab: ReportTab;
  onTabChange: (tab: ReportTab) => void;
}

const tabs: { id: ReportTab; label: string; icon: typeof Calculator; description: string }[] = [
  { id: 'calculator', label: '剖面计算', icon: Calculator, description: '侵蚀剖面计算工具' },
  { id: 'buoy-data', label: '浮标数据', icon: Waves, description: '浮标监测数据管理' },
  { id: 'water-quality', label: '水质预警', icon: Droplets, description: '水质监测与复核' },
  { id: 'aquaculture-logs', label: '养殖日志', icon: Fish, description: '养殖日志与延迟检测' },
  { id: 'drift-interception', label: '漂移拦截', icon: Navigation, description: '轨迹漂移拦截记录' },
  { id: 'report-export', label: '报告导出', icon: FileText, description: '海岸侵蚀报告导出' },
];

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <div className="w-64 bg-ocean-900 text-white min-h-screen flex flex-col">
      <div className="p-6 border-b border-ocean-700">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Waves className="w-6 h-6 text-ocean-300" />
          海岸侵蚀监测
        </h1>
        <p className="text-ocean-400 text-sm mt-1">剖面分析系统</p>
      </div>
      
      <nav className="flex-1 p-3 space-y-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 flex items-start gap-3 ${
                isActive
                  ? 'bg-ocean-600 text-white shadow-lg'
                  : 'text-ocean-200 hover:bg-ocean-800 hover:text-white'
              }`}
            >
              <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${isActive ? 'text-white' : 'text-ocean-400'}`} />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{tab.label}</div>
                <div className={`text-xs mt-0.5 ${isActive ? 'text-ocean-200' : 'text-ocean-500'}`}>
                  {tab.description}
                </div>
              </div>
            </button>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-ocean-700">
        <div className="bg-ocean-800 rounded-lg p-3">
          <div className="text-xs text-ocean-400 mb-2">当前报告期</div>
          <div className="text-sm font-medium">2026年6月 第2周</div>
          <div className="text-xs text-ocean-400 mt-1">监测断面：东海养殖区</div>
        </div>
      </div>
    </div>
  );
}
