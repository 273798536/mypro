import { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useImplicitSurface } from '../hooks/useImplicitSurface';
import { Point3D } from '../utils/implicitParser';

interface SurfaceMeshProps {
  bounds: { min: Point3D; max: Point3D };
}

function SurfaceMesh({ bounds }: SurfaceMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const currentFormula = useWorkspaceStore((state) => state.currentFormula);
  const parameters = useWorkspaceStore((state) => state.parameters);
  const resolution = useWorkspaceStore((state) => state.viewportSettings.resolution);

  const { geometry, isValid, isLoading } = useImplicitSurface({
    expression: currentFormula?.expression || 'x^2 + y^2 + z^2 - 1',
    parameters,
    bounds,
    resolution,
    colorMode: currentFormula?.colorRule.mode || 'normal',
    colormap: currentFormula?.colorRule.colormap || 'viridis',
  });

  useFrame((state) => {
    if (meshRef.current) {
    }
  });

  if (!geometry || !isValid || isLoading) {
    return null;
  }

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial
        vertexColors
        side={THREE.DoubleSide}
        metalness={0.1}
        roughness={0.8}
        flatShading={false}
      />
    </mesh>
  );
}

interface SectionPlaneMeshProps {
  plane: {
    id: string;
    normal: [number, number, number];
    offset: number;
    visible: boolean;
    color: string;
  };
  bounds: { min: Point3D; max: Point3D };
}

function SectionPlaneMesh({ plane, bounds }: SectionPlaneMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const updateSectionPlane = useWorkspaceStore((state) => state.updateSectionPlane);

  const size = useMemo(() => {
    return Math.max(
      bounds.max.x - bounds.min.x,
      bounds.max.y - bounds.min.y,
      bounds.max.z - bounds.min.z
    ) * 1.2;
  }, [bounds]);

  const position = useMemo(() => {
    const len = Math.sqrt(
      plane.normal[0] ** 2 + plane.normal[1] ** 2 + plane.normal[2] ** 2
    );
    return [
      plane.normal[0] * plane.offset,
      plane.normal[1] * plane.offset,
      plane.normal[2] * plane.offset,
    ] as [number, number, number];
  }, [plane.normal, plane.offset]);

  const rotation = useMemo(() => {
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(...plane.normal).normalize()
    );
    const e = new THREE.Euler().setFromQuaternion(q);
    return [e.x, e.y, e.z] as [number, number, number];
  }, [plane.normal]);

  if (!plane.visible) return null;

  return (
    <group ref={groupRef}>
      <mesh position={position} rotation={rotation}>
        <planeGeometry args={[size, size]} />
        <meshBasicMaterial
          color={plane.color}
          transparent
          opacity={0.2}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={position} rotation={rotation}>
        <planeGeometry args={[size, size]} />
        <meshBasicMaterial
          color={plane.color}
          wireframe
          transparent
          opacity={0.4}
        />
      </mesh>
    </group>
  );
}

function SceneContent() {
  const viewportSettings = useWorkspaceStore((state) => state.viewportSettings);
  const sectionPlanes = useWorkspaceStore((state) => state.sectionPlanes);

  const bounds = useMemo(
    () => ({
      min: { x: -3, y: -3, z: -3 },
      max: { x: 3, y: 3, z: 3 },
    }),
    []
  );

  return (
    <>
      <PerspectiveCamera makeDefault position={[6, 4, 6]} fov={50} />
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={2}
        maxDistance={20}
      />

      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
      <directionalLight position={[-5, 3, -5]} intensity={0.5} />
      <pointLight position={[0, 5, 0]} intensity={0.3} />

      {viewportSettings.showGrid && (
        <Grid
          infiniteGrid
          cellSize={1}
          cellThickness={0.5}
          cellColor="#2a3f5f"
          sectionSize={5}
          sectionThickness={1}
          sectionColor="#3d5a80"
          fadeDistance={30}
          fadeStrength={1}
          followCamera={false}
        />
      )}

      {viewportSettings.showAxes && (
        <>
          <arrowHelper
            args={[
              new THREE.Vector3(1, 0, 0),
              new THREE.Vector3(0, 0, 0),
              2,
              0xff4444,
              0.1,
              0.05,
            ]}
          />
          <arrowHelper
            args={[
              new THREE.Vector3(0, 1, 0),
              new THREE.Vector3(0, 0, 0),
              2,
              0x44ff44,
              0.1,
              0.05,
            ]}
          />
          <arrowHelper
            args={[
              new THREE.Vector3(0, 0, 1),
              new THREE.Vector3(0, 0, 0),
              2,
              0x4444ff,
              0.1,
              0.05,
            ]}
          />
        </>
      )}

      <SurfaceMesh bounds={bounds} />

      {sectionPlanes.map((plane) => (
        <SectionPlaneMesh key={plane.id} plane={plane} bounds={bounds} />
      ))}
    </>
  );
}

export default function Viewport3D() {
  const backgroundColor = useWorkspaceStore(
    (state) => state.viewportSettings.backgroundColor
  );

  return (
    <div className="w-full h-full relative">
      <Canvas
        gl={{ antialias: true, alpha: false }}
        onCreated={({ gl }) => {
          gl.setClearColor(backgroundColor);
        }}
      >
        <color attach="background" args={[backgroundColor]} />
        <SceneContent />
      </Canvas>
    </div>
  );
}
