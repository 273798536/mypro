import { useState, useEffect, useCallback } from 'react';
import { StarmapScene } from '../components/StarmapScene';
import { TopToolbar } from '../components/TopToolbar';
import { FilterPanel } from '../components/FilterPanel';
import { DetailPanel } from '../components/DetailPanel';
import { BottomStatusBar } from '../components/BottomStatusBar';
import { useStarmapStore } from '../store/useStarmapStore';
import { generateExample } from '../data/exampleData';
import { analyzeDataQuality } from '../utils/dataQuality';
import { detectOverlaps } from '../utils/overlapDetection';
import { Sparkles } from 'lucide-react';

export default function Home() {
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | null>(null);
  const dataPoints = useStarmapStore(s => s.dataPoints);
  const setDataPoints = useStarmapStore(s => s.setDataPoints);
  const setQualityReport = useStarmapStore(s => s.setQualityReport);
  const setOverlapRegions = useStarmapStore(s => s.setOverlapRegions);
  
  useEffect(() => {
    const { name, points } = generateExample('overlap');
    setDataPoints(points, name);
    
    const qualityReport = analyzeDataQuality(points);
    setQualityReport(qualityReport);
    
    const { regions } = detectOverlaps(points);
    setOverlapRegions(regions);
  }, [setDataPoints, setQualityReport, setOverlapRegions]);
  
  const handleScreenshotReady = useCallback((dataUrl: string) => {
    setScreenshotDataUrl(dataUrl);
  }, []);
  
  const handleTakeScreenshot = useCallback((): string | null => {
    if (typeof (window as any).__takeStarmapScreenshot === 'function') {
      (window as any).__takeStarmapScreenshot();
    }
    return screenshotDataUrl;
  }, [screenshotDataUrl]);
  
  return (
    <div className="h-screen w-screen flex flex-col bg-[#0A0E27] overflow-hidden">
      <TopToolbar onTakeScreenshot={handleTakeScreenshot} />
      
      <div className="flex-1 flex overflow-hidden">
        <div className="w-72 bg-gray-900/50 backdrop-blur-sm border-r border-gray-700/50 flex-shrink-0 overflow-hidden">
          <FilterPanel />
        </div>
        
        <div className="flex-1 relative overflow-hidden">
          {dataPoints.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="w-24 h-24 mb-6 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-600/20 flex items-center justify-center">
                <Sparkles className="w-12 h-12 text-cyan-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">AI特征误判星图</h2>
              <p className="text-gray-400 text-center max-w-md mb-8">
                通过3D可视化直观呈现高维特征空间中的类别重叠、异常点遮挡、降维不稳等问题
              </p>
              <div className="flex gap-4">
                <div className="text-center">
                  <div className="w-16 h-16 mb-2 rounded-lg bg-gray-800/50 border border-gray-700 flex items-center justify-center mx-auto">
                    <span className="text-2xl">🎯</span>
                  </div>
                  <p className="text-xs text-gray-500">类别重叠</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 mb-2 rounded-lg bg-gray-800/50 border border-gray-700 flex items-center justify-center mx-auto">
                    <span className="text-2xl">👁️</span>
                  </div>
                  <p className="text-xs text-gray-500">异常遮挡</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 mb-2 rounded-lg bg-gray-800/50 border border-gray-700 flex items-center justify-center mx-auto">
                    <span className="text-2xl">〰️</span>
                  </div>
                  <p className="text-xs text-gray-500">降维不稳</p>
                </div>
              </div>
              <p className="text-gray-600 text-sm mt-8">
                点击右上角「加载示例」或「导入数据」开始使用
              </p>
            </div>
          ) : (
            <StarmapScene onScreenshotReady={handleScreenshotReady} />
          )}
        </div>
        
        <div className="w-80 bg-gray-900/50 backdrop-blur-sm border-l border-gray-700/50 flex-shrink-0 overflow-hidden">
          <DetailPanel />
        </div>
      </div>
      
      <BottomStatusBar />
    </div>
  );
}
