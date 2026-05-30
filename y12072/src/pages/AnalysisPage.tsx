import { useEffect } from 'react';
import { Toolbar } from '../components/toolbar/Toolbar';
import { Sidebar } from '../components/sidebar/Sidebar';
import { Scene3D } from '../components/three/Scene3D';
import { useAppStore } from '../store/useAppStore';

export function AnalysisPage() {
  const loadData = useAppStore(state => state.loadData);
  const sidebarCollapsed = useAppStore(state => state.sidebarCollapsed);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="min-h-screen bg-[#121218] text-[#F5F0E6] overflow-hidden">
      <Toolbar />
      
      <div className="pt-14 flex h-screen">
        <div 
          className="flex-1 relative transition-all duration-300"
          style={{ marginRight: sidebarCollapsed ? 0 : 0 }}
        >
          <Scene3D />
          
          <div className="absolute bottom-4 left-4 bg-[#1E1E2A]/80 backdrop-blur-sm rounded-lg p-3 border border-[#3A3A4A]">
            <p className="text-xs text-[#A0A0A0] mb-1">操作提示</p>
            <ul className="text-xs text-[#888] space-y-0.5">
              <li>• 鼠标左键拖拽：旋转视角</li>
              <li>• 鼠标滚轮：缩放视图</li>
              <li>• 鼠标右键拖拽：平移视图</li>
              <li>• 点击数据点：查看详情</li>
            </ul>
          </div>
        </div>
        
        <Sidebar />
      </div>
    </div>
  );
}
