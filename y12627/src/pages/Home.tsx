import { useEffect } from 'react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { Canvas } from '@/components/Canvas';
import { ColorRulesPanel } from '@/components/ColorRulesPanel';
import { Toolbar } from '@/components/Toolbar';
import { RecordsTimeline } from '@/components/RecordsTimeline';

export default function Home() {
  const {
    scaleRatio,
    triggerErrorDemo,
    triggerRecoveryDemo,
    cleanupSession
  } = useCanvasStore();

  const hasScaleError = scaleRatio !== '1:100';

  useEffect(() => {
    return () => {
      cleanupSession();
    };
  }, [cleanupSession]);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden font-body">
      <div className="flex-1 flex overflow-hidden">
        <ColorRulesPanel />
        
        <div className="flex-1 relative overflow-hidden">
          <Toolbar
            onTriggerError={triggerErrorDemo}
            onTriggerRecovery={triggerRecoveryDemo}
            hasScaleError={hasScaleError}
          />
          
          <div className="absolute inset-0 pt-24">
            <Canvas />
          </div>
        </div>
      </div>
      
      <RecordsTimeline />
    </div>
  );
}