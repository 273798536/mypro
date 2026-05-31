import React, { useRef, useState } from 'react';
import { WorkbenchLayout } from '@/components/layout/WorkbenchLayout';
import { LoadingPanel } from '@/components/panels/LoadingPanel';
import { DetailPanel } from '@/components/panels/DetailPanel';
import { Scene3D } from '@/components/3d/Scene3D';
import html2canvas from 'html2canvas';

export const WorkbenchPage: React.FC = () => {
  const sceneRef = useRef<HTMLDivElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const handleScreenshot = async () => {
    if (!sceneRef.current || isCapturing) return;

    setIsCapturing(true);
    try {
      const canvas = await html2canvas(sceneRef.current, {
        backgroundColor: '#0A1628',
        scale: 2,
        useCORS: true,
      });

      const link = document.createElement('a');
      link.download = `船舶稳性3D视图_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('截图失败:', error);
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <WorkbenchLayout
      leftPanel={<LoadingPanel />}
      centerPanel={
        <div ref={sceneRef} id="scene3d-container" className="w-full h-full relative">
          <Scene3D />
          {isCapturing && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="text-white text-lg font-medium">正在生成截图...</div>
            </div>
          )}
        </div>
      }
      rightPanel={<DetailPanel />}
      onScreenshot={handleScreenshot}
    />
  );
};
