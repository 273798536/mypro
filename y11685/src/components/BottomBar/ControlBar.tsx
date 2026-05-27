import { useState } from 'react';
import { useMineStore } from '@/store/useMineStore';
import {
  Play,
  Pause,
  Camera,
  FileText,
  Download,
  Eye,
  EyeOff,
  DoorOpen,
  Users,
  Wind,
  Route,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { captureScreenshot, downloadImage, generatePDFReport, exportReportAsJSON } from '@/utils/exporter';

export function ControlBar() {
  const isPlaying = useMineStore((state) => state.isPlaying);
  const togglePlaying = useMineStore((state) => state.togglePlaying);
  const showSmoke = useMineStore((state) => state.showSmoke);
  const toggleSmoke = useMineStore((state) => state.toggleSmoke);
  const showRoute = useMineStore((state) => state.showRoute);
  const toggleRoute = useMineStore((state) => state.toggleRoute);
  const showDoors = useMineStore((state) => state.showDoors);
  const toggleDoors = useMineStore((state) => state.toggleDoors);
  const showPersons = useMineStore((state) => state.showPersons);
  const togglePersons = useMineStore((state) => state.togglePersons);
  const selectedRecord = useMineStore((state) => state.getSelectedRecord());

  const [exporting, setExporting] = useState(false);

  const handleScreenshot = async () => {
    try {
      setExporting(true);
      const dataUrl = await captureScreenshot('scene-container');
      downloadImage(dataUrl, `矿井通风截图_${new Date().toISOString().slice(0, 10)}.png`);
    } catch (error) {
      console.error('截图失败:', error);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPDF = async () => {
    if (!selectedRecord) return;
    try {
      setExporting(true);
      const dataUrl = await captureScreenshot('scene-container');
      await generatePDFReport(selectedRecord, dataUrl);
    } catch (error) {
      console.error('导出PDF失败:', error);
    } finally {
      setExporting(false);
    }
  };

  const handleExportJSON = () => {
    if (!selectedRecord) return;
    exportReportAsJSON(selectedRecord);
  };

  const toggleButtons = [
    { icon: Wind, label: '烟雾', active: showSmoke, onClick: toggleSmoke },
    { icon: Route, label: '路线', active: showRoute, onClick: toggleRoute },
    { icon: DoorOpen, label: '风门', active: showDoors, onClick: toggleDoors },
    { icon: Users, label: '人员', active: showPersons, onClick: togglePersons },
  ];

  return (
    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
      <div className="bg-gray-900/90 backdrop-blur-md rounded-xl border border-gray-700/50 shadow-2xl px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={togglePlaying}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200',
              isPlaying
                ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                : 'bg-gray-700/50 text-gray-300 border border-gray-600/50 hover:bg-gray-600/50'
            )}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span className="text-sm font-medium">{isPlaying ? '暂停' : '播放'}</span>
          </button>

          <div className="w-px h-8 bg-gray-700 mx-2" />

          <div className="flex items-center gap-1">
            {toggleButtons.map(({ icon: Icon, label, active, onClick }) => (
              <button
                key={label}
                onClick={onClick}
                className={cn(
                  'flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-all duration-200',
                  active
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-gray-700/50'
                )}
                title={label}
              >
                {active ? <Icon className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                <span className="text-xs">{label}</span>
              </button>
            ))}
          </div>

          <div className="w-px h-8 bg-gray-700 mx-2" />

          <div className="flex items-center gap-1">
            <button
              onClick={handleScreenshot}
              disabled={exporting}
              className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/50 transition-all duration-200 disabled:opacity-50"
              title="截图"
            >
              <Camera className="w-4 h-4" />
              <span className="text-xs">截图</span>
            </button>

            <button
              onClick={handleExportPDF}
              disabled={exporting}
              className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/50 transition-all duration-200 disabled:opacity-50"
              title="导出PDF报告"
            >
              <FileText className="w-4 h-4" />
              <span className="text-xs">报告</span>
            </button>

            <button
              onClick={handleExportJSON}
              className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/50 transition-all duration-200"
              title="导出数据"
            >
              <Download className="w-4 h-4" />
              <span className="text-xs">数据</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
