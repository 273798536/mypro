import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Grid, Text, Float } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '../store';
import { StationFloor, Escalator, Barrier, Gate } from '../types';

interface FloorMeshProps {
  floor: StationFloor;
  isVisible: boolean;
  isSelected: boolean;
  onSelect: () => void;
}

const FloorMesh: React.FC<FloorMeshProps> = ({ floor, isVisible, isSelected, onSelect }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const yOffset = (floor.level - 1) * -floor.height;

  const shape = useMemo(() => {
    const s = new THREE.Shape();
    if (floor.boundaries.length > 0) {
      s.moveTo(floor.boundaries[0].x, floor.boundaries[0].y);
      for (let i = 1; i < floor.boundaries.length; i++) {
        s.lineTo(floor.boundaries[i].x, floor.boundaries[i].y);
      }
      s.closePath();
    }
    return s;
  }, [floor.boundaries]);

  const geometry = useMemo(() => {
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.5,
      bevelEnabled: false
    });
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, yOffset, 0);
    return geo;
  }, [shape, yOffset]);

  useFrame((state) => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.MeshStandardMaterial;
      material.opacity = isVisible ? (isSelected ? 0.9 : 0.6) : 0.15;
    }
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect();
  };

  return (
    <group>
      <mesh
        ref={meshRef}
        geometry={geometry}
        onClick={handleClick}
      >
        <meshStandardMaterial
          color={floor.color}
          transparent
          opacity={isVisible ? 0.6 : 0.15}
          side={THREE.DoubleSide}
        />
      </mesh>

      {isVisible && floor.escalators.map((escalator) => (
        <EscalatorMesh key={escalator.id} escalator={escalator} baseY={yOffset} />
      ))}

      {isVisible && floor.gates.map((gate) => (
        <GateMesh key={gate.id} gate={gate} baseY={yOffset} />
      ))}

      {isVisible && floor.barriers.map((barrier) => (
        <BarrierMesh key={barrier.id} barrier={barrier} baseY={yOffset} />
      ))}

      {isVisible && (
        <Text
          position={[0, yOffset + 1, 0]}
          fontSize={1.5}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          {floor.name}
        </Text>
      )}
    </group>
  );
};

interface EscalatorMeshProps {
  escalator: Escalator;
  baseY: number;
}

const EscalatorMesh: React.FC<EscalatorMeshProps> = ({ escalator, baseY }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const height = escalator.toFloor > escalator.fromFloor ? 4 : -4;

  const getStatusColor = () => {
    switch (escalator.status) {
      case 'error': return '#E63946';
      case 'warning': return '#F4A261';
      default: return '#2A9D8F';
    }
  };

  useFrame((state) => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.MeshStandardMaterial;
      material.emissive = new THREE.Color(getStatusColor());
      material.emissiveIntensity = escalator.status !== 'normal' ? 0.3 + Math.sin(state.clock.elapsedTime * 3) * 0.2 : 0.1;
    }
  });

  return (
    <group position={[escalator.position.x, baseY + 0.5, escalator.position.y]}>
      <mesh ref={meshRef} rotation={[0, 0, Math.PI / 6]}>
        <boxGeometry args={[2, 0.3, 8]} />
        <meshStandardMaterial
          color="#4A5568"
          metalness={0.8}
          roughness={0.3}
        />
      </mesh>
      <Float speed={2} rotationIntensity={0} floatIntensity={0.5}>
        <Text
          position={[0, 1, 0]}
          fontSize={0.5}
          color={getStatusColor()}
          anchorX="center"
          anchorY="middle"
        >
          {escalator.name}
        </Text>
      </Float>
      <mesh position={[0, height / 2, 0]}>
        <cylinderGeometry args={[0.1, 0.1, Math.abs(height), 8]} />
        <meshStandardMaterial color={getStatusColor()} emissive={getStatusColor()} emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
};

interface GateMeshProps {
  gate: Gate;
  baseY: number;
}

const GateMesh: React.FC<GateMeshProps> = ({ gate, baseY }) => {
  return (
    <group position={[gate.position.x, baseY + 0.5, gate.position.y]}>
      <mesh>
        <boxGeometry args={[4, 2, 0.3]} />
        <meshStandardMaterial color="#64748B" metalness={0.6} roughness={0.4} />
      </mesh>
      {[...Array(3)].map((_, i) => (
        <mesh key={i} position={[-1.2 + i * 1.2, 0, 0.2]}>
          <boxGeometry args={[0.8, 1.8, 0.1]} />
          <meshStandardMaterial color="#3B82F6" emissive="#3B82F6" emissiveIntensity={0.2} />
        </mesh>
      ))}
      <Text
        position={[0, 2.5, 0]}
        fontSize={0.4}
        color="#94A3B8"
        anchorX="center"
        anchorY="middle"
      >
        {gate.name}
      </Text>
    </group>
  );
};

interface BarrierMeshProps {
  barrier: Barrier;
  baseY: number;
}

const BarrierMesh: React.FC<BarrierMeshProps> = ({ barrier, baseY }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current && !barrier.active) {
      const material = meshRef.current.material as THREE.MeshStandardMaterial;
      material.opacity = 0.3 + Math.sin(state.clock.elapsedTime * 4) * 0.2;
    }
  });

  return (
    <group position={[barrier.position.x, baseY + 0.75, barrier.position.y]}>
      <mesh ref={meshRef}>
        <boxGeometry args={[barrier.width, 1.5, 0.3]} />
        <meshStandardMaterial
          color={barrier.active ? '#E63946' : '#94A3B8'}
          transparent
          opacity={barrier.active ? 0.9 : 0.5}
        />
      </mesh>
      {barrier.active && (
        <>
          {[...Array(Math.floor(barrier.width / 1.5))].map((_, i) => (
            <mesh key={i} position={[-barrier.width / 2 + 0.75 + i * 1.5, 0, 0.2]}>
              <boxGeometry args={[1, 0.1, 0.05]} />
              <meshStandardMaterial color="#FBBF24" />
            </mesh>
          ))}
        </>
      )}
    </group>
  );
};

const PassengerParticles: React.FC = () => {
  const count = 100;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(() => {
    return Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * 40,
      y: -Math.random() * 8 - 0.5,
      z: (Math.random() - 0.5) * 30,
      speed: 0.02 + Math.random() * 0.03,
      dir: Math.random() > 0.5 ? 1 : -1
    }));
  }, []);

  useFrame((state) => {
    if (!meshRef.current) return;
    
    particles.forEach((p, i) => {
      p.x += p.speed * p.dir;
      if (Math.abs(p.x) > 20) p.dir *= -1;
      
      dummy.position.set(p.x, p.y + Math.sin(state.clock.elapsedTime + i) * 0.1, p.z);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[0.15, 8, 8]} />
      <meshStandardMaterial color="#F97316" emissive="#F97316" emissiveIntensity={0.5} />
    </instancedMesh>
  );
};

const SceneContent: React.FC = () => {
  const { floors, visibleFloors, selectedFloor, setSelectedFloor } = useAppStore();

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 20, 10]} intensity={0.8} castShadow />
      <pointLight position={[0, 10, 0]} intensity={0.5} color="#60A5FA" />

      <Grid
        args={[100, 100]}
        cellSize={2}
        cellThickness={0.5}
        cellColor="#1E3A5F"
        sectionSize={10}
        sectionThickness={1}
        sectionColor="#3B82F6"
        fadeDistance={50}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid
      />

      {floors.map((floor) => (
        <FloorMesh
          key={floor.id}
          floor={floor}
          isVisible={visibleFloors.includes(floor.level)}
          isSelected={selectedFloor === floor.level}
          onSelect={() => setSelectedFloor(selectedFloor === floor.level ? null : floor.level)}
        />
      ))}

      <PassengerParticles />

      <OrbitControls
        makeDefault
        minDistance={10}
        maxDistance={80}
        maxPolarAngle={Math.PI / 2.1}
      />
    </>
  );
};

const StationScene: React.FC = () => {
  return (
    <Canvas
      camera={{ position: [30, 40, 30], fov: 50 }}
      gl={{ antialias: true, alpha: true }}
    >
      <color attach="background" args={['#0A1628']} />
      <fog attach="fog" args={['#0A1628', 30, 80]} />
      <SceneContent />
    </Canvas>
  );
};

export default StationScene;
