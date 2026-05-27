import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, PerspectiveCamera } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import FunnelMesh from './FunnelMesh';
import StarField from './StarField';
import { useFunnelStore } from '@/store/funnelStore';

export default function FunnelScene3D() {
  const funnelData = useFunnelStore((s) => s.funnelData);
  const layerCount = funnelData.length;
  const cameraY = -(layerCount * 0.75) / 2;

  return (
    <div className="w-full h-full absolute inset-0">
      <Canvas
        id="funnel-canvas"
        gl={{ preserveDrawingBuffer: true, antialias: true }}
        dpr={[1, 2]}
      >
        <PerspectiveCamera makeDefault position={[4, cameraY + 1, 5]} fov={50} />
        <OrbitControls
          enablePan
          enableZoom
          enableRotate
          minDistance={4}
          maxDistance={15}
          target={[0, cameraY, 0]}
        />

        <color attach="background" args={['#0A1628']} />
        <fog attach="fog" args={['#0A1628', 15, 30]} />

        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 8, 5]} intensity={0.8} color="#e0f0ff" />
        <directionalLight position={[-3, -5, 2]} intensity={0.3} color="#F0B429" />
        <pointLight position={[0, 3, 0]} intensity={0.5} color="#4FC3F7" distance={10} />

        <StarField />
        <FunnelMesh />

        <EffectComposer>
          <Bloom
            intensity={0.8}
            luminanceThreshold={0.2}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
