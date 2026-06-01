import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import { temperatureData } from '../../data/mockData';
import { useStore } from '../../store/useStore';

function interpolateColor(temp: number): string {
  const minTemp = -25;
  const maxTemp = -10;
  const normalized = Math.max(0, Math.min(1, (temp - minTemp) / (maxTemp - minTemp)));

  const colors = [
    { pos: 0, r: 0, g: 50, b: 150 },
    { pos: 0.25, r: 0, g: 150, b: 200 },
    { pos: 0.5, r: 50, g: 200, b: 150 },
    { pos: 0.75, r: 255, g: 200, b: 50 },
    { pos: 1, r: 255, g: 80, b: 50 },
  ];

  let lower = colors[0];
  let upper = colors[colors.length - 1];
  for (let i = 0; i < colors.length - 1; i++) {
    if (normalized >= colors[i].pos && normalized <= colors[i + 1].pos) {
      lower = colors[i];
      upper = colors[i + 1];
      break;
    }
  }

  const range = upper.pos - lower.pos;
  const weight = range === 0 ? 0 : (normalized - lower.pos) / range;

  const r = Math.round(lower.r + (upper.r - lower.r) * weight);
  const g = Math.round(lower.g + (upper.g - lower.g) * weight);
  const b = Math.round(lower.b + (upper.b - lower.b) * weight);

  return `rgb(${r}, ${g}, ${b})`;
}

export function HeatMap() {
  const currentTimeIndex = useStore((state) => state.currentTimeIndex);
  const showHeatMap = useStore((state) => state.showHeatMap);

  const currentData = useMemo(() => {
    const index = Math.min(currentTimeIndex, temperatureData.length - 1);
    return temperatureData[index];
  }, [currentTimeIndex]);

  if (!showHeatMap || !currentData) return null;

  return (
    <group>
      {currentData.grid.map((point, idx) => {
        const color = interpolateColor(point.temp);
        return (
          <group key={idx} position={[point.x, point.y + 0.05, point.z]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[1.8, 1.3]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={0.35}
                side={2}
              />
            </mesh>
            <Html position={[0, 0.02, 0]} center distanceFactor={12}>
              <div
                className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold whitespace-nowrap"
                style={{
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  color,
                  textShadow: '0 0 4px rgba(0,0,0,0.8)',
                }}
              >
                {point.temp.toFixed(1)}°C
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}
