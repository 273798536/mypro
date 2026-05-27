import { useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { groupByTimeWindow, computePriceRange, basisToColor } from '../../utils/geometry';
import { getBackwardationDataIds } from '../../utils/backwardation';
import * as THREE from 'three';
import { Line, Text, OrbitControls } from '@react-three/drei';

interface Point3D {
  position: [number, number, number];
  data: any;
}

export default function TunnelScene() {
  const { data, filters, selectedDataId, hoveredDataId, setHoveredDataId, setSelectedDataId, timeWindowIndex } = useStore();

  const groups = useMemo(() => groupByTimeWindow(data), [data]);
  const priceRange = useMemo(() => computePriceRange(data), [data]);

  const backwardationIds = useMemo(() => {
    const detections = useStore.getState().detections;
    return getBackwardationDataIds(detections);
  }, [data]);

  const maxAbsBasis = useMemo(() => {
    if (data.length === 0) return 1;
    return Math.max(...data.map((d) => Math.abs(d.basis)));
  }, [data]);

  const currentTimeWindow = groups[timeWindowIndex]?.timeWindow;

  const maxGroupLen = Math.max(...groups.map((g) => g.contracts.length));
  const [minP, maxP] = priceRange;

  const getPoint = (contract: any, xIdx: number, zIdx: number): [number, number, number] => {
    const x = (xIdx / Math.max(maxGroupLen - 1, 1)) * 80 - 40;
    const y = ((contract.price - minP) / (maxP - minP || 1)) * 60 - 30;
    const z = (zIdx / Math.max(groups.length - 1, 1)) * 80 - 40;
    return [x, y, z];
  };

  return (
    <>
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        enablePan={false}
        minDistance={30}
        maxDistance={200}
        maxPolarAngle={Math.PI * 0.48}
        minPolarAngle={Math.PI * 0.05}
      />

      <ambientLight intensity={0.4} />
      <directionalLight position={[50, 80, 30]} intensity={0.8} color="#ffffff" />
      <directionalLight position={[-30, 40, -50]} intensity={0.3} color="#3B82F6" />

      <gridHelper args={[120, 24, '#1e3a5f', '#0f2744']} position={[0, -32, 0]} />

      <AxesLines />

      <XAxisLabels groups={groups} maxGroupLen={maxGroupLen} />
      <YAxisLabels priceRange={priceRange} />
      <ZAxisLabels groups={groups} />

      {groups.map((group, zIdx) => {
        const points: [number, number, number][] = [];
        const pointData: Point3D[] = [];

        group.contracts.forEach((contract, xIdx) => {
          const pos = getPoint(contract, xIdx, zIdx);
          points.push(pos);
          pointData.push({ position: pos, data: contract });
        });

        if (points.length < 2) return null;

        const isCurrentTimeWindow = group.timeWindow === currentTimeWindow;
        const hasSelected = pointData.some((p) => p.data.id === selectedDataId);
        const hasHovered = pointData.some((p) => p.data.id === hoveredDataId);

        const baseColor = hasSelected ? '#3B82F6' : isCurrentTimeWindow || hasHovered ? '#ffffff' : '#64748b';
        const opacity = hasHovered || hasSelected ? 0.9 : isCurrentTimeWindow ? 0.6 : 0.25;

        return (
          <group key={group.timeWindow}>
            <Line
              points={points}
              color={baseColor}
              lineWidth={isCurrentTimeWindow ? 3 : 1.5}
              transparent
              opacity={opacity}
            />

            {pointData.map(({ position, data }) => {
              const isBackwardation = filters.showBackwardation && backwardationIds.has(data.id);
              const isSelected = data.id === selectedDataId;
              const isHovered = data.id === hoveredDataId;

              let color: string;
              if (isBackwardation) {
                color = '#FF4757';
              } else if (isSelected) {
                color = '#3B82F6';
              } else if (isHovered) {
                color = '#ffffff';
              } else {
                const c = basisToColor(data.basis, maxAbsBasis);
                color = `#${c.getHexString()}`;
              }

              const volumeScale = filters.volumeHeatmap
                ? 0.5 + (data.volume / 6000) * 1.5
                : 0.6;

              return (
                <mesh
                  key={data.id}
                  position={position}
                  onPointerOver={(e) => {
                    e.stopPropagation();
                    setHoveredDataId(data.id);
                  }}
                  onPointerOut={() => setHoveredDataId(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedDataId(data.id === selectedDataId ? null : data.id);
                  }}
                >
                  <sphereGeometry args={[volumeScale, 12, 12]} />
                  <meshStandardMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={isSelected || isHovered ? 0.8 : isBackwardation ? 0.5 : 0.2}
                    transparent
                    opacity={isSelected || isHovered ? 1 : isCurrentTimeWindow ? 0.85 : 0.5}
                  />
                </mesh>
              );
            })}
          </group>
        );
      })}
    </>
  );
}

function AxesLines() {
  return (
    <group>
      <Line points={[[-42, -32, -42], [42, -32, -42]]} color="#2d4a6f" lineWidth={1} />
      <Line points={[[-42, -32, -42], [-42, 32, -42]]} color="#2d4a6f" lineWidth={1} />
      <Line points={[[-42, -32, -42], [-42, -32, 42]]} color="#2d4a6f" lineWidth={1} />
    </group>
  );
}

function XAxisLabels({ groups, maxGroupLen }: { groups: any[]; maxGroupLen: number }) {
  const labels: { text: string; x: number }[] = [];
  for (let i = 0; i < maxGroupLen; i++) {
    const contract = groups.find((g) => g.contracts.length > i)?.contracts[i];
    if (contract) {
      labels.push({
        text: contract.contractMonth,
        x: (i / Math.max(maxGroupLen - 1, 1)) * 80 - 40,
      });
    }
  }

  return (
    <>
      {labels.map((label, i) => (
        <Text
          key={`x-${i}`}
          position={[label.x, -35, -42]}
          fontSize={1.8}
          color="#718096"
          anchorX="center"
          anchorY="middle"
        >
          {label.text}
        </Text>
      ))}
    </>
  );
}

function YAxisLabels({ priceRange }: { priceRange: [number, number] }) {
  const [minP, maxP] = priceRange;
  const labels: { text: string; y: number }[] = [];
  for (let i = 0; i <= 5; i++) {
    const price = minP + ((maxP - minP) * i) / 5;
    labels.push({
      text: price.toFixed(0),
      y: (i / 5) * 60 - 30,
    });
  }

  return (
    <>
      {labels.map((label, i) => (
        <Text
          key={`y-${i}`}
          position={[-47, label.y, -42]}
          fontSize={1.8}
          color="#718096"
          anchorX="center"
          anchorY="middle"
        >
          {label.text}
        </Text>
      ))}
    </>
  );
}

function ZAxisLabels({ groups }: { groups: any[] }) {
  return (
    <>
      {groups.map((group, i) => (
        <Text
          key={`z-${i}`}
          position={[-47, -35, (i / Math.max(groups.length - 1, 1)) * 80 - 40]}
          fontSize={1.6}
          color="#718096"
          anchorX="center"
          anchorY="middle"
        >
          {group.timeWindow.slice(5)}
        </Text>
      ))}
    </>
  );
}