import { useState } from 'react';
import { Camera, FileText, Download, MapPin, AlertTriangle, Thermometer, Bot, LayoutGrid, Settings } from 'lucide-react';
import { useDataStore } from '../../stores/useDataStore';
import { captureScreenshot, exportToPDF, exportToExcel } from '../../utils/exportUtils';
import { META_DATA } from '../../services/mockData';

interface TopBarProps {
  onExportScreenshot?: () => void;
}

export function TopBar({ onExportScreenshot }: TopBarProps) {
  const { shelves, trajectories, aisles, alerts } = useDataStore();
  const [showExportMenu, setShowExportMenu] = useState(false);

  const unresolvedAlerts = alerts.filter((a) => !a.resolved).length;
  const avgHeat =
    shelves.length > 0
      ? Math.round(shelves.reduce((sum, s) => sum + s.heatValue, 0) / shelves.length)
      : 0;
  const blockedAisles = aisles.filter((a) => a.blockageLevel > 50).length;
  const activeRobots = Array.from(new Set(trajectories.map((t) => t.robotId))).length;

  const handleScreenshot = () => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      captureScreenshot(canvas, `巡检截图_${new Date().toISOString().split('T')[0]}.png`);
    }
    setShowExportMenu(false);
  };

  const handleExportPDF = () => {
    exportToPDF({
      shelves,
      trajectories,
      aisles,
      alerts,
      corrections: [],
      warehouseName: META_DATA.warehouseName,
      reportPeriod: `${new Date(Date.now() - 86400000).toLocaleDateString()} - ${new Date().toLocaleDateString()}`,
    });
    setShowExportMenu(false);
  };

  const handleExportExcel = () => {
    exportToExcel({
      shelves,
      trajectories,
      aisles,
      alerts,
      corrections: [],
      warehouseName: META_DATA.warehouseName,
      reportPeriod: `${new Date(Date.now() - 86400000).toLocaleDateString()} - ${new Date().toLocaleDateString()}`,
    });
    setShowExportMenu(false);
  };

  return (
    <div className="absolute top-0 left-0 right-0 bg-gray-900/95 backdrop-blur border-b border-gray-700 px-6 py-3 z-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-6 h-6 text-blue-400" />
            <h1 className="text-lg font-bold text-white">仓库货架热区巡检</h1>
            <span className="px-2 py-0.5 bg-blue-600/30 text-blue-300 text-xs rounded">
              3D WebGL
            </span>
          </div>
          <div className="h-6 w-px bg-gray-700" />
          <div className="text-sm text-gray-400">
            {META_DATA.warehouseName}
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-300">
                货架 <span className="text-white font-medium">{shelves.length}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-orange-400" />
              <span className="text-sm text-gray-300">
                平均热度 <span className="text-white font-medium">{avgHeat}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-green-400" />
              <span className="text-sm text-gray-300">
                机器人 <span className="text-white font-medium">{activeRobots}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-sm text-gray-300">
                告警 <span className="text-white font-medium">{unresolvedAlerts}</span>
              </span>
            </div>
          </div>

          <div className="h-6 w-px bg-gray-700" />

          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4 text-white" />
              <span className="text-sm text-white">导出</span>
            </button>

            {showExportMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden z-20">
                <button
                  onClick={handleScreenshot}
                  className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-700 transition-colors text-left"
                >
                  <Camera className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-200">截图导出</span>
                </button>
                <button
                  onClick={handleExportPDF}
                  className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-700 transition-colors text-left"
                >
                  <FileText className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-200">PDF 报告</span>
                </button>
                <button
                  onClick={handleExportExcel}
                  className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-700 transition-colors text-left"
                >
                  <FileText className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-200">Excel 数据</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
