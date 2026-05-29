import { useMemo } from 'react';
import { Sphere } from '@react-three/drei';
import { useStore } from '@/store/useStore';
import type { Anomaly } from '@/utils/fieldCalculation';

function AnomalyPulse({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <group position={position}>
      <Sphere args={[0.4, 16, 16]}>
        <meshBasicMaterial color={color} transparent opacity={0.15} wireframe />
      </Sphere>
      <Sphere args={[0.55, 16, 16]}>
        <meshBasicMaterial color={color} transparent opacity={0.08} wireframe />
      </Sphere>
    </group>
  );
}

export function AnomalyMarkers() {
  const anomalies = useStore((s) => s.anomalies);
  const charges = useStore((s) => s.charges);
  const testPoints = useStore((s) => s.testPoints);

  const markers = useMemo(() => {
    const result: { position: [number, number, number]; color: string; type: string }[] = [];

    for (const anomaly of anomalies) {
      if (anomaly.type === 'overlap') {
        const c0 = charges.find((c) => c.id === anomaly.relatedChargeIds[0]);
        if (c0) {
          result.push({
            position: c0.position,
            color: '#ff2222',
            type: 'overlap',
          });
        }
      } else if (anomaly.type === 'explosion') {
        const tp = testPoints.find((t) => t.id === anomaly.relatedTestPointIds[0]);
        if (tp) {
          result.push({
            position: tp.position,
            color: '#ff4444',
            type: 'explosion',
          });
        }
      } else if (anomaly.type === 'direction_reversal') {
        for (const tpId of anomaly.relatedTestPointIds) {
          const tp = testPoints.find((t) => t.id === tpId);
          if (tp) {
            result.push({
              position: tp.position,
              color: '#ff8800',
              type: 'direction_reversal',
            });
          }
        }
      }
    }

    return result;
  }, [anomalies, charges, testPoints]);

  return (
    <group>
      {markers.map((marker, idx) => (
        <AnomalyPulse
          key={`${marker.type}_${idx}`}
          position={marker.position}
          color={marker.color}
        />
      ))}
    </group>
  );
}
