import { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { SceneSetup, LossTerrain, TrainingPath, Annotations, AxisGrid } from '../components/three3d';
import { LeftPanel } from '../components/control/LeftPanel';
import { RightPanel } from '../components/control/RightPanel';
import { Timeline } from '../components/control/Timeline';
import { useLogStore } from '../store/useLogStore';
import { useSceneStore } from '../store/useSceneStore';
import { sampleLogData } from '../data/sample-log';
import { Mountain } from 'lucide-react';

export default function Home() {
  const [cameraPosition, setCameraPosition] = useState<[number, number, number]>([12, 10, 12]);
  const [cameraTarget, setCameraTarget] = useState<[number, number, number]>([0, 0, 0]);
  const { logEntries, anomalies, loadLog } = useLogStore();
  const { terrainData, trainingPath, annotations, showWireframe, useLogScale, generateTerrain } = useSceneStore();
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      loadLog(sampleLogData);
      generateTerrain(sampleLogData, 'step', 'learningRate');
    }
  }, [loadLog, generateTerrain]);

  useEffect(() => {
    if (logEntries.length > 0 && !terrainData) {
      generateTerrain(logEntries, 'step', 'learningRate');
    }
  }, [logEntries, terrainData, generateTerrain]);

  const handleCameraChange = (pos: [number, number, number], target: [number, number, number]) => {
    setCameraPosition(pos);
    setCameraTarget(target);
  };

  return (
    <div className="w-full h-full flex flex-col">
      <header className="h-14 px-6 flex items-center justify-between border-b border-primary-800/30 glass-panel">
        <div className="flex items-center gap-3">
          <Mountain className="text-primary-400" size={24} />
          <h1 className="text-lg font-bold text-primary-300">AI训练损失地形</h1>
          <span className="text-xs text-gray-500 ml-2">Loss Landscape Visualizer</span>
        </div>
        <div className="text-xs text-gray-500">
          拖拽旋转 · 滚轮缩放 · 右键平移
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <LeftPanel
          cameraPosition={cameraPosition}
          cameraTarget={cameraTarget}
        />

        <div className="flex-1 relative">
          <Canvas
            gl={{ antialias: true, alpha: false }}
            camera={{ position: [12, 10, 12], fov: 50 }}
            onCreated={({ gl }) => {
              gl.setClearColor('#0A1628');
            }}
          >
            <SceneSetup onCameraChange={handleCameraChange} />
            
            {terrainData && (
              <>
                <AxisGrid terrainData={terrainData} />
                <LossTerrain
                  terrainData={terrainData}
                  showWireframe={showWireframe}
                  useLogScale={useLogScale}
                />
                <TrainingPath path={trainingPath} />
                <Annotations
                  annotations={annotations}
                  anomalies={anomalies}
                />
              </>
            )}
          </Canvas>

          {!terrainData && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Mountain size={64} className="mx-auto mb-4 opacity-30" />
                <p>请上传训练日志或等待样例数据加载</p>
              </div>
            </div>
          )}

          <div className="absolute top-4 left-4 text-xs text-gray-500 space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary-500"></div>
              <span>训练步骤</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400"></div>
              <span>学习率</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-400"></div>
              <span>损失值</span>
            </div>
          </div>
        </div>

        <RightPanel />
      </div>

      <Timeline />
    </div>
  );
}
