import { useState, useRef } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useSceneStore } from '@/stores/useSceneStore';

const statusColorMap: Record<string, string> = {
  normal: '#00ff88',
  warning: '#ffaa00',
  error: '#ff3355',
};

export function DeviceMarkers() {
  const devices = useSceneStore((s) => s.devices);
  const selectDevice = useSceneStore((s) => s.selectDevice);
  const selectedDeviceId = useSceneStore((s) => s.selectedDeviceId);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const pulseRef = useRef<any>(null);

  return (
    <group>
      {devices.map((dev) => {
        const color = statusColorMap[dev.status];
        const isSelected = selectedDeviceId === dev.id;
        const isHovered = hoveredId === dev.id;
        const scale = isSelected ? 1.4 : isHovered ? 1.2 : 1.0;

        return (
          <group
            key={dev.id}
            position={dev.position}
            onClick={(e) => {
              e.stopPropagation();
              selectDevice(isSelected ? null : dev.id);
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHoveredId(dev.id);
              document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
              setHoveredId(null);
              document.body.style.cursor = 'auto';
            }}
          >
            {/* 底座 */}
            <mesh position={[0, -0.15, 0]}>
              <cylinderGeometry args={[0.2, 0.25, 0.08, 16]} />
              <meshStandardMaterial color="#1a1a2e" metalness={0.6} roughness={0.3} />
            </mesh>

            {/* 指示球 */}
            <mesh scale={scale}>
              <sphereGeometry args={[0.22, 24, 24]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={isSelected ? 0.8 : isHovered ? 0.5 : 0.3}
                metalness={0.2}
                roughness={0.3}
              />
            </mesh>

            {/* 脉冲光环 */}
            {(isSelected || isHovered) && dev.status !== 'normal' && (
              <mesh>
                <ringGeometry args={[0.28, 0.32, 32]} />
                <meshBasicMaterial
                  color={color}
                  transparent
                  opacity={0.6}
                  side={THREE.DoubleSide}
                />
              </mesh>
            )}

            {/* 连接线到标签 */}
            {isHovered && (
              <line>
                <bufferGeometry>
                  <bufferAttribute
                    attach="attributes-position"
                    count={2}
                    array={new Float32Array([0, 0.3, 0, 0, 0.9, 0])}
                    itemSize={3}
                  />
                </bufferGeometry>
                <lineBasicMaterial color={color} transparent opacity={0.6} />
              </line>
            )}

            {/* HTML Tooltip */}
            {isHovered && (
              <Html position={[0, 1.1, 0]} center distanceFactor={10}>
                <div
                  className="pointer-events-none whitespace-nowrap rounded-md border px-3 py-2 text-xs shadow-xl backdrop-blur-md"
                  style={{
                    borderColor: color + '66',
                    background: 'rgba(10, 22, 40, 0.92)',
                    color: '#e2e8f0',
                    boxShadow: `0 0 20px ${color}33`,
                  }}
                >
                  <div className="font-bold" style={{ color }}>
                    {dev.name}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">
                    坐标: [{dev.position.map((n) => n.toFixed(1)).join(', ')}]
                  </div>
                  {dev.value !== undefined && (
                    <div className="mt-0.5 text-[11px]">
                      <span className="text-slate-400">读数: </span>
                      <span className="font-mono font-bold text-cyan-300">
                        {dev.value}
                        {dev.unit}
                      </span>
                    </div>
                  )}
                  <div className="mt-0.5 text-[11px]">
                    状态:{' '}
                    <span style={{ color }}>
                      {dev.status === 'normal'
                        ? '正常'
                        : dev.status === 'warning'
                          ? '警告'
                          : '故障'}
                    </span>
                  </div>
                </div>
              </Html>
            )}

            {/* 异常状态的脉冲动画 */}
            {dev.status === 'error' && (
              <mesh>
                <sphereGeometry args={[0.35, 16, 16]} />
                <meshBasicMaterial
                  color={color}
                  transparent
                  opacity={0.25 + Math.sin(Date.now() * 0.005) * 0.15}
                />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}
