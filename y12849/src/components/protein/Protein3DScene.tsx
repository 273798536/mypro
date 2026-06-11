import { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { Mutation } from '../../types';
import type { ProteinAtom } from '../../data/proteinData';
import { ELEMENT_COLORS } from '../../data/proteinData';

interface MutationMarkerProps {
  mutation: Mutation;
  isSelected: boolean;
  onClick: () => void;
}

function MutationMarker({ mutation, isSelected, onClick }: MutationMarkerProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const geometry = useMemo(() => {
    switch (mutation.type) {
      case 'missense':
        return new THREE.SphereGeometry(isSelected ? 0.8 : 0.6, 16, 16);
      case 'nonsense':
        return new THREE.OctahedronGeometry(isSelected ? 0.9 : 0.7);
      case 'synonymous':
        return new THREE.BoxGeometry(isSelected ? 1.0 : 0.8, isSelected ? 1.0 : 0.8, isSelected ? 1.0 : 0.8);
      case 'frameshift':
        return new THREE.TorusKnotGeometry(isSelected ? 0.5 : 0.4, 0.15, 32, 8);
      default:
        return new THREE.SphereGeometry(isSelected ? 0.7 : 0.5, 16, 16);
    }
  }, [mutation.type, isSelected]);

  const color = useMemo(() => {
    switch (mutation.type) {
      case 'missense':
        return '#FF8C42';
      case 'nonsense':
        return '#EF4444';
      case 'synonymous':
        return '#10B981';
      case 'frameshift':
        return '#8B5CF6';
      default:
        return '#6B7280';
    }
  }, [mutation.type]);

  useFrame((state) => {
    if (meshRef.current) {
      if (mutation.type === 'frameshift') {
        meshRef.current.rotation.x += 0.01;
        meshRef.current.rotation.y += 0.01;
      }
      if (isSelected || hovered) {
        const scale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.1;
        meshRef.current.scale.setScalar(scale);
      }
    }
  });

  return (
    <group position={[mutation.position3d.x, mutation.position3d.y, mutation.position3d.z]}>
      <mesh
        ref={meshRef}
        geometry={geometry}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isSelected ? 0.4 : hovered ? 0.2 : 0.1}
          metalness={0.3}
          roughness={0.4}
        />
      </mesh>
      {isSelected && (
        <mesh>
          <ringGeometry args={[1.2, 1.4, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

interface ProteinBackboneProps {
  atoms: ProteinAtom[];
}

function ProteinBackbone({ atoms }: ProteinBackboneProps) {
  const caAtoms = atoms.filter(a => a.id.startsWith('CA-'));

  const tubeGeometry = useMemo(() => {
    if (caAtoms.length < 2) return null;
    const points = caAtoms.map(a => new THREE.Vector3(a.position.x, a.position.y, a.position.z));
    const curve = new THREE.CatmullRomCurve3(points);
    return new THREE.TubeGeometry(curve, caAtoms.length * 2, 0.2, 8, false);
  }, [caAtoms]);

  if (!tubeGeometry) return null;

  return (
    <mesh geometry={tubeGeometry}>
      <meshStandardMaterial
        color="#9099A3"
        transparent
        opacity={0.35}
        metalness={0.1}
        roughness={0.8}
      />
    </mesh>
  );
}

interface AtomSpheresProps {
  atoms: ProteinAtom[];
}

function AtomSpheres({ atoms }: AtomSpheresProps) {
  const instancedMeshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const displayAtoms = atoms.filter(a => a.id.startsWith('CA-') || a.id.startsWith('CB-'));

  useMemo(() => {
    if (!instancedMeshRef.current) return;
    displayAtoms.forEach((atom, i) => {
      dummy.position.set(atom.position.x, atom.position.y, atom.position.z);
      const scale = atom.id.startsWith('CA-') || atom.id.startsWith('CB-') ? 0.35 : 0.25;
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      instancedMeshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    instancedMeshRef.current.instanceMatrix.needsUpdate = true;
  }, [displayAtoms, dummy]);

  return (
    <instancedMesh
      ref={instancedMeshRef}
      args={[new THREE.SphereGeometry(1, 8, 8), null, displayAtoms.length]}
    >
      <meshStandardMaterial metalness={0.2} roughness={0.6} />
    </instancedMesh>
  );
}

interface Protein3DSceneProps {
  atoms: ProteinAtom[];
  mutations: Mutation[];
  selectedMutationId: string | null;
  onMutationSelect: (mutationId: string | null) => void;
}

export default function Protein3DScene({ atoms, mutations, selectedMutationId, onMutationSelect }: Protein3DSceneProps) {
  return (
    <div className="w-full h-full relative">
      <Canvas
        camera={{ position: [15, 10, 15], fov: 50 }}
        style={{ background: 'linear-gradient(135deg, #0A1929 0%, #1E3A5F 100%)' }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 10, 5]} intensity={1.2} color="#FFFFFF" />
        <directionalLight position={[-10, -5, -10]} intensity={0.6} color="#87CEEB" />
        <directionalLight position={[0, 10, -10]} intensity={0.4} color="#FFFFFF" />

        <ProteinBackbone atoms={atoms} />
        <AtomSpheres atoms={atoms} />

        {mutations.map((mutation) => (
          <MutationMarker
            key={mutation.id}
            mutation={mutation}
            isSelected={selectedMutationId === mutation.id}
            onClick={() => onMutationSelect(selectedMutationId === mutation.id ? null : mutation.id)}
          />
        ))}

        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={5}
          maxDistance={50}
          autoRotate={false}
        />

        <fog attach="fog" args={['#0A1929', 20, 60]} />
      </Canvas>

      <div className="absolute bottom-4 left-4 bg-black/60 text-white text-xs p-3 rounded-[2px] backdrop-blur-sm">
        <p className="font-medium mb-1">操作提示</p>
        <p>🖱️ 左键拖拽：旋转视角</p>
        <p>🖱️ 滚轮：缩放</p>
        <p>🖱️ 右键拖拽：平移</p>
        <p className="mt-1 text-blue-300">💡 点击彩色标记查看突变详情</p>
      </div>
    </div>
  );
}
