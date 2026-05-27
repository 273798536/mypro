import React, { useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { DetailDrawer } from '@/components/layout/DetailDrawer';
import { Timeline } from '@/components/layout/Timeline';
import { Scene } from '@/components/three/Scene';
import { AlertBanner } from '@/components/ui/AlertBanner';
import { useSceneStore } from '@/store/useSceneStore';
import { useFilterStore } from '@/store/useFilterStore';
import { useHistoryStore } from '@/store/useHistoryStore';
import { slopes, getSlopeBounds } from '@/data/slopes';
import { accidents } from '@/data/accidents';
import { trajectories } from '@/data/trajectories';
import { runAllValidations } from '@/services/dataValidator';

const Home: React.FC = () => {
  const { validationErrors, setValidationErrors } = useSceneStore();
  const { riskLevels } = useFilterStore();
  const { loadVersionsFromStorage } = useHistoryStore();

  const bounds = getSlopeBounds();

  useEffect(() => {
    loadVersionsFromStorage();
  }, [loadVersionsFromStorage]);

  useEffect(() => {
    const errors = runAllValidations(slopes, trajectories, accidents, riskLevels);
    setValidationErrors(errors);
  }, [riskLevels, setValidationErrors]);

  const handleDismissError = (id: string) => {
    setValidationErrors(validationErrors.filter((e) => e.id !== id));
  };

  return (
    <div className="h-screen flex flex-col bg-slate-950 overflow-hidden">
      <Header />

      {validationErrors.length > 0 && (
        <AlertBanner errors={validationErrors} onDismiss={handleDismissError} />
      )}

      <div className="flex-1 flex overflow-hidden">
        <Sidebar />

        <div className="flex-1 relative" id="scene-container">
          <Scene slopes={slopes} accidents={accidents} bounds={bounds} />

          <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-white/70">
            <div>鼠标左键拖拽旋转 | 滚轮缩放 | 右键拖拽平移</div>
            <div className="text-white/40 mt-0.5">点击雪道或事故点查看详情</div>
          </div>
        </div>

        <DetailDrawer />
      </div>

      <Timeline />
    </div>
  );
};

export default Home;
