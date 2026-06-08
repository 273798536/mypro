import { useState } from 'react';
import { Line } from '@react-three/drei';
import type { SoundRay as SoundRayType } from '@/types';
import { useParamLinkage } from '@/hooks/useParamLinkage';

export function SoundRays({ rays }: { rays: SoundRayType[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const { flashField } = useParamLinkage();

  return (
    <group>
      {rays.map((ray) => {
        const isSelected = ray.id === selected;
        const blocked = !!ray.blockedBy;
        const color = isSelected ? '#38BDF8' : blocked ? '#F43F5E' : '#10B981';
        return (
          <Line
            key={ray.id}
            points={[ray.startPoint, ray.endPoint]}
            color={color}
            lineWidth={isSelected ? 3 : 1.5}
            transparent
            opacity={isSelected ? 1 : 0.85}
            onPointerOver={(e) => {
              e.stopPropagation();
              document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => (document.body.style.cursor = 'auto')}
            onClick={(e) => {
              e.stopPropagation();
              setSelected(ray.id);
              flashField('deviceCoordinates', 900);
            }}
          />
        );
      })}

      {rays.map((ray) => (
        <mesh key={`sp_${ray.id}`} position={ray.startPoint}>
          <sphereGeometry args={[0.08, 12, 12]} />
          <meshBasicMaterial color="#FACC15" />
        </mesh>
      ))}
    </group>
  );
}
