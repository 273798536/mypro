import { useState, useEffect } from 'react';
import { Canvas } from '@/components/canvas/Canvas';
import { LayerPanel } from '@/components/layers/LayerPanel';
import { CommandTimeline } from '@/components/batch/CommandTimeline';
import { Toolbar } from '@/components/common/Toolbar';

export function CanvasPage() {
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const updateDimensions = () => {
      const headerHeight = 49;
      const width = window.innerWidth - 500;
      const height = window.innerHeight - headerHeight;
      setDimensions({ width, height });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <Toolbar />
      <div className="flex-1 flex overflow-hidden">
        <div className="w-64 flex-shrink-0">
          <LayerPanel />
        </div>
        <div className="flex-1 bg-gray-50 overflow-hidden">
          <Canvas width={dimensions.width} height={dimensions.height} />
        </div>
        <div className="w-80 flex-shrink-0">
          <CommandTimeline />
        </div>
      </div>
    </div>
  );
}
