import { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '../store';

interface VoxelGridProps {
  gridSize?: number;
}

function ErodedVoxels({ gridSize = 20 }: VoxelGridProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const params = useAppStore((s) => s.params);
  const isSimulating = useAppStore((s) => s.isSimulating);
  const timeRef = useRef(0);

  const { instances, heights } = useMemo(() => {
    const inst: Array<[number, number, number]> = [];
    const hs: number[] = [];

    for (let x = 0; x < gridSize; x++) {
      for (let z = 0; z < gridSize; z++) {
        const cx = x - gridSize / 2;
        const cz = z - gridSize / 2;
        const dist = Math.sqrt(cx * cx + cz * cz);
        let baseHeight = Math.max(0, 5 - dist * 0.25);
        baseHeight += Math.sin(x * 0.3) * 0.4 + Math.cos(z * 0.3) * 0.4;
        baseHeight = Math.max(0.1, baseHeight);
        inst.push([cx * 0.6, baseHeight / 2, cz * 0.6]);
        hs.push(baseHeight);
      }
    }
    return { instances: inst, heights: hs };
  }, [gridSize]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    if (isSimulating) timeRef.current += delta * params.erosionRate * 0.2;

    const dummy = new THREE.Object3D();
    const erosionFactor = Math.min(1, timeRef.current * 0.05);

    for (let i = 0; i < instances.length; i++) {
      const [x, , z] = instances[i];
      let h = heights[i] * (1 - erosionFactor * 0.3);

      const windAngle = (params.windDirection * Math.PI) / 180;
      const windX = Math.cos(windAngle);
      const windZ = Math.sin(windAngle);
      const windInfluence = (x * windX + z * windZ) * 0.02 * params.windSpeed * 0.05;
      h = Math.max(0.05, h - windInfluence);
      h = Math.max(0.05, h - params.vegetation * 0.05);
      h = Math.max(0.05, h + params.cohesion * 0.02);

      dummy.position.set(x, h / 2, z);
      dummy.scale.set(0.55, h, 0.55);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);

      const t = Math.min(1, h / 5);
      meshRef.current.setColorAt(
        i,
        new THREE.Color(0.85 - t * 0.3, 0.65 - t * 0.25, 0.4 - t * 0.15)
      );
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, instances.length]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.9} metalness={0.05} />
    </instancedMesh>
  );
}

function CameraStateWatcher() {
  const { camera } = useThree();
  const setCamera = useAppStore((s) => s.setCamera);
  const setCameraLost = useAppStore((s) => s.setCameraLost);
  const controlsRef = useRef<{ target: THREE.Vector3 } | null>(null);

  useFrame(() => {
    const pos = camera.position;
    const target = controlsRef.current?.target ?? new THREE.Vector3(0, 0, 0);
    const invalid =
      !isFinite(pos.x) ||
      !isFinite(pos.y) ||
      !isFinite(pos.z) ||
      !isFinite(target.x) ||
      !isFinite(target.y) ||
      !isFinite(target.z);
    if (invalid) {
      setCameraLost(true);
    } else {
      setCamera(
        [Number(pos.x.toFixed(3)), Number(pos.y.toFixed(3)), Number(pos.z.toFixed(3))],
        [Number(target.x.toFixed(3)), Number(target.y.toFixed(3)), Number(target.z.toFixed(3))]
      );
    }
  });

  return (
    <OrbitControls
      ref={(c) => {
        if (c) controlsRef.current = { target: c.target };
      }}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={3}
      maxDistance={60}
      maxPolarAngle={Math.PI * 0.49}
    />
  );
}

export default function VoxelScene() {
  const scene = useAppStore((s) => s.scene);

  return (
    <Canvas shadows className="w-full h-full">
      <PerspectiveCamera
        makeDefault
        position={scene.cameraPosition}
        fov={60}
        near={0.1}
        far={200}
      />
      <color attach="background" args={['#1F2937']} />
      <fog attach="fog" args={['#1F2937', 25, 55]} />

      <ambientLight intensity={0.35} color="#BFDBFE" />
      <directionalLight
        position={[12, 18, 8]}
        intensity={1.1}
        color="#FDE68A"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[-8, 6, -10]} intensity={0.25} color="#93C5FD" />

      <Grid
        position={[0, -0.01, 0]}
        args={[40, 40]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#78716C"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#C2956E"
        fadeDistance={40}
        fadeStrength={1}
        followCamera={false}
      />

      <ErodedVoxels gridSize={20} />
      <CameraStateWatcher />
      <Environment preset="sunset" />
    </Canvas>
  );
}
