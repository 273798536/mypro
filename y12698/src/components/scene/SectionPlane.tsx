import * as THREE from 'three';
import { useSceneStore } from '../../store/sceneStore';

export default function SectionPlane() {
  const show = useSceneStore((s) => s.showSectionPlane);
  const y = useSceneStore((s) => s.sectionPlaneY);
  const toggle = useSceneStore((s) => s.toggleSectionPlane);
  const setY = useSceneStore((s) => s.setSectionPlaneY);

  if (!show) return null;

  return (
    <group position={[0, y, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[120, 120]} />
        <meshBasicMaterial
          color="#00D4AA"
          transparent
          opacity={0.08}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[59.5, 60, 64]} />
        <meshBasicMaterial color="#00D4AA" transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.5, -60]}>
        <planeGeometry args={[18, 3]} />
        <meshBasicMaterial color="#0A1628" transparent opacity={0.9} />
      </mesh>
      <group position={[0, 0.5, -59.9]}>
        <mesh position={[-7.5, 0, 0]}>
          <planeGeometry args={[2, 2]} />
          <meshBasicMaterial color="#FF6B35" />
        </mesh>
      </group>
    </group>
  );
}
