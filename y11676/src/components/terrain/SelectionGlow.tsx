import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useCashFlowStore } from '../../hooks/useCashFlowStore';

const CURRENCY_SPACING = 3;
const DATE_SPACING = 0.8;
const RING_RADIUS = 0.8;
const RING_TUBE = 0.08;
const GOLD_EMISSIVE = new THREE.Color('#ffd700');
const PULSE_SPEED = 3;

export default function SelectionGlow() {
  const ringRef = useRef<THREE.Mesh>(null);
  const selectedRecordId = useCashFlowStore((s) => s.selectedRecordId);
  const filteredRecords = useCashFlowStore((s) => s.filteredRecords);
  const filters = useCashFlowStore((s) => s.filters);

  const selectedCurrencies = useMemo(
    () => filters.selectedCurrencies.length > 0
      ? filters.selectedCurrencies
      : ['USD', 'EUR', 'GBP', 'JPY', 'CNY'],
    [filters.selectedCurrencies]
  );

  const selectedBar = useMemo(() => {
    if (!selectedRecordId) return null;
    const record = filteredRecords.find((r) => r.id === selectedRecordId);
    if (!record) return null;

    const sortedDates = [...new Set(filteredRecords.map((r) => r.flowDate))].sort();
    const dateIndexMap = new Map(sortedDates.map((d, i) => [d, i]));
    const currencyCount = selectedCurrencies.length;
    const totalDates = sortedDates.length;

    const currencyIdx = selectedCurrencies.indexOf(record.currency);
    const dateIdx = dateIndexMap.get(record.flowDate) ?? 0;
    const x = (dateIdx - totalDates / 2 + 0.5) * DATE_SPACING;
    const y = (currencyIdx - currencyCount / 2 + 0.5) * CURRENCY_SPACING;

    return { x, y };
  }, [selectedRecordId, filteredRecords, selectedCurrencies]);

  useFrame((state) => {
    if (!ringRef.current) return;
    const t = state.clock.elapsedTime * PULSE_SPEED;
    const scale = 1 + Math.sin(t) * 0.15;
    ringRef.current.scale.set(scale, scale, 1);

    const material = ringRef.current.material as THREE.MeshStandardMaterial;
    if (material) {
      material.emissiveIntensity = 1.5 + Math.sin(t) * 0.5;
    }
  });

  if (!selectedBar) return null;

  return (
    <mesh
      ref={ringRef}
      position={[selectedBar.x, selectedBar.y, 0.01]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <torusGeometry args={[RING_RADIUS, RING_TUBE, 16, 48]} />
      <meshStandardMaterial
        color="#ffd700"
        emissive={GOLD_EMISSIVE}
        emissiveIntensity={2}
        transparent
        opacity={0.9}
        toneMapped={false}
      />
    </mesh>
  );
}
