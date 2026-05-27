import { useEffect, useState } from 'react';
import Scene from '../three/Scene';
import Toolbar from '../components/Toolbar';
import InfoPanel from '../components/InfoPanel';
import WarningList from '../components/WarningList';
import WaypointPanel from '../components/WaypointPanel';
import HistoryPanel from '../components/HistoryPanel';
import { useFlightStore } from '../store/useFlightStore';
import { generateReport, exportToJSON, exportToPDF } from '../utils/export';

const MainScene = () => {
  const {
    currentRoute,
    initRoute,
    loadHistory,
    collisionResult,
    fuelResult,
  } = useFlightStore();

  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    initRoute();
    loadHistory();
  }, []);

  const handleExport = async () => {
    if (!currentRoute) return;

    const hasAlternate = currentRoute.waypoints.some(w => w.isAlternate);
    const report = generateReport(currentRoute, collisionResult, fuelResult, hasAlternate);

    const format = prompt('请选择导出格式：\n1. JSON\n2. PDF', '1');

    if (format === '1') {
      exportToJSON(report);
      alert('报告已导出为JSON格式！');
    } else if (format === '2') {
      await exportToPDF(report);
      alert('报告已导出为PDF格式！');
    }
  };

  return (
    <div className="w-full h-screen relative overflow-hidden">
      <Scene />

      <Toolbar
        onExport={handleExport}
        onShowHistory={() => setShowHistory(true)}
      />

      <WarningList />
      <InfoPanel />
      <WaypointPanel />

      {showHistory && (
        <HistoryPanel onClose={() => setShowHistory(false)} />
      )}

      <div className="absolute bottom-4 right-4 text-slate-500 text-xs bg-slate-900/80 backdrop-blur-sm px-3 py-2 rounded">
        <p>💡 提示：拖拽旋转地球，滚轮缩放</p>
        <p>点击航点可选中，在航点列表中可添加/删除航点</p>
      </div>
    </div>
  );
};

export default MainScene;
