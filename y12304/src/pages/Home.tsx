import { useState } from 'react';
import { Scene } from '@/components/3d/Scene';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { Toolbar } from '@/components/common/Toolbar';
import { DetailModal } from '@/components/common/DetailModal';

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="h-screen w-screen flex bg-dark-950 overflow-hidden">
      <div className="flex-1 relative">
        <Scene />
        <Toolbar />
        <div className="absolute bottom-4 left-4 text-xs text-gray-500 bg-gray-900/80 backdrop-blur-sm px-3 py-2 rounded-lg">
          <span className="text-cyan-400">●</span> 系统运行正常 | 拖拽旋转 · 滚轮缩放 · 点击查看详情
        </div>
      </div>
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      <DetailModal />
    </div>
  );
}