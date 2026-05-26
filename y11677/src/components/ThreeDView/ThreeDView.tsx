import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { SpacecraftModel } from './SpacecraftModel';
import { StarField } from './StarField';
import { useAppStore } from '../../store/useAppStore';
import { quaternionToEuler, eulerToDegrees, isNormalized } from '../../utils/quaternion';

export const ThreeDView = () => {
  const { frames, currentFrameIndex, anomalies, showGrid, showAxes, cameraAutoRotate } = useAppStore();
  const currentFrame = frames[currentFrameIndex];

  const hasAnomaly = anomalies.some(
    (a) => a.frameIndex === currentFrameIndex && a.severity !== 'warning'
  );

  const quaternion = currentFrame?.quaternion || [1, 0, 0, 0];
  const eulerAngles = quaternionToEuler(quaternion);
  const eulerDegrees = eulerToDegrees(eulerAngles);
  const normalized = isNormalized(quaternion);

  return (
    <div className="relative w-full h-full bg-[#050a14]">
      <Canvas
        camera={{ position: [0, 2, 5], fov: 60 }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={['#050a14']} />
        <fog attach="fog" args={['#050a14', 10, 50]} />

        <ambientLight intensity={0.4} />
        <directionalLight
          position={[5, 5, 5]}
          intensity={1}
          color="#ffffff"
          castShadow
        />
        <directionalLight
          position={[-5, 3, -5]}
          intensity={0.5}
          color="#4488ff"
        />
        <pointLight position={[0, -2, 0]} intensity={0.5} color="#ff6600" />

        <StarField />

        {showGrid && (
          <Grid
            args={[10, 10]}
            cellSize={1}
            cellThickness={0.5}
            cellColor="#1a3a5c"
            sectionSize={5}
            sectionThickness={1}
            sectionColor="#2a5a8c"
            fadeDistance={30}
            fadeStrength={1}
            followCamera={false}
            infiniteGrid
          />
        )}

        {showAxes && (
          <group>
            <line>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  count={2}
                  array={new Float32Array([0, 0, 0, 2, 0, 0])}
                  itemSize={3}
                />
              </bufferGeometry>
              <lineBasicMaterial color="#ff0000" />
            </line>
            <line>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  count={2}
                  array={new Float32Array([0, 0, 0, 0, 2, 0])}
                  itemSize={3}
                />
              </bufferGeometry>
              <lineBasicMaterial color="#00ff00" />
            </line>
            <line>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  count={2}
                  array={new Float32Array([0, 0, 0, 0, 0, 2])}
                  itemSize={3}
                />
              </bufferGeometry>
              <lineBasicMaterial color="#0066ff" />
            </line>
          </group>
        )}

        <SpacecraftModel quaternion={quaternion} hasAnomaly={hasAnomaly} />

        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={2}
          maxDistance={20}
          autoRotate={cameraAutoRotate}
          autoRotateSpeed={0.5}
        />
      </Canvas>

      <div className="absolute top-4 left-4 bg-[#0a1628]/90 backdrop-blur-sm border border-[#00d4ff]/30 rounded-lg p-4 font-mono text-sm">
        <div className="text-[#00d4ff] font-bold mb-2">姿态数据</div>
        <div className="space-y-1 text-gray-300">
          <div className="flex justify-between gap-4">
            <span className="text-gray-500">Roll (X):</span>
            <span className="text-[#ff6600]">{eulerDegrees[0].toFixed(2)}°</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-500">Pitch (Y):</span>
            <span className="text-[#00ff88]">{eulerDegrees[1].toFixed(2)}°</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-500">Yaw (Z):</span>
            <span className="text-[#00d4ff]">{eulerDegrees[2].toFixed(2)}°</span>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-[#00d4ff]/20">
          <div className="flex items-center justify-between">
            <span className="text-gray-500">四元数状态:</span>
            <span
              className={`px-2 py-0.5 rounded text-xs font-bold ${
                normalized
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-red-500/20 text-red-400'
              }`}
            >
              {normalized ? '已归一化' : '未归一化'}
            </span>
          </div>
        </div>
      </div>

      <div className="absolute top-4 right-4 bg-[#0a1628]/90 backdrop-blur-sm border border-[#00d4ff]/30 rounded-lg p-4 font-mono text-sm">
        <div className="text-[#00d4ff] font-bold mb-2">四元数</div>
        <div className="space-y-1 text-gray-300">
          <div className="flex justify-between gap-4">
            <span className="text-gray-500">w:</span>
            <span>{quaternion[0].toFixed(4)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-500">x:</span>
            <span>{quaternion[1].toFixed(4)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-500">y:</span>
            <span>{quaternion[2].toFixed(4)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-500">z:</span>
            <span>{quaternion[3].toFixed(4)}</span>
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 left-4 bg-[#0a1628]/90 backdrop-blur-sm border border-[#00d4ff]/30 rounded-lg p-4 font-mono text-sm">
        <div className="text-[#00d4ff] font-bold mb-2">帧信息</div>
        <div className="space-y-1 text-gray-300">
          <div className="flex justify-between gap-4">
            <span className="text-gray-500">当前帧:</span>
            <span>{currentFrameIndex + 1} / {frames.length}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-500">时间戳:</span>
            <span>{currentFrame?.timestamp || 0}ms</span>
          </div>
          {currentFrame?.calibrationNote && (
            <div className="mt-2 pt-2 border-t border-[#00d4ff]/20">
              <span className="text-yellow-400 text-xs">📝 {currentFrame.calibrationNote}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
