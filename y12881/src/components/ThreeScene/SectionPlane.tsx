import { useSampleStore } from '@/store/useSampleStore';

export default function SectionPlane() {
  const { section } = useSampleStore();

  if (!section.showSectionPlane) return null;

  return (
    <group>
      {section.horizontalY !== null && (
        <mesh position={[0, section.horizontalY, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[80, 80]} />
          <meshBasicMaterial
            color="#00D4AA"
            transparent
            opacity={0.1}
            side={2}
          />
          <mesh position={[0, 0, 0]}>
            <ringGeometry args={[35, 36, 64]} />
            <meshBasicMaterial color="#00D4AA" transparent opacity={0.4} side={2} />
          </mesh>
        </mesh>
      )}
      {section.verticalX !== null && (
        <mesh position={[section.verticalX, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[80, 50]} />
          <meshBasicMaterial
            color="#5AD8FF"
            transparent
            opacity={0.08}
            side={2}
          />
        </mesh>
      )}
      {section.verticalZ !== null && (
        <mesh position={[0, 0, section.verticalZ]}>
          <planeGeometry args={[80, 50]} />
          <meshBasicMaterial
            color="#FFD166"
            transparent
            opacity={0.08}
            side={2}
          />
        </mesh>
      )}
    </group>
  );
}
