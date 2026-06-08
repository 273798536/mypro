import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useDataStore } from '@/store/useDataStore';
import type { AbnormalType } from '@/types';

const COLORS: Record<AbnormalType, string> = {
  OUT_OF_BOUNDS: '#FF4D6D',
  COORDINATE_MIX: '#FF8A3D',
  DUPLICATE: '#9D4EDD',
};

export default function OutOfBoundsMarkers() {
  const records = useDataStore((s) => s.records);
  const selectedId = useDataStore((s) => s.selectedRecordId);
  const setSelected = useDataStore((s) => s.setSelectedRecord);
  const groupRef = useRef<THREE.Group>(null);

  const markers = useMemo(() => {
    return records
      .filter((r) => r.abnormalFlags.some((f) => !f.resolved))
      .map((r) => {
        const flag = r.abnormalFlags.find((f) => !f.resolved)!;
        return { record: r, type: flag.type, detail: flag.detail, color: COLORS[flag.type] };
      });
  }, [records]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();
    groupRef.current.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh;
      const s = 1 + 0.25 * Math.sin(t * 3 + i);
      mesh.scale.setScalar(s);
    });
  });

  return (
    <group ref={groupRef}>
      {markers.map(({ record, type, detail, color }) => {
        const selected = record.id === selectedId;
        return (
          <group key={record.id} position={[record.x, record.y, record.z]}>
            <mesh
              onClick={(e) => {
                e.stopPropagation();
                setSelected(record.id);
              }}
            >
              <sphereGeometry args={[selected ? 0.28 : 0.2, 16, 16]} />
              <meshBasicMaterial color={color} transparent opacity={0.35} />
            </mesh>
            <mesh>
              <sphereGeometry args={[0.06, 12, 12]} />
              <meshBasicMaterial color={color} />
            </mesh>
            {selected && (
              <Html distanceFactor={8} position={[0.35, 0.35, 0]}>
                <div className="panel-ocean px-2 py-1.5 text-xs whitespace-nowrap shadow-glow-red">
                  <div className="text-data-red font-mono mb-1">⚠ {type}</div>
                  <div className="text-slate-200">{detail}</div>
                  <div className="text-slate-400 mt-1 font-mono">
                    行 #{record.sourceMeta.originalLineNumber} · {record.sourceMeta.sourceFileName}
                  </div>
                </div>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
}
