import { LayoutDashboard, AlertTriangle, Settings, FileText } from 'lucide-react';
import { Toolbar } from './components/Toolbar/Toolbar';
import { ThreeDView } from './components/ThreeDView/ThreeDView';
import { Timeline } from './components/Timeline/Timeline';
import { DataPanel } from './components/DataPanel/DataPanel';
import { AnomalyPanel } from './components/AnomalyPanel/AnomalyPanel';
import { CalibrationPanel } from './components/CalibrationPanel/CalibrationPanel';
import { ReportPanel } from './components/ReportPanel/ReportPanel';
import { useAppStore } from './store/useAppStore';
import type { PanelType } from './types';

const tabs: { id: PanelType; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'details', label: '数据明细', icon: LayoutDashboard },
  { id: 'anomalies', label: '异常分析', icon: AlertTriangle },
  { id: 'calibration', label: '校准对比', icon: Settings },
  { id: 'report', label: '报告导出', icon: FileText },
];

export default function App() {
  const { activePanel, setActivePanel, anomalies } = useAppStore();

  const totalAnomalies = anomalies.length;

  const renderPanel = () => {
    switch (activePanel) {
      case 'details':
        return <DataPanel />;
      case 'anomalies':
        return <AnomalyPanel />;
      case 'calibration':
        return <CalibrationPanel />;
      case 'report':
        return <ReportPanel />;
      default:
        return <DataPanel />;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#050a14] text-gray-100 overflow-hidden">
      <Toolbar />

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative">
          <ThreeDView />
        </div>

        <div className="w-96 bg-[#0a1628] border-l border-[#00d4ff]/30 flex flex-col">
          <div className="flex border-b border-[#00d4ff]/30">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activePanel === tab.id;
              const showBadge = tab.id === 'anomalies' && totalAnomalies > 0;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActivePanel(tab.id)}
                  className={`flex-1 py-3 px-2 flex items-center justify-center gap-1.5 text-xs font-medium transition-colors relative ${
                    isActive
                      ? 'text-[#00d4ff] bg-[#00d4ff]/10 border-b-2 border-[#00d4ff]'
                      : 'text-gray-500 hover:text-gray-300 hover:bg-[#1a2a4a]/50'
                  }`}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                  {showBadge && (
                    <span className="absolute top-1.5 right-2 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white font-bold">
                      {totalAnomalies > 99 ? '99+' : totalAnomalies}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex-1 overflow-hidden">{renderPanel()}</div>
        </div>
      </div>

      <Timeline />
    </div>
  );
}
