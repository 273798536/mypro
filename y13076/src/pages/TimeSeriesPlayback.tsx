import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Camera, Download, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { useStore } from '@/store/useStore';
import FilterPanel from '@/components/FilterPanel';
import TimeSeriesChart from '@/components/TimeSeriesChart';
import PlaybackControls from '@/components/PlaybackControls';
import HistoryDrawer from '@/components/HistoryDrawer';
import QuickGuide from '@/components/QuickGuide';
import ExportPanel from '@/components/ExportPanel';
import type { AnomalyRecord } from '@/types';

export default function TimeSeriesPlayback() {
  const [showGuide, setShowGuide] = useState(true);
  const [notification, setNotification] = useState<string | null>(null);

  const filterCriteria = useStore((s) => s.filterCriteria);
  const anomalies = useStore((s) => s.anomalies);
  const addAnomaly = useStore((s) => s.addAnomaly);
  const toggleExportPanel = useStore((s) => s.toggleExportPanel);
  const isHistoryDrawerOpen = useStore((s) => s.isHistoryDrawerOpen);
  const selectedSensorName = useStore((s) => s.selectedSensorName);
  const sensorData = useStore((s) => s.sensorData);

  const pendingCount = anomalies.filter((a) => a.status === 'pending').length;

  const handleScreenshot = () => {
    const sensor = sensorData.find((s) => s.sensorName === selectedSensorName);
    const record: AnomalyRecord = {
      id: `a-${Date.now()}`,
      sensorId: sensor?.id ?? 's-1',
      sensorName: selectedSensorName ?? '手动截图标记',
      filterId: filterCriteria.id,
      type: 'data_gap',
      description: '手动截图标记',
      status: 'pending',
      result: '',
      filterSnapshot: { ...filterCriteria },
      createdAt: new Date().toISOString(),
      materials: [],
    };
    addAnomaly(record);
    setNotification('截图已保存至异常队列，筛选口径已绑定');
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div className="h-screen bg-[#0a0e17] overflow-hidden flex flex-col">
      {notification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] bg-[#00E5A0] text-gray-900 px-4 py-2 rounded-lg text-sm font-medium shadow-lg">
          {notification}
        </div>
      )}

      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-white">冷通道时序回放</h1>
          <span className="text-xs text-gray-500">数据中心 / 冷通道</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="text-gray-400 hover:text-white p-1.5 transition-colors"
          >
            {showGuide ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <button
            onClick={handleScreenshot}
            className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-sm transition-colors"
          >
            <Camera size={14} /> 截图
          </button>
          <button
            onClick={toggleExportPanel}
            className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-sm transition-colors"
          >
            <Download size={14} /> 导出
          </button>
          <Link
            to="/anomaly-queue"
            className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-sm transition-colors relative"
          >
            <AlertTriangle size={14} />
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#EF4444] text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold">
                {pendingCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {showGuide && (
        <div className="px-4 shrink-0">
          <QuickGuide />
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <div className="w-64 border-r border-gray-800 shrink-0">
          <FilterPanel />
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <TimeSeriesChart />
          </div>
          <div className="h-14 border-t border-gray-800 shrink-0">
            <PlaybackControls />
          </div>
        </div>

        {isHistoryDrawerOpen && (
          <div className="w-80 border-l border-gray-800 shrink-0">
            <HistoryDrawer />
          </div>
        )}
      </div>

      <ExportPanel />
    </div>
  );
}
