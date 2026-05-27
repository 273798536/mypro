import { useEffect } from 'react';
import { Scene3D } from '@/components/three/Scene3D';
import { Toolbar } from '@/components/ui/Toolbar';
import { PropertiesPanel } from '@/components/ui/PropertiesPanel';
import { StepBar } from '@/components/ui/StepBar';
import { MenuBar } from '@/components/ui/MenuBar';
import { ValidationToast } from '@/components/ui/ValidationToast';
import { useStore } from '@/store';
import { initStore } from '@/store';

export default function Home() {
  const { currentScenario } = useStore();

  useEffect(() => {
    initStore();
  }, []);

  if (!currentScenario) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-dark-900">
        <div className="text-center">
          <div className="text-6xl mb-4">📐</div>
          <h1 className="text-2xl font-bold mb-2">几何证明旋转板</h1>
          <p className="text-white/60 mb-6">正在加载场景...</p>
          <div className="animate-pulse">
            <div className="w-32 h-2 bg-white/20 rounded mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative overflow-hidden">
      <Scene3D scene={currentScenario.scene} />
      <MenuBar />
      <Toolbar />
      <PropertiesPanel />
      <StepBar />
      <ValidationToast />
    </div>
  );
}
