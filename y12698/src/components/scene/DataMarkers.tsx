import { useMemo } from 'react';
import * as THREE from 'three';
import { useDataStore } from '../../store/dataStore';
import { useSceneStore } from '../../store/sceneStore';
import { transformToScene } from '../../utils/coordinateTransform';
import type { DataRecord } from '../../types';

function tempColor(r: DataRecord): string {
  if (r.isOutOfBounds) return '#FF4757';
  if (r.reviewStatus === 'disputed') return '#FFD93D';
  if (r.reviewStatus === 'approved') return '#00D4AA';
  if (r.temperature > 300) return '#FF6B35';
  if (r.temperature > 100) return '#FFA94D';
  return '#4DABF7';
}

export default function DataMarkers() {
  const allRecords = useDataStore((s) => s.records);
  const activeCoord = useDataStore((s) => s.activeCoordinateSystem);
  const statusFilter = useDataStore((s) => s.filterStatus);
  const showDup = useDataStore((s) => s.showDuplicates);
  const showOob = useDataStore((s) => s.showOutOfBounds);
  const selectedId = useSceneStore((s) => s.selectedRecordId);
  const selectRecord = useSceneStore((s) => s.selectRecord);

  const records = useMemo(() => {
    return allRecords.filter((r) => {
      if (activeCoord !== 'ALL' && r.coordinateSystem !== activeCoord) return false;
      if (statusFilter !== 'ALL' && r.reviewStatus !== statusFilter) return false;
      if (!showDup && r.isDuplicate) return false;
      if (!showOob && r.isOutOfBounds) return false;
      return true;
    });
  }, [allRecords, activeCoord, statusFilter, showDup, showOob]);

  const points = useMemo(() => {
    return records.map((r) => {
      const p = transformToScene(r.x, r.y, r.z_m, r.coordinateSystem);
      return { record: r, pos: new THREE.Vector3(p.x, p.y, p.z) };
    });
  }, [records]);

  return (
    <group>
      {points.map(({ record, pos }) => {
        const isSelected = selectedId === record.id;
        const color = tempColor(record);
        const ringColor = record.isDuplicate ? '#FFD93D' : color;
        const scale = isSelected ? 1.6 : record.isOutOfBounds ? 1.3 : 1.0;
        return (
          <group
            key={record.id}
            position={pos.toArray()}
            onClick={(e) => {
              e.stopPropagation();
              selectRecord(record);
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
              document.body.style.cursor = '';
            }}
          >
            <mesh>
              <sphereGeometry args={[0.5 * scale, 16, 16]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={isSelected ? 1.5 : 0.6}
                roughness={0.3}
              />
            </mesh>
            {record.isDuplicate && (
              <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
                <ringGeometry args={[0.8, 1.0, 32]} />
                <meshBasicMaterial color={ringColor} side={THREE.DoubleSide} />
              </mesh>
            )}
            {isSelected && (
              <>
                <mesh position={[0, 3, 0]}>
                  <cylinderGeometry args={[0.04, 0.04, 3, 6]} />
                  <meshBasicMaterial color="#00D4AA" />
                </mesh>
                <mesh position={[0, 4.6, 0]}>
                  <coneGeometry args={[0.35, 0.7, 6]} />
                  <meshBasicMaterial color="#00D4AA" />
                </mesh>
                <mesh position={[0, -0.4, 0]} rotation={[Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[1.4, 1.6, 48]} />
                  <meshBasicMaterial color="#00D4AA" transparent opacity={0.8} />
                </mesh>
              </>
            )}
            {record.isOutOfBounds && (
              <mesh position={[0.6, 0.6, 0.6]}>
                <sphereGeometry args={[0.25, 12, 12]} />
                <meshBasicMaterial color="#FF4757" />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}
