import { useRef, useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Camera,
  Download,
  Maximize2,
  X,
  Home,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAppStore } from '@/store';
import { TeethScene } from '@/components/TeethScene';
import { AnalysisPanel } from '@/components/AnalysisPanel';
import domtoimage from 'dom-to-image-more';

export function Analysis() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sceneRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);

  const {
    currentPackage,
    currentResult,
    setCurrentPackage,
    analysisState,
    setSelectedItemId,
    setDemoMode
  } = useAppStore();

  useEffect(() => {
    if (id) {
      setCurrentPackage(id);
    }
  }, [id, setCurrentPackage]);

  const handleExportScreenshot = useCallback(async () => {
    if (!sceneRef.current) return;
    
    setIsExporting(true);
    try {
      const dataUrl = await domtoimage.toPng(sceneRef.current, {
        quality: 1,
        bgcolor: '#1D2129',
        scale: 2
      });

      const link = document.createElement('a');
      link.download = `咬合分析_${currentPackage?.name || '截图'}_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('截图导出失败:', error);
    } finally {
      setIsExporting(false);
    }
  }, [currentPackage]);

  const handleEnterDemo = useCallback(() => {
    setDemoMode(true);
    navigate(`/demo/${id}`);
  }, [id, navigate, setDemoMode]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!currentPackage) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-950 text-gray-400">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-gray-600 border-t-blue-500 rounded-full mx-auto mb-4" />
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  if (!currentResult) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-950 text-white">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-3 border-gray-600 border-t-blue-500 rounded-full mx-auto mb-4" />
          <p className="text-lg font-medium">正在分析咬合数据</p>
          <p className="text-sm text-gray-500 mt-2">这可能需要几秒钟...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-white overflow-hidden">
      <header className="h-14 flex items-center justify-between px-4 border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm shrink-0 z-20">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-sm font-semibold">{currentPackage.name}</h1>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>{currentPackage.patientName || '未命名患者'}</span>
              <span>·</span>
              <span>{formatDate(currentPackage.createdAt)}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportScreenshot}
            disabled={isExporting}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-sm text-gray-300 transition-colors"
          >
            <Camera size={16} />
            {isExporting ? '导出中...' : '截图'}
          </button>
          <button
            onClick={handleEnterDemo}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm text-white transition-colors"
          >
            <Maximize2 size={16} />
            演示模式
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
          >
            <Home size={18} />
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div
          className={`relative transition-all duration-300 ${
            showLeftPanel ? 'w-64' : 'w-0'
          }`}
        >
          <div className={`h-full overflow-y-auto border-r border-gray-800 bg-gray-900 ${
            showLeftPanel ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}>
            <div className="p-4">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                数据包内容
              </h3>
              
              <div className="space-y-2">
                <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-blue-400" />
                    <span className="text-sm font-medium">牙模模型</span>
                  </div>
                  <div className="text-xs text-gray-500 space-y-1">
                    <div>upper_jaw.stl</div>
                    <div>lower_jaw.stl</div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-green-400" />
                    <span className="text-sm font-medium">患者记录</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    patient_record.txt
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-purple-400" />
                    <span className="text-sm font-medium">接触报告</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    contact_report.pdf
                  </div>
                </div>
              </div>

              {currentResult.notes && (
                <div className="mt-6 p-3 rounded-lg bg-purple-900/20 border border-purple-500/30">
                  <div className="text-xs font-medium text-purple-300 mb-1">
                    算法说明
                  </div>
                  <div className="text-xs text-purple-400">
                    {currentResult.notes}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <button
            onClick={() => setShowLeftPanel(!showLeftPanel)}
            className={`absolute top-1/2 -translate-y-1/2 z-10 p-1 rounded-r-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors ${
              showLeftPanel ? 'right-0 translate-x-full' : 'left-0'
            }`}
          >
            {showLeftPanel ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>

        <div className="flex-1 relative" ref={sceneRef}>
          <TeethScene
            viewMode={analysisState.viewMode}
            cameraMode={analysisState.cameraMode}
            isComplexCase={currentResult.isComplexCase}
            contactPoints={currentResult.contactPoints}
            malocclusions={currentResult.malocclusions}
            grindingAreas={currentResult.grindingAreas}
            showContactPoints={analysisState.showContactPoints}
            showMalocclusions={analysisState.showMalocclusions}
            showGrindingAreas={analysisState.showGrindingAreas}
            showAnnotations={analysisState.showAnnotations}
            onSelectItem={setSelectedItemId}
            selectedItemId={analysisState.selectedItemId}
          />

          <div className="absolute bottom-4 left-4 flex flex-wrap gap-3 p-3 rounded-xl bg-gray-900/80 backdrop-blur-sm border border-gray-700">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-xs text-gray-400">正常接触</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-xs text-gray-400">错位接触</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <span className="text-xs text-gray-400">磨改区域</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              <span className="text-xs text-gray-400">冲突区域</span>
            </div>
          </div>

          <div className="absolute top-4 left-4 px-3 py-1.5 rounded-lg bg-gray-900/80 backdrop-blur-sm border border-gray-700">
            <span className="text-xs text-gray-400">
              视图: {
                analysisState.viewMode === 'combined' ? '组合' :
                analysisState.viewMode === 'upper' ? '仅上颌' :
                analysisState.viewMode === 'lower' ? '仅下颌' : '分离'
              } · {
                analysisState.cameraMode === 'orthographic' ? '正交' : '透视'
              }
            </span>
          </div>
        </div>

        <div
          className={`relative transition-all duration-300 ${
            showRightPanel ? 'w-80' : 'w-0'
          }`}
        >
          <div className={`h-full ${
            showRightPanel ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}>
            <AnalysisPanel
              result={currentResult}
              onExportScreenshot={handleExportScreenshot}
              onEnterDemo={handleEnterDemo}
            />
          </div>
          
          <button
            onClick={() => setShowRightPanel(!showRightPanel)}
            className={`absolute top-1/2 -translate-y-1/2 z-10 p-1 rounded-l-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors ${
              showRightPanel ? 'left-0 -translate-x-full' : 'right-0'
            }`}
          >
            {showRightPanel ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
