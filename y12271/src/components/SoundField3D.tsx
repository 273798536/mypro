import { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, Box } from '@react-three/drei';
import { useHallStore } from '@/stores/useHallStore';
import { useAnomalyStore } from '@/stores/useAnomalyStore';

function HallShellWireframe(props: { width: number; height: number; depth: number }) {
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (!groupRef.current) return;
    const geo = new THREE.BoxGeometry(props.width, props.height, props.depth);
    const edges = new THREE.EdgesGeometry(geo);
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: '#334155' }));
    line.position.set(0, props.height / 2, 0);
    groupRef.current.add(line);
    return () => {
      groupRef.current?.remove(line);
      geo.dispose();
      edges.dispose();
    };
  }, [props.width, props.height, props.depth]);

  return <group ref={groupRef} />;
}

function HallShell() {
  const hall = useHallStore((s) => s.hall);
  const d = hall.depth / 2;
  const h = hall.height;

  return (
    <group>
      <Box args={[hall.width, 0.1, hall.depth]} position={[0, 0, 0]}>
        <meshStandardMaterial color="#1a1a2e" transparent opacity={0.4} />
      </Box>
      <HallShellWireframe width={hall.width} height={h} depth={hall.depth} />
      <Box args={[hall.width, h, hall.depth]} position={[0, h / 2, 0]}>
        <meshStandardMaterial color="#0f172a" transparent opacity={0.08} side={THREE.DoubleSide} />
      </Box>
      <Text position={[0, -0.5, -d - 1]} fontSize={1.5} color="#475569" anchorX="center">
        舞台
      </Text>
    </group>
  );
}

function SeatMarkers() {
  const seats = useHallStore((s) => s.seats);
  const getReverbColor = useHallStore((s) => s.getReverbColor);
  const selectedSeatId = useHallStore((s) => s.selectedSeatId);

  return (
    <group>
      {seats.map((seat) => {
        const color = getReverbColor(seat.reverbTime);
        const hasIssue = seat.missingParams || seat.isOccluded || seat.frequencyBandError;
        return (
          <mesh
            key={seat.id}
            position={[seat.x, seat.y + 0.3, seat.z]}
          >
            <boxGeometry args={[0.35, 0.35, 0.35]} />
            <meshStandardMaterial
              color={hasIssue ? '#1a1a2e' : color}
              emissive={hasIssue ? '#EF4444' : color}
              emissiveIntensity={hasIssue ? 0.3 : 0.15}
              transparent
              opacity={seat.id === selectedSeatId ? 1 : hasIssue ? 0.6 : 0.75}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function SoundSourceMarkers() {
  const soundSources = useHallStore((s) => s.soundSources);

  return (
    <group>
      {soundSources.map((src) => (
        <group key={src.id} position={[src.x, src.y + 1, src.z]}>
          <mesh>
            <sphereGeometry args={[0.4, 16, 16]} />
            <meshStandardMaterial color="#F59E0B" emissive="#F59E0B" emissiveIntensity={0.5} />
          </mesh>
          <Text position={[0, 0.7, 0]} fontSize={0.3} color="#F59E0B" anchorX="center">
            {`S ${src.id.split('-')[1]}`}
          </Text>
        </group>
      ))}
    </group>
  );
}

function DataGapWarning() {
  const surfaces = useHallStore((s) => s.surfaces);
  const seats = useHallStore((s) => s.seats);
  const integrity = useAnomalyStore((s) => s.getDataIntegrityLevel());
  const hasGaps = surfaces.some((s) => !s.paramsComplete) || seats.some((s) => s.missingParams);

  if (!hasGaps) return null;

  const gapSurfaces = surfaces.filter((s) => !s.paramsComplete);

  return (
    <group>
      {integrity === 'critical' && (
        <mesh position={[0, 8, 10]} rotation={[0, 0, 0]}>
          <planeGeometry args={[18, 2]} />
          <meshBasicMaterial color="#EF4444" transparent opacity={0.15} side={THREE.DoubleSide} />
        </mesh>
      )}
      {gapSurfaces.map((surf, i) => {
        let pos: [number, number, number] = [0, 7.5, 0];
        let rot: [number, number, number] = [0, 0, 0];
        if (surf.id.includes('ceiling')) pos = [0, 14.5, 0];
        else if (surf.id.includes('left')) { pos = [-14.5, 7.5, 0]; rot = [0, Math.PI / 2, 0]; }
        else if (surf.id.includes('right')) { pos = [14.5, 7.5, 0]; rot = [0, -Math.PI / 2, 0]; }
        else if (surf.id.includes('rear')) { pos = [0, 7.5, -19.5]; rot = [0, Math.PI, 0]; }
        else if (surf.id.includes('balcony')) { pos = [0, 5, 16]; }
        else { pos = [0, 7.5, 5 + i * 3]; }

        return (
          <group key={surf.id} position={pos} rotation={rot}>
            <mesh>
              <planeGeometry args={[8, 4]} />
              <meshBasicMaterial color="#EF4444" transparent opacity={0.12} side={THREE.DoubleSide} />
            </mesh>
            <Text
              position={[0, 0, 0.1]}
              fontSize={0.5}
              color="#EF4444"
              anchorX="center"
              anchorY="middle"
              maxWidth={7}
            >
              {`⚠ 数据不完整\n${surf.name} · ${surf.materialType}`}
            </Text>
          </group>
        );
      })}
    </group>
  );
}

interface SoundField3DProps {
  snapshotSources?: { id: string; x: number; y: number; z: number; powerLevel: number }[];
  label?: string;
}

export default function SoundField3D({ label }: SoundField3DProps) {
  const integrity = useAnomalyStore((s) => s.getDataIntegrityLevel());

  const bannerColor = useMemo(() => {
    if (integrity === 'critical') return 'bg-red-600/80';
    if (integrity === 'warning') return 'bg-amber-600/80';
    return '';
  }, [integrity]);

  const bannerText = useMemo(() => {
    if (integrity === 'critical') return '⚠ 数据缺口严重，3D声场仅供参考，不可用于评审';
    if (integrity === 'warning') return '⚠ 存在数据缺口，部分区域声场不可靠';
    return '';
  }, [integrity]);

  return (
    <div className="relative w-full h-full bg-[#0A1628] rounded-lg overflow-hidden">
      {label && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 bg-black/60 px-3 py-1 rounded text-xs text-gray-300 font-mono">
          {label}
        </div>
      )}
      {bannerText && (
        <div className={`absolute top-2 left-3 right-3 z-10 ${bannerColor} px-3 py-1.5 rounded text-xs text-white font-mono text-center animate-pulse`}>
          {bannerText}
        </div>
      )}
      <Canvas camera={{ position: [25, 20, 30], fov: 50 }} gl={{ antialias: true }}>
        <ambientLight intensity={0.3} />
        <directionalLight position={[10, 20, 5]} intensity={0.6} />
        <pointLight position={[0, 12, 3]} intensity={0.4} color="#F59E0B" />
        <HallShell />
        <SeatMarkers />
        <SoundSourceMarkers />
        <DataGapWarning />
        <OrbitControls
          enableDamping
          dampingFactor={0.1}
          minDistance={10}
          maxDistance={60}
          target={[0, 5, 10]}
        />
        <gridHelper args={[40, 40, '#1e293b', '#1e293b']} position={[0, 0.01, 0]} />
      </Canvas>
      <div className="absolute bottom-3 right-3 bg-black/70 border border-gray-700 rounded-lg px-3 py-2 text-[10px] text-gray-400 z-20">
        <div>鼠标拖拽旋转 · 滚轮缩放</div>
      </div>
    </div>
  );
}
