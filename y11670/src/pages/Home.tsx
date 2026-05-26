import { useEffect, useState, useCallback } from 'react';
import { NetworkCanvas } from '../components/network/NetworkCanvas';
import { TopToolbar } from '../components/ui/TopToolbar';
import { FilterPanel } from '../components/ui/FilterPanel';
import { DetailPanel } from '../components/ui/DetailPanel';
import { BottomStatusBar } from '../components/ui/BottomStatusBar';
import { ReportModal } from '../components/ui/ReportModal';
import { useNetworkStore } from '../store/networkStore';

const Home = () => {
  const { loadMockData, nodes } = useNetworkStore();
  const [nodePositions, setNodePositions] = useState<Map<string, { x: number; y: number; z: number }>>(new Map());

  useEffect(() => {
    loadMockData();
  }, [loadMockData]);

  const handleNodePositionUpdate = useCallback((nodeId: string, pos: { x: number; y: number; z: number }) => {
    setNodePositions(prev => {
      const newMap = new Map(prev);
      newMap.set(nodeId, pos);
      return newMap;
    });
  }, []);

  const hasData = nodes.length > 0;

  return (
    <div className="w-full h-screen bg-space-black overflow-hidden relative">
      <div className="absolute inset-0">
        {hasData ? (
          <NetworkCanvas onNodePositionUpdate={handleNodePositionUpdate} />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-neon-cyan border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-400 font-mono">加载网络数据中...</p>
            </div>
          </div>
        )}
      </div>

      <TopToolbar />
      <FilterPanel />
      <DetailPanel />
      <BottomStatusBar />
      <ReportModal />

      <div className="absolute bottom-6 right-6 z-30 flex flex-col gap-2">
        <div className="p-3 bg-glass-bg backdrop-blur-xl rounded-xl border border-glass-border">
          <div className="text-xs text-gray-400 mb-2 font-mono">操作提示</div>
          <ul className="text-xs text-gray-500 space-y-1">
            <li>• 左键点击: 选中节点</li>
            <li>• 双击节点: 聚焦视图</li>
            <li>• 滚轮: 缩放视图</li>
            <li>• 拖拽: 旋转视角</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Home;
