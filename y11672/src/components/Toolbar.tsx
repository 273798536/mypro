import { Camera, FileText, Download, RefreshCw, Eye, AlertTriangle, Package, Box } from 'lucide-react';
import { useYardStore } from '../store/useYardStore';
import { captureScreenshot, downloadScreenshot, downloadReport, exportDataAsJSON } from '../utils/export';

export function Toolbar() {
  const { containers, alerts, viewMode, setViewMode, initDemoData, runDetection, isLoading } = useYardStore();
  
  const handleScreenshot = async () => {
    try {
      const dataUrl = await captureScreenshot('yard-container');
      downloadScreenshot(dataUrl, `yard-${Date.now()}.png`);
    } catch (error) {
      console.error('Screenshot failed:', error);
      alert('截图失败，请重试');
    }
  };
  
  const handleExportReport = async () => {
    try {
      const dataUrl = await captureScreenshot('yard-container');
      downloadReport(containers, alerts, dataUrl, `yard-report-${Date.now()}.pdf`);
    } catch (error) {
      console.error('Report export failed:', error);
      downloadReport(containers, alerts, undefined, `yard-report-${Date.now()}.pdf`);
    }
  };
  
  const handleExportData = () => {
    exportDataAsJSON(containers, `yard-data-${Date.now()}.json`);
  };
  
  const handleRefreshData = () => {
    initDemoData();
    runDetection();
  };
  
  const viewModes = [
    { id: 'normal', label: '普通视图', icon: Eye },
    { id: 'danger', label: '危险品视图', icon: AlertTriangle },
    { id: 'pickup', label: '提箱视图', icon: Package },
  ] as const;
  
  const dangerCount = containers.filter(c => c.dangerousGoods.level > 0).length;
  const bookingCount = containers.filter(c => c.booking.trainId).length;
  
  return (
    <div className="h-14 bg-industrial-darker border-b border-industrial-gray/30 flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Box className="w-6 h-6 text-industrial-blue" />
          <span className="font-bold text-lg text-industrial-light">港口集装箱堆场</span>
          <span className="text-xs text-industrial-gray px-2 py-0.5 bg-industrial-dark rounded">Web3D</span>
        </div>
        
        <div className="h-6 w-px bg-industrial-gray/30" />
        
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <span className="text-industrial-gray">总箱数:</span>
            <span className="text-industrial-light font-mono">{containers.length}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-industrial-gray">危险品:</span>
            <span className="text-industrial-red font-mono">{dangerCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-industrial-gray">预约:</span>
            <span className="text-industrial-blue font-mono">{bookingCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-industrial-gray">告警:</span>
            <span className="text-industrial-yellow font-mono">{alerts.length}</span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="flex items-center bg-industrial-dark rounded p-0.5">
          {viewModes.map(mode => {
            const Icon = mode.icon;
            return (
              <button
                key={mode.id}
                onClick={() => setViewMode(mode.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded transition-colors ${
                  viewMode === mode.id
                    ? 'bg-industrial-blue text-white'
                    : 'text-industrial-gray hover:text-industrial-light hover:bg-industrial-dark/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {mode.label}
              </button>
            );
          })}
        </div>
        
        <div className="h-6 w-px bg-industrial-gray/30" />
        
        <button
          onClick={handleRefreshData}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-industrial-dark text-industrial-light rounded hover:bg-industrial-dark/50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          刷新数据
        </button>
        
        <button
          onClick={handleScreenshot}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-industrial-dark text-industrial-light rounded hover:bg-industrial-dark/50 transition-colors"
        >
          <Camera className="w-3.5 h-3.5" />
          截图
        </button>
        
        <button
          onClick={handleExportData}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-industrial-dark text-industrial-light rounded hover:bg-industrial-dark/50 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          数据
        </button>
        
        <button
          onClick={handleExportReport}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-industrial-blue text-white rounded hover:bg-industrial-blue/80 transition-colors"
        >
          <FileText className="w-3.5 h-3.5" />
          作业报告
        </button>
      </div>
    </div>
  );
}
