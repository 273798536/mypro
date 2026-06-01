import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Shelf } from './Shelf';
import { Probe } from './Probe';
import { Fan } from './Fan';
import { Product } from './Product';
import { HeatMap } from './HeatMap';
import { useStore } from '../../store/useStore';

function ColdRoomWalls() {
  return (
    <group>
      <mesh position={[0, 2.5, -4]} rotation={[0, 0, 0]}>
        <boxGeometry args={[14, 5, 0.1]} />
        <meshStandardMaterial color="#0a1628" transparent opacity={0.6} side={2} />
      </mesh>
      <mesh position={[0, 2.5, 4]} rotation={[0, 0, 0]}>
        <boxGeometry args={[14, 5, 0.1]} />
        <meshStandardMaterial color="#0a1628" transparent opacity={0.6} side={2} />
      </mesh>
      <mesh position={[-7, 2.5, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[8, 5, 0.1]} />
        <meshStandardMaterial color="#0a1628" transparent opacity={0.6} side={2} />
      </mesh>
      <mesh position={[7, 2.5, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[8, 5, 0.1]} />
        <meshStandardMaterial color="#0a1628" transparent opacity={0.6} side={2} />
      </mesh>
      <mesh position={[0, 5, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <boxGeometry args={[14, 8, 0.1]} />
        <meshStandardMaterial color="#0a1628" transparent opacity={0.5} side={2} />
      </mesh>
    </group>
  );
}

function FloorGrid() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[14, 8]} />
        <meshStandardMaterial color="#0d1b2a" />
      </mesh>
      <gridHelper
        args={[14, 14, '#1e3a5f', '#162942']}
        position={[0, 0.01, 0]}
      />
    </group>
  );
}

function SceneContent() {
  const {
    shelves,
    probes,
    fans,
    products,
    selection,
    clearSelection,
  } = useStore();

  return (
    <>
      <ambientLight intensity={0.4} color="#4a90d9" />
      <directionalLight
        position={[5, 8, 5]}
        intensity={0.8}
        color="#ffffff"
        castShadow
      />
      <pointLight position={[0, 4, 0]} intensity={0.5} color="#6bb3f0" />
      <pointLight position={[-4, 3, 2]} intensity={0.3} color="#4a90d9" />
      <pointLight position={[4, 3, -2]} intensity={0.3} color="#4a90d9" />

      <FloorGrid />
      <ColdRoomWalls />
      <HeatMap />

      {shelves.map((shelf) => (
        <Shelf
          key={shelf.id}
          shelf={shelf}
          isSelected={selection.type === 'shelf' && selection.id === shelf.id}
        />
      ))}

      {probes.map((probe) => (
        <Probe
          key={probe.id}
          probe={probe}
          isSelected={selection.type === 'probe' && selection.id === probe.id}
        />
      ))}

      {fans.map((fan) => (
        <Fan
          key={fan.id}
          fan={fan}
          isSelected={selection.type === 'fan' && selection.id === fan.id}
        />
      ))}

      {products.map((product) => (
        <Product
          key={product.id}
          product={product}
          isSelected={selection.type === 'product' && selection.id === product.id}
        />
      ))}

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={20}
        maxPolarAngle={Math.PI / 2.1}
        onClick={clearSelection}
      />
    </>
  );
}

export function ColdStore() {
  return (
    <Canvas
      camera={{ position: [10, 8, 10], fov: 50 }}
      style={{ background: 'linear-gradient(180deg, #061220 0%, #0a1628 100%)' }}
      gl={{ antialias: true, alpha: false }}
    >
      <SceneContent />
    </Canvas>
  );
}
