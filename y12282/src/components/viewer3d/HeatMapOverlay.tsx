import { useMemo, useState } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { HeatMapPoint } from '../../types';

interface HeatMapOverlayProps {
  points: HeatMapPoint[];
}

export function HeatMapOverlay({ points }: HeatMapOverlayProps) {
  const groupedPoints = useMemo(() => {
    const groups: { [key: string]: HeatMapPoint[] } = {};
    points.forEach((p) => {
      if (!groups[p.label]) {
        groups[p.label] = [];
      }
      groups[p.label].push(p);
    });
    return groups;
  }, [points]);

  const centerPoints = useMemo(() => {
    return Object.entries(groupedPoints).map(([label, pts]) => {
      const avgPos = pts.reduce(
        (acc, p) => ({
          x: acc.x + p.position.x / pts.length,
          y: acc.y + p.position.y / pts.length,
          z: acc.z + p.position.z / pts.length,
        }),
        { x: 0, y: 0, z: 0 }
      );
      const avgRisk = pts.reduce((acc, p) => acc + p.riskValue / pts.length, 0);
      return { label, position: avgPos, riskValue: avgRisk, points: pts };
    });
  }, [groupedPoints]);

  return (
    <group>
      {centerPoints.map((zone, idx) => (
        <RiskZone key={idx} zone={zone} />
      ))}
      {points.map((point, idx) => (
        <HeatPoint key={idx} point={point} />
      ))}
    </group>
  );
}

interface RiskZoneProps {
  zone: {
    label: string;
    position: { x: number; y: number; z: number };
    riskValue: number;
    points: HeatMapPoint[];
  };
}

function RiskZone({ zone }: RiskZoneProps) {
  const [hovered, setHovered] = useState(false);

  const color = getRiskColor(zone.riskValue);
  const radius = 8 + zone.riskValue * 5;

  return (
    <group position={[zone.position.x, zone.position.y, zone.position.z]}>
      <mesh
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <ringGeometry args={[radius - 1, radius, 64]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={hovered ? 0.8 : 0.4}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh>
        <circleGeometry args={[radius - 1, 64]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={hovered ? 0.3 : 0.15}
          side={THREE.DoubleSide}
        />
      </mesh>
      <Html position={[0, 2, 0]} center distanceFactor={15}>
        <div
          className={`
            px-3 py-1.5 rounded-full text-xs font-bold
            ${hovered ? 'scale-110' : ''}
            transition-all duration-200
          `}
          style={{
            backgroundColor: `#${color.toString(16).padStart(6, '0')}`,
            color: zone.riskValue > 0.6 ? '#fff' : '#000',
          }}
        >
          {zone.label} - {(zone.riskValue * 100).toFixed(0)}%
        </div>
      </Html>
    </group>
  );
}

interface HeatPointProps {
  point: HeatMapPoint;
}

function HeatPoint({ point }: HeatPointProps) {
  const color = getRiskColor(point.riskValue);

  return (
    <mesh position={[point.position.x, point.position.y, point.position.z]}>
      <sphereGeometry args={[0.3 + point.riskValue * 0.5, 16, 16]} />
      <meshBasicMaterial color={color} transparent opacity={0.7} />
    </mesh>
  );
}

function getRiskColor(riskValue: number): number {
  if (riskValue < 0.3) return 0x48bb78;
  if (riskValue < 0.5) return 0xecc94b;
  if (riskValue < 0.7) return 0xed8936;
  if (riskValue < 0.85) return 0xe53e3e;
  return 0xc53030;
}

export function RiskLegend() {
  const legendItems = [
    { label: '安全 (<30%)', color: 0x48bb78 },
    { label: '注意 (30-50%)', color: 0xecc94b },
    { label: '警告 (50-70%)', color: 0xed8936 },
    { label: '高风险 (70-85%)', color: 0xe53e3e },
    { label: '危险 (>85%)', color: 0xc53030 },
  ];

  return (
    <div className="absolute bottom-4 left-4 bg-gray-900/90 backdrop-blur-sm rounded-lg p-3 text-white text-xs">
      <div className="font-bold mb-2 text-sm">风险等级</div>
      <div className="space-y-1.5">
        {legendItems.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: `#${item.color.toString(16).padStart(6, '0')}` }}
            />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
