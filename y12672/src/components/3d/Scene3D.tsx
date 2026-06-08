import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Environment } from '@react-three/drei';
import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import ContainerBox from './ContainerBox';
import { useAppStore } from '../../store/appStore';
import { Camera, Download } from 'lucide-react';
import type { AnomalyRecord, CameraState, ExportSnapshot, ProcessingRecord } from '../../types';

function CaptureHandler() {
  const saveCameraState = useAppStore((state) => state.saveCameraState);
  const { camera } = useThree();

  useEffect(() => {
    const saveInterval = setInterval(() => {
      const cameraState: CameraState = {
        position: {
          x: camera.position.x,
          y: camera.position.y,
          z: camera.position.z,
        },
        rotation: {
          x: camera.rotation.x,
          y: camera.rotation.y,
          z: camera.rotation.z,
        },
        zoom: (camera as THREE.PerspectiveCamera).zoom || 1,
        isLost: false,
        savedAt: new Date(),
      };
      saveCameraState(cameraState);
    }, 10000);

    return () => clearInterval(saveInterval);
  }, [camera, saveCameraState]);

  return null;
}

function SceneContent() {
  const containers = useAppStore((state) => state.containers);
  const anomalies = useAppStore((state) => state.anomalies);
  const selectedAnomaly = useAppStore((state) => state.selectedAnomaly);

  const getAnomalyForContainer = (containerId: string): AnomalyRecord | undefined => {
    return anomalies.find(
      (a) =>
        a.type === 'model_overlap' &&
        a.relatedContainerIds.includes(containerId)
    );
  };

  const isHighlighted = (containerId: string): boolean => {
    if (!selectedAnomaly) return false;
    return selectedAnomaly.relatedContainerIds.includes(containerId);
  };

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[100, 100, 50]} intensity={0.8} castShadow />
      <pointLight position={[-50, 50, -50]} intensity={0.4} />

      <Grid
        args={[300, 300]}
        cellSize={10}
        cellThickness={0.5}
        cellColor="#6f6f6f"
        sectionSize={20}
        sectionThickness={1}
        sectionColor="#9d4b4b"
        fadeDistance={400}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid
      />

      <group>
        {containers.map((container) => (
          <ContainerBox
            key={container.id}
            container={container}
            anomaly={getAnomalyForContainer(container.id)}
            highlighted={isHighlighted(container.id)}
          />
        ))}
      </group>

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.05}
        minDistance={10}
        maxDistance={500}
        maxPolarAngle={Math.PI / 2.1}
      />

      <Environment preset="city" background={false} />
    </>
  );
}

export default function Scene3D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const selectedAnomaly = useAppStore((state) => state.selectedAnomaly);
  const anomalies = useAppStore((state) => state.anomalies);
  const processingRecords = useAppStore((state) => state.processingRecords);
  const exportData = useAppStore((state) => state.exportData);
  const addProcessingRecord = useAppStore((state) => state.addProcessingRecord);
  const addHistoryLog = useAppStore((state) => state.addHistoryLog);

  const handleCaptureScreenshot = async () => {
    if (!canvasRef.current) return;

    setIsCapturing(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 100));

      const canvas = canvasRef.current;
      const dataURL = canvas.toDataURL('image/png');

      const targetAnomalyIds = selectedAnomaly
        ? [selectedAnomaly.id]
        : anomalies.map((a) => a.id);

      const relatedRecords = processingRecords.filter((pr) =>
        targetAnomalyIds.includes(pr.anomalyId)
      );

      const snapshot: ExportSnapshot = {
        type: 'screenshot',
        format: 'png',
        anomalyIds: targetAnomalyIds,
        processingRecords: relatedRecords,
        exportedBy: '当前用户',
        exportedAt: new Date(),
      };

      exportData(snapshot);

      const operator = '当前用户';
      const operatorRole = 'operations_team';

      const exportRecord: ProcessingRecord = {
        id: `pr_screenshot_${Date.now()}`,
        anomalyId: selectedAnomaly?.id || targetAnomalyIds[0] || '',
        operator,
        operatorRole,
        action: 'export',
        afterValue: `截图导出_${new Date().toLocaleString('zh-CN')}`,
        timestamp: new Date(),
        exportSnapshot: snapshot,
      };
      addProcessingRecord(exportRecord);

      targetAnomalyIds.forEach((anomalyId) => {
        addHistoryLog({
          id: `log_screenshot_${Date.now()}_${anomalyId}`,
          targetType: 'anomaly',
          targetId: anomalyId,
          operator,
          operatorRole,
          action: 'export',
          beforeState: {},
          afterState: { exportType: 'screenshot', snapshotId: snapshot.exportedAt.getTime() },
          reason: selectedAnomaly
            ? `导出异常 ${selectedAnomaly.type === 'model_overlap' ? '模型重叠' : selectedAnomaly.type === 'camera_lost' ? '相机视角丢失' : selectedAnomaly.type === 'size_exceed' ? '尺寸超限' : '位置偏移'} 的场景截图`
            : '导出当前三维场景截图',
          timestamp: new Date(),
        });
      });

      const link = document.createElement('a');
      link.download = `堆场三维截图_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataURL;
      link.click();
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div className="w-full h-full bg-gradient-to-b from-slate-900 to-slate-800 relative">
      <Canvas
        ref={canvasRef}
        shadows
        camera={{ position: [60, 80, 70], fov: 50 }}
        gl={{ preserveDrawingBuffer: true }}
      >
        <color attach="background" args={['#0f172a']} />
        <fog attach="fog" args={['#0f172a', 200, 600]} />
        <SceneContent />
        <CaptureHandler />
      </Canvas>

      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <button
          onClick={handleCaptureScreenshot}
          disabled={isCapturing}
          className="flex items-center gap-2 px-4 py-2 bg-white bg-opacity-90 hover:bg-opacity-100 text-slate-800 rounded-lg shadow-lg transition-all disabled:opacity-50"
        >
          {isCapturing ? (
            <Camera className="w-4 h-4 animate-pulse" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          <span className="text-sm font-medium">
            {selectedAnomaly ? '导出当前异常截图' : '导出场景截图'}
          </span>
        </button>
      </div>

      {selectedAnomaly && (
        <div className="absolute bottom-4 left-4 bg-slate-800 bg-opacity-90 text-white px-4 py-3 rounded-lg shadow-lg">
          <div className="text-sm font-medium mb-1">
            当前聚焦: {selectedAnomaly.type === 'model_overlap' ? '模型重叠' : selectedAnomaly.type === 'camera_lost' ? '相机视角丢失' : selectedAnomaly.type === 'size_exceed' ? '尺寸超限' : '位置偏移'}
          </div>
          <div className="text-xs text-slate-300">
            关联 {selectedAnomaly.relatedContainerIds.length} 个箱位
          </div>
        </div>
      )}
    </div>
  );
}
