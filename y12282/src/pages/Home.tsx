import { useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { LeftPanel } from '@/components/layout/LeftPanel';
import { RightPanel } from '@/components/layout/RightPanel';
import { Viewer3D } from '@/components/viewer3d/Viewer3D';
import { useAppStore } from '@/store/useAppStore';

export default function Home() {
  const { leftPanelCollapsed, rightPanelCollapsed, loadMockData } = useAppStore();

  useEffect(() => {
    loadMockData();
  }, [loadMockData]);

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-900 overflow-hidden">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <LeftPanel />
        <main
          className="flex-1 relative overflow-hidden"
          style={{
            marginLeft: leftPanelCollapsed ? '0' : '0',
            marginRight: rightPanelCollapsed ? '0' : '0',
          }}
        >
          <Viewer3D />
        </main>
        <RightPanel />
      </div>
    </div>
  );
}