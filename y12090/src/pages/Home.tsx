import React, { useState, useEffect } from 'react';
import { TopToolbar } from '../components/layout/TopToolbar';
import { LeftPanel } from '../components/layout/LeftPanel';
import { RightPanel } from '../components/layout/RightPanel';
import { Scene3D } from '../components/three/Scene3D';
import { useDataStore } from '../store/useDataStore';
import { DataParser } from '../engine/DataParser';
import { OcclusionDetector } from '../engine/OcclusionDetector';
import { MOCK_CSV_CONTENT } from '../data/mockData';

const Home: React.FC = () => {
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const setSelectedSeatId = useDataStore((state) => state.setSelectedSeatId);
  const setParsedData = useDataStore((state) => state.setParsedData);
  const setOcclusionResults = useDataStore((state) => state.setOcclusionResults);

  useEffect(() => {
    const parser = new DataParser();
    const parsedData = parser.parseText(MOCK_CSV_CONTENT);
    setParsedData(parsedData);

    const detector = new OcclusionDetector();
    const results = detector.detectAll({
      seats: parsedData.seats,
      subtitleScreen: parsedData.subtitleScreen,
      auditoriumBounds: parsedData.auditoriumBounds,
    });
    setOcclusionResults(results);
  }, [setParsedData, setOcclusionResults]);

  const handleSeatClick = (seatId: string) => {
    setSelectedSeatId(seatId);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-900 overflow-hidden">
      <TopToolbar />

      <div className="flex-1 flex relative overflow-hidden">
        <LeftPanel
          isCollapsed={leftCollapsed}
          onToggle={() => setLeftCollapsed(!leftCollapsed)}
        />

        <div className="flex-1 relative">
          <Scene3D onSeatClick={handleSeatClick} />

          <div className="absolute bottom-4 left-4 bg-slate-800/90 backdrop-blur rounded-lg p-3 text-xs text-slate-300 space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-cyan-500" />
              <span>视线正常</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500" />
              <span>字幕屏遮挡</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-yellow-500" />
              <span>障碍物遮挡</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-purple-500" />
              <span>视线穿墙</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-pink-500" />
              <span>屏幕高度错误</span>
            </div>
          </div>

          <div className="absolute top-4 left-4 bg-slate-800/90 backdrop-blur rounded-lg px-3 py-2 text-xs text-slate-400">
            鼠标左键拖动旋转 | 滚轮缩放 | 右键拖动平移
          </div>
        </div>

        <RightPanel
          isCollapsed={rightCollapsed}
          onToggle={() => setRightCollapsed(!rightCollapsed)}
        />
      </div>
    </div>
  );
};

export default Home;
