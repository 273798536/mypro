import { useRef, useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  X,
  Camera,
  Download,
  Minimize2,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  SkipBack,
  SkipForward
} from 'lucide-react';
import { useAppStore } from '@/store';
import { TeethScene } from '@/components/TeethScene';
import domtoimage from 'dom-to-image-more';

export function DemoMode() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sceneRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isAutoRotate, setIsAutoRotate] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  const {
    currentPackage,
    currentResult,
    setCurrentPackage,
    analysisState,
    setSelectedItemId,
    setDemoMode,
    setShowContactPoints,
    setShowMalocclusions,
    setShowGrindingAreas,
    setShowAnnotations
  } = useAppStore();

  useEffect(() => {
    if (id) {
      setCurrentPackage(id);
    }
    setDemoMode(true);

    return () => {
      setDemoMode(false);
    };
  }, [id, setCurrentPackage, setDemoMode]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const handleMouseMove = () => {
      setShowControls(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    };

    window.addEventListener('mousemove', handleMouseMove);
    handleMouseMove();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(timeout);
    };
  }, []);

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
      link.download = `演示_${currentPackage?.name || '截图'}_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('截图导出失败:', error);
    } finally {
      setIsExporting(false);
    }
  }, [currentPackage]);

  const handleExitDemo = () => {
    setDemoMode(false);
    navigate(`/analysis/${id}`);
  };

  const slides = [
    {
      title: '整体咬合视图',
      description: '显示完整的上下颌牙列及咬合接触情况',
      showContacts: true,
      showMalocclusions: true,
      showGrinding: true,
      showAnnotations: true
    },
    {
      title: '接触点分布',
      description: '高亮显示所有咬合接触点，绿色为正常接触',
      showContacts: true,
      showMalocclusions: false,
      showGrinding: false,
      showAnnotations: false
    },
    {
      title: '错位检测',
      description: '红色箭头标注上下颌错位方向和距离',
      showContacts: false,
      showMalocclusions: true,
      showGrinding: false,
      showAnnotations: true
    },
    {
      title: '磨改分析',
      description: '橙色标记磨改区域，红色表示磨改过量',
      showContacts: false,
      showMalocclusions: false,
      showGrinding: true,
      showAnnotations: true
    },
    {
      title: '复合问题区域',
      description: '紫色标记错位与磨改重叠的冲突区域，已独立分析',
      showContacts: true,
      showMalocclusions: true,
      showGrinding: true,
      showAnnotations: true
    }
  ];

  useEffect(() => {
    if (currentResult) {
      const slide = slides[currentSlide];
      setShowContactPoints(slide.showContacts);
      setShowMalocclusions(slide.showMalocclusions);
      setShowGrindingAreas(slide.showGrinding);
      setShowAnnotations(slide.showAnnotations);
    }
  }, [currentSlide, currentResult, setShowContactPoints, setShowMalocclusions, setShowGrindingAreas, setShowAnnotations]);

  const handlePrevSlide = () => {
    setCurrentSlide(prev => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  const handleNextSlide = () => {
    setCurrentSlide(prev => (prev === slides.length - 1 ? 0 : prev + 1));
  };

  if (!currentPackage || !currentResult) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-950 text-gray-400">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-gray-600 border-t-blue-500 rounded-full mx-auto mb-4" />
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-950 text-white overflow-hidden relative">
      <div className="flex-1 h-full" ref={sceneRef}>
        <TeethScene
          viewMode="combined"
          cameraMode="orthographic"
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
      </div>

      <div
        className={`absolute inset-0 pointer-events-none transition-opacity duration-500 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between pointer-events-auto bg-gradient-to-b from-gray-950/80 to-transparent">
          <div>
            <h2 className="text-xl font-bold">{currentPackage.name}</h2>
            <p className="text-sm text-gray-400">{currentPackage.patientName}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportScreenshot}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800/80 hover:bg-gray-700/80 backdrop-blur-sm text-sm transition-colors"
            >
              <Camera size={16} />
              {isExporting ? '导出中...' : '导出截图'}
            </button>
            <button
              onClick={handleExitDemo}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800/80 hover:bg-gray-700/80 backdrop-blur-sm text-sm transition-colors"
            >
              <Minimize2 size={16} />
              退出演示
            </button>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 pointer-events-auto bg-gradient-to-t from-gray-950/90 to-transparent">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-4">
              <h3 className="text-lg font-bold mb-1">{slides[currentSlide].title}</h3>
              <p className="text-sm text-gray-400">{slides[currentSlide].description}</p>
            </div>

            <div className="flex items-center justify-center gap-4">
              <button
                onClick={handlePrevSlide}
                className="p-3 rounded-full bg-gray-800/80 hover:bg-gray-700/80 backdrop-blur-sm transition-colors"
              >
                <SkipBack size={20} />
              </button>
              <button
                onClick={() => setIsAutoRotate(!isAutoRotate)}
                className={`p-3 rounded-full backdrop-blur-sm transition-colors ${
                  isAutoRotate
                    ? 'bg-blue-600 hover:bg-blue-500'
                    : 'bg-gray-800/80 hover:bg-gray-700/80'
                }`}
              >
                {isAutoRotate ? <Pause size={20} /> : <Play size={20} />}
              </button>
              <button
                onClick={handleNextSlide}
                className="p-3 rounded-full bg-gray-800/80 hover:bg-gray-700/80 backdrop-blur-sm transition-colors"
              >
                <SkipForward size={20} />
              </button>
            </div>

            <div className="flex items-center justify-center gap-2 mt-4">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === currentSlide
                      ? 'w-8 bg-blue-500'
                      : 'bg-gray-600 hover:bg-gray-500'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="absolute bottom-32 left-4 flex flex-col gap-2">
          <button
            onClick={() => setShowContactPoints(!analysisState.showContactPoints)}
            className={`p-2 rounded-lg backdrop-blur-sm transition-colors ${
              analysisState.showContactPoints
                ? 'bg-green-600/80'
                : 'bg-gray-800/60 hover:bg-gray-700/60'
            }`}
            title="接触点"
          >
            {analysisState.showContactPoints ? <Eye size={18} /> : <EyeOff size={18} />}
          </button>
          <button
            onClick={() => setShowMalocclusions(!analysisState.showMalocclusions)}
            className={`p-2 rounded-lg backdrop-blur-sm transition-colors ${
              analysisState.showMalocclusions
                ? 'bg-red-600/80'
                : 'bg-gray-800/60 hover:bg-gray-700/60'
            }`}
            title="错位标注"
          >
            {analysisState.showMalocclusions ? <Eye size={18} /> : <EyeOff size={18} />}
          </button>
          <button
            onClick={() => setShowGrindingAreas(!analysisState.showGrindingAreas)}
            className={`p-2 rounded-lg backdrop-blur-sm transition-colors ${
              analysisState.showGrindingAreas
                ? 'bg-orange-600/80'
                : 'bg-gray-800/60 hover:bg-gray-700/60'
            }`}
            title="磨改区域"
          >
            {analysisState.showGrindingAreas ? <Eye size={18} /> : <EyeOff size={18} />}
          </button>
        </div>

        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 flex flex-wrap gap-3 p-3 rounded-xl bg-gray-900/60 backdrop-blur-sm border border-gray-700/50">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-xs text-gray-300">正常接触</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-xs text-gray-300">错位接触</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span className="text-xs text-gray-300">磨改区域</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500" />
            <span className="text-xs text-gray-300">冲突区域</span>
          </div>
        </div>
      </div>

      <div
        className={`absolute bottom-6 right-6 transition-opacity duration-500 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="text-xs text-gray-500">
          置信度: <span className="text-green-400 font-bold">{currentResult.confidence}%</span>
        </div>
      </div>
    </div>
  );
}
