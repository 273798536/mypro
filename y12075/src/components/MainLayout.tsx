import { useState, useRef } from 'react';
import Scene3D from './Scene3D';
import Heatmap2D from './Heatmap2D';
import SectionFilter from './SectionFilter';
import DataDetail from './DataDetail';
import CorrectionPanel from './CorrectionPanel';
import ChangeHistory from './ChangeHistory';
import OcclusionPanel from './OcclusionPanel';
import ViewpointControls from './ViewpointControls';
import { useThree } from '@react-three/fiber';

export default function MainLayout() {
  const [currentView, setCurrentView] = useState<{
    position: [number, number, number];
    target: [number, number, number];
  }>({
    position: [0, 12, 15],
    target: [0, 0, 0],
  });

  const handleViewChange = (pos: [number, number, number], target: [number, number, number]) => {
    setCurrentView({ position: pos, target });
  };

  const handleLoadViewpoint = (vp: { position: [number, number, number]; target: [number, number, number] }) => {
    setCurrentView(vp);
  };

  return (
    <div className="flex h-screen bg-[#0a1628]">
      <div className="flex-1 relative">
        <Scene3D onViewChange={handleViewChange} />
        <ViewpointControls
          currentPosition={currentView.position}
          currentTarget={currentView.target}
          onLoadViewpoint={handleLoadViewpoint}
        />

        <div className="absolute bottom-4 left-4 z-10 p-3 bg-[#1a2d4a]/90 border border-[#3A4A5C] rounded">
          <p className="text-xs text-gray-400">
            <span className="text-[#D4A843]">拖拽</span> 旋转 | 
            <span className="text-[#D4A843]"> 滚轮</span> 缩放 | 
            <span className="text-[#D4A843]"> 点击</span> 选择座位/乐手
          </p>
        </div>
      </div>

      <div className="w-80 bg-[#0d1f35] border-l border-[#3A4A5C] overflow-y-auto flex-shrink-0">
        <div className="p-4 border-b border-[#3A4A5C]">
          <h1 className="text-lg font-bold text-[#F5F0E8] font-['Playfair_Display']">
            交响乐团声压可视化
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            3D声场分析系统
          </p>
        </div>

        <div className="p-4 space-y-4">
          <SectionFilter />
          <Heatmap2D />
          <DataDetail />
          <OcclusionPanel />
          <CorrectionPanel />
          <ChangeHistory />
        </div>
      </div>
    </div>
  );
}
