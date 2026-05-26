import { useRef, useMemo, useEffect, useCallback } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { useCashFlowStore } from '../../hooks/useCashFlowStore';
import { RISK_COLORS } from '../../types';
import { amountToHeight } from '../../utils/colorMapper';

const CURRENCY_SPACING = 3;
const DATE_SPACING = 0.8;
const BAR_WIDTH = 0.7;
const BAR_DEPTH = 0.6;

interface BarData {
  id: string;
  recordId: string;
  x: number;
  y: number;
  targetHeight: number;
  currentHeight: number;
  isNegative: boolean;
  color: THREE.Color;
  selectedColor: THREE.Color;
  baseColor: THREE.Color;
  progress: number;
}

const NEGATIVE_COLOR = new THREE.Color('#6366f1');
const SELECTED_COLOR = new THREE.Color('#ffd700');
const dummy = new THREE.Object3D();

export default function TerrainBars() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const filteredRecords = useCashFlowStore((s) => s.filteredRecords);
  const selectedRecordId = useCashFlowStore((s) => s.selectedRecordId);
  const selectRecord = useCashFlowStore((s) => s.selectRecord);
  const filters = useCashFlowStore((s) => s.filters);

  const selectedCurrencies = useMemo(
    () => filters.selectedCurrencies.length > 0
      ? filters.selectedCurrencies
      : ['USD', 'EUR', 'GBP', 'JPY', 'CNY'],
    [filters.selectedCurrencies]
  );

  const maxAbsAmount = useMemo(() => {
    if (filteredRecords.length === 0) return 1;
    return Math.max(...filteredRecords.map((r) => Math.abs(r.amount)));
  }, [filteredRecords]);

  const bars = useMemo<BarData[]>(() => {
    const sortedDates = [...new Set(filteredRecords.map((r) => r.flowDate))].sort();
    const dateIndexMap = new Map(sortedDates.map((d, i) => [d, i]));
    const currencyCount = selectedCurrencies.length;
    const totalDates = sortedDates.length;

    return filteredRecords.map((record) => {
      const currencyIdx = selectedCurrencies.indexOf(record.currency);
      const dateIdx = dateIndexMap.get(record.flowDate) ?? 0;
      const x = (dateIdx - totalDates / 2 + 0.5) * DATE_SPACING;
      const y = (currencyIdx - currencyCount / 2 + 0.5) * CURRENCY_SPACING;
      const height = amountToHeight(record.amount, maxAbsAmount);
      const isNegative = record.amount < 0;

      let colorHex: string;
      if (isNegative) {
        colorHex = '#6366f1';
      } else {
        colorHex = RISK_COLORS[record.riskLevel] ?? '#888888';
      }

      return {
        id: record.id,
        recordId: record.id,
        x,
        y,
        targetHeight: Math.max(height, 0.1),
        currentHeight: 0.001,
        isNegative,
        color: new THREE.Color(colorHex),
        selectedColor: SELECTED_COLOR.clone(),
        baseColor: new THREE.Color(colorHex),
        progress: 0,
      };
    });
  }, [filteredRecords, selectedCurrencies, maxAbsAmount]);

  const barsRef = useRef<BarData[]>(bars);
  const recordIdToIndex = useMemo(() => {
    const map = new Map<string, number>();
    bars.forEach((b, i) => map.set(b.recordId, i));
    return map;
  }, [bars]);

  useEffect(() => {
    barsRef.current = bars;
  }, [bars]);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const currentBars = barsRef.current;
    let needsUpdate = false;

    for (let i = 0; i < currentBars.length; i++) {
      const bar = currentBars[i];

      if (bar.progress < 1) {
        bar.progress = Math.min(1, bar.progress + delta * 4);
        const eased = 1 - Math.pow(1 - bar.progress, 3);
        bar.currentHeight = bar.targetHeight * eased;
        needsUpdate = true;
      }

      const isSelected = selectedRecordId === bar.recordId;
      const displayColor = isSelected ? bar.selectedColor : bar.baseColor;

      if (!bar.color.equals(displayColor)) {
        bar.color.copy(displayColor);
        mesh.setColorAt(i, bar.color);
        needsUpdate = true;
      }

      const height = bar.currentHeight;
      const zOffset = bar.isNegative ? -height / 2 : height / 2;

      dummy.position.set(bar.x, bar.y, zOffset);
      dummy.scale.set(BAR_WIDTH, BAR_DEPTH, height);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }

    if (needsUpdate) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  });

  const handleClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      event.stopPropagation();
      const instanceId = event.instanceId;
      if (instanceId === undefined) return;
      const bar = barsRef.current[instanceId];
      if (bar) {
        selectRecord(selectedRecordId === bar.recordId ? null : bar.recordId);
      }
    },
    [selectedRecordId, selectRecord]
  );

  if (bars.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, bars.length]}
      onClick={handleClick}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        roughness={0.4}
        metalness={0.1}
        transparent
        opacity={0.95}
      />
    </instancedMesh>
  );
}
