import React, { useEffect, useRef } from 'react';
import { Stage3D } from '@/components/Stage3D';
import { ControlPanel } from '@/components/ControlPanel';
import { Toolbar } from '@/components/Toolbar';
import { useStageStore } from '@/store/useStageStore';
import { initializeDemoData } from '@/store/useStageStore';

export default function Home() {
  const { currentVersion, compareVersion, viewMode } = useStageStore();
  const isInitialized = useRef(false);

  useEffect(() => {
    if (!isInitialized.current) {
      initializeDemoData();
      isInitialized.current = true;
    }
  }, []);

  if (!currentVersion) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-[#0a0a12] text-white">
        <div className="text-center">
          <div className="animate-pulse mb-4">加载中...</div>
          <div className="text-sm text-gray-500">正在初始化舞台沙盘</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen flex bg-[#0a0a12] overflow-hidden">
      <div className="flex-1 relative flex">
        {viewMode === 'single' ? (
          <div className="flex-1 relative">
            <Stage3D version={currentVersion} />
            <div className="absolute top-4 left-4 z-10">
              <div className="bg-[#16213e]/90 backdrop-blur-sm px-4 py-2 rounded-lg border border-[#0f4c5c]">
                <span className="text-[#e94560] text-sm font-bold">
                  {currentVersion.name}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 relative border-r border-gray-700">
              <Stage3D version={compareVersion || currentVersion} />
              <div className="absolute top-4 left-4 z-10">
                <div className="bg-[#0f4c5c]/90 backdrop-blur-sm px-4 py-2 rounded-lg border border-[#0f4c5c]">
                  <span className="text-white text-sm font-bold">
                    {compareVersion?.name || '对比版本'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex-1 relative">
              <Stage3D version={currentVersion} />
              <div className="absolute top-4 left-4 z-10">
                <div className="bg-[#e94560]/90 backdrop-blur-sm px-4 py-2 rounded-lg border border-[#e94560]">
                  <span className="text-white text-sm font-bold">
                    {currentVersion.name}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
        <Toolbar />
      </div>

      <ControlPanel />
    </div>
  );
}
