import { useRef, useMemo } from 'react';
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Html, Grid } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { ExperimentObject } from '../types';
import { useAppStore } from '../store/useAppStore';

interface Object3DProps {
  object: ExperimentObject;
  isSelected: boolean;
  isHovered: boolean;
  onClick: () => void;
  onPointerOver: () => void;
  onPointerOut: () => void;
}

function Object3D({ object, isSelected, isHovered, onClick, onPointerOver, onPointerOut }: Object3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const color = useMemo(() => {
    if (isSelected) return '#06B6D4';
    if (isHovered) return '#38BDF8';
    return object.color;
  }, [isSelected, isHovered, object.color]);

  useFrame((state) => {
    if (meshRef.current) {
      if (isSelected) {
        const scale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.02;
        meshRef.current.scale.setScalar(scale);
      } else {
        meshRef.current.scale.setScalar(1);
      }
    }
  });

  const geometry = useMemo(() => {
    switch (object.type) {
      case 'source':
        return <sphereGeometry args={[object.size.x / 2, 16, 16]} />;
      case 'receiver':
        return <octahedronGeometry args={[object.size.x / 2, 0]} />;
      default:
        return <boxGeometry args={[object.size.x, object.size.y, object.size.z]} />;
    }
  }, [object.type, object.size]);

  const edgesGeometry = useMemo(() => {
    switch (object.type) {
      case 'source':
        return <sphereGeometry args={[object.size.x / 2 + 0.02, 16, 16]} />;
      case 'receiver':
        return <octahedronGeometry args={[object.size.x / 2 + 0.02, 0]} />;
      default:
        return <boxGeometry args={[object.size.x + 0.02, object.size.y + 0.02, object.size.z + 0.02]} />;
    }
  }, [object.type, object.size]);

  return (
    <group position={[object.position.x, object.position.y, object.position.z]}>
      <mesh
        ref={meshRef}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          onPointerOver();
        }}
        onPointerOut={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          onPointerOut();
        }}
      >
        {geometry}
        <meshStandardMaterial
          color={color}
          transparent
          opacity={isSelected ? 0.85 : isHovered ? 0.75 : 0.6}
          emissive={isSelected ? '#06B6D4' : isHovered ? '#0EA5E9' : '#000000'}
          emissiveIntensity={isSelected ? 0.3 : isHovered ? 0.15 : 0}
          side={THREE.DoubleSide}
        />
      </mesh>
      {(isSelected || isHovered) && (
        <lineSegments>
          {edgesGeometry}
          <lineBasicMaterial
            color={isSelected ? '#06B6D4' : '#38BDF8'}
            linewidth={2}
            transparent
            opacity={0.9}
          />
        </lineSegments>
      )}
      {isSelected && (
        <Html
          position={[0, object.size.y / 2 + 0.5, 0]}
          center
          distanceFactor={10}
          zIndexRange={[100, 0]}
        >
          <div className="bg-lab-bg/90 px-3 py-2 rounded-lg border border-lab-accent shadow-lg whitespace-nowrap backdrop-blur-sm">
            <div className="text-lab-accent font-semibold text-sm">{object.name}</div>
            <div className="text-gray-400 text-xs">{object.material}</div>
            <div className="text-gray-500 text-xs">吸声系数: {object.absorptionCoeff}</div>
          </div>
        </Html>
      )}
    </group>
  );
}

function RoomWalls() {
  return (
    <group>
      <mesh position={[0, 1.5, -4.1]} rotation={[0, 0, 0]}>
        <boxGeometry args={[10.2, 3.2, 0.05]} />
        <meshStandardMaterial color="#1E293B" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 1.5, 4.1]} rotation={[0, 0, 0]}>
        <boxGeometry args={[10.2, 3.2, 0.05]} />
        <meshStandardMaterial color="#1E293B" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[-5.1, 1.5, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[8.2, 3.2, 0.05]} />
        <meshStandardMaterial color="#1E293B" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[5.1, 1.5, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[8.2, 3.2, 0.05]} />
        <meshStandardMaterial color="#1E293B" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function SceneContent() {
  const { objects, selectedObjectId, hoveredObjectId, selectObject, hoverObject } = useAppStore();

  return (
    <>
      <ambientLight intensity={0.4} color="#94A3B8" />
      <directionalLight
        position={[5, 8, 5]}
        intensity={0.8}
        color="#F8FAFC"
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight
        position={[-5, 3, -5]}
        intensity={0.3}
        color="#06B6D4"
      />
      <pointLight position={[0, 3, 0]} intensity={0.5} color="#06B6D4" distance={15} />
      
      <Grid
        args={[20, 16]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#334155"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#475569"
        fadeDistance={30}
        fadeStrength={1}
        followCamera={false}
        position={[0, 0.01, 0]}
      />

      <RoomWalls />

      {objects.map((object) => (
        <Object3D
          key={object.id}
          object={object}
          isSelected={selectedObjectId === object.id}
          isHovered={hoveredObjectId === object.id}
          onClick={() => selectObject(selectedObjectId === object.id ? null : object.id)}
          onPointerOver={() => hoverObject(object.id)}
          onPointerOut={() => hoverObject(null)}
        />
      ))}

      <EffectComposer>
        <Bloom
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          intensity={0.5}
          mipmapBlur
        />
        <Vignette offset={0.5} darkness={0.5} />
      </EffectComposer>
    </>
  );
}

export function Scene3D() {
  return (
    <Canvas
      camera={{ position: [8, 6, 8], fov: 50 }}
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 2]}
      style={{ background: 'linear-gradient(180deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)' }}
    >
      <SceneContent />
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={3}
        maxDistance={20}
        maxPolarAngle={Math.PI / 2.1}
      />
    </Canvas>
  );
}
