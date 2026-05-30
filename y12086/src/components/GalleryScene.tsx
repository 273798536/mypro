import { useRef, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, Line, Text } from '@react-three/drei';
import type { Mesh, Group } from 'three';
import * as THREE from 'three';
import { gallerySegments, valves, radiationZones, inspectionRoutes, ZONE_COLORS } from '@/data/mockData';
import { useGalleryStore } from '@/store/useGalleryStore';
import type { Valve, Issue } from '@/data/types';

function GallerySegmentMesh({ start, end, id }: { start: [number, number, number]; end: [number, number, number]; id: string }) {
  const dx = end[0] - start[0];
  const dz = end[2] - start[2];
  const length = Math.sqrt(dx * dx + dz * dz);
  const angle = Math.atan2(dz, dx);
  const midX = (start[0] + end[0]) / 2;
  const midZ = (start[2] + end[2]) / 2;

  return (
    <group position={[midX, 0, midZ]} rotation={[0, -angle, 0]}>
      <mesh>
        <boxGeometry args={[length, 2.5, 3]} />
        <meshStandardMaterial color="#3a4a5c" transparent opacity={0.25} side={THREE.DoubleSide} />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(length, 2.5, 3)]} />
        <lineBasicMaterial color="#5a7a9a" transparent opacity={0.5} />
      </lineSegments>
      <Text
        position={[0, 1.8, 0]}
        fontSize={0.6}
        color="#8aa4c0"
        anchorX="center"
        anchorY="middle"
        font={undefined}
      >
        {id}
      </Text>
    </group>
  );
}

function RadiationZoneMesh({ bounds, level, zoneName }: {
  bounds: { min: [number, number, number]; max: [number, number, number] };
  level: 'green' | 'yellow' | 'red';
  zoneName: string;
}) {
  const colors = ZONE_COLORS[level];
  const width = bounds.max[0] - bounds.min[0];
  const height = bounds.max[1] - bounds.min[1];
  const depth = bounds.max[2] - bounds.min[2];
  const cx = (bounds.min[0] + bounds.max[0]) / 2;
  const cy = (bounds.min[1] + bounds.max[1]) / 2;
  const cz = (bounds.min[2] + bounds.max[2]) / 2;

  return (
    <group position={[cx, cy, cz]}>
      <mesh>
        <boxGeometry args={[width, height, depth]} />
        <meshBasicMaterial color={colors.stroke} transparent opacity={0.06} side={THREE.BackSide} depthWrite={false} />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(width, height, depth)]} />
        <lineBasicMaterial color={colors.stroke} transparent opacity={0.35} />
      </lineSegments>
      <Text
        position={[0, height / 2 + 0.3, 0]}
        fontSize={0.5}
        color={colors.stroke}
        anchorX="center"
        anchorY="bottom"
        font={undefined}
      >
        {zoneName}
      </Text>
    </group>
  );
}

function ValveMarker({ valve, isDuplicate }: { valve: Valve; isDuplicate: boolean }) {
  const ref = useRef<Mesh>(null);
  const selectedValveId = useGalleryStore((s) => s.selectedValveId);
  const selectValve = useGalleryStore((s) => s.selectValve);
  const setFocusPosition = useGalleryStore((s) => s.setFocusPosition);
  const isSelected = selectedValveId === `${valve.valveId}@${valve.galleryId}`;

  useFrame((_, delta) => {
    if (ref.current && (isDuplicate || isSelected)) {
      ref.current.scale.setScalar(1 + Math.sin(Date.now() * 0.004) * 0.15);
    }
  });

  const handleClick = useCallback(() => {
    const key = `${valve.valveId}@${valve.galleryId}`;
    selectValve(isSelected ? null : key);
    setFocusPosition(valve.position);
  }, [valve, isSelected, selectValve, setFocusPosition]);

  const color = isDuplicate ? '#FF6B35' : isSelected ? '#00BFFF' : '#c0d0e0';
  const labelBg = isDuplicate ? 'rgba(255,107,53,0.9)' : isSelected ? 'rgba(0,191,255,0.9)' : 'rgba(26,42,74,0.85)';
  const borderColor = isDuplicate ? '#FF6B35' : isSelected ? '#00BFFF' : '#5a7a9a';

  return (
    <group position={valve.position}>
      <mesh ref={ref} onClick={handleClick} castShadow>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={isDuplicate ? 0.5 : isSelected ? 0.4 : 0.1} />
      </mesh>
      <Html position={[0, 1.0, 0]} center distanceFactor={15} style={{ pointerEvents: 'none' }}>
        <div style={{
          background: labelBg,
          border: `1.5px solid ${borderColor}`,
          borderRadius: 4,
          padding: '2px 8px',
          color: '#fff',
          fontSize: 11,
          fontFamily: "'Orbitron', 'Courier New', monospace",
          fontWeight: 700,
          whiteSpace: 'nowrap',
          letterSpacing: '0.5px',
          textShadow: '0 1px 2px rgba(0,0,0,0.5)',
        }}>
          {valve.valveId}
          <span style={{ fontSize: 9, opacity: 0.7, marginLeft: 4 }}>{valve.galleryId}</span>
          {isDuplicate && <span style={{ color: '#FFD700', marginLeft: 4, fontSize: 9 }}>重号</span>}
        </div>
      </Html>
    </group>
  );
}

function RoutePath({ routeId, valveSequence }: { routeId: string; valveSequence: string[] }) {
  const crossZoneIssues = useGalleryStore((s) => s.crossZoneIssues);
  const hasCrossZone = crossZoneIssues.some((i) => i.routeId === routeId);
  const routeColor = hasCrossZone ? '#FFD700' : '#2ECC71';

  const points = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (const vId of valveSequence) {
      const matches = valves.filter((v) => v.valveId === vId);
      if (matches.length > 0) {
        pts.push(matches[0].position);
      }
    }
    return pts;
  }, [valveSequence]);

  if (points.length < 2) return null;

  return (
    <group>
      <Line
        points={points}
        color={routeColor}
        lineWidth={2.5}
        dashed
        dashSize={1}
        gapSize={0.5}
      />
      <Text
        position={[(points[0][0] + points[1][0]) / 2, 2.2, (points[0][2] + points[1][2]) / 2]}
        fontSize={0.45}
        color={routeColor}
        anchorX="center"
        font={undefined}
      >
        {routeId}
        {hasCrossZone ? ' ⚠穿禁区' : ''}
      </Text>
      {points.map((p, i) => (
        <mesh key={i} position={[p[0], 0, p[2]]}>
          <circleGeometry args={[0.2, 16]} />
          <meshBasicMaterial color={routeColor} transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

function CameraController() {
  const focusPosition = useGalleryStore((s) => s.focusPosition);
  const { camera } = useThree();
  const targetRef = useRef(new THREE.Vector3(30, 5, 12));
  const lerpSpeed = 0.03;

  useFrame(() => {
    if (focusPosition) {
      const target = new THREE.Vector3(focusPosition[0], focusPosition[1] + 3, focusPosition[2] + 8);
      targetRef.current.lerp(target, lerpSpeed);
      camera.position.lerp(targetRef.current, lerpSpeed);
      const lookAt = new THREE.Vector3(focusPosition[0], focusPosition[1], focusPosition[2]);
      camera.lookAt(lookAt);
    }
  });

  return null;
}

function SceneContent() {
  const duplicateIssues = useGalleryStore((s) => s.duplicateIssues);
  const duplicateValveIds = useMemo(() => new Set(duplicateIssues.map((d) => d.valveId)), [duplicateIssues]);

  const valveKeySet = useMemo(() => {
    const seen = new Map<string, number>();
    return valves.map((v) => {
      const count = (seen.get(v.valveId) || 0) + 1;
      seen.set(v.valveId, count);
      return { key: `${v.valveId}@${v.galleryId}#${count}`, valve: v };
    });
  }, []);

  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[30, 20, 10]} intensity={0.7} color="#d0e0ff" />
      <pointLight position={[10, 5, 0]} intensity={0.4} color="#ffcc88" distance={30} />
      <pointLight position={[40, 5, 0]} intensity={0.3} color="#ff8866" distance={25} />
      <pointLight position={[30, 5, -8]} intensity={0.3} color="#88ccff" distance={30} />

      <gridHelper args={[80, 40, '#1a2a3a', '#141e2e']} position={[30, -1.3, -4]} />

      {gallerySegments.map((seg) => (
        <GallerySegmentMesh key={seg.id} start={seg.start} end={seg.end} id={seg.id} />
      ))}

      {radiationZones.map((zone) => (
        <RadiationZoneMesh key={zone.zoneId} bounds={zone.bounds} level={zone.level} zoneName={zone.zoneName} />
      ))}

      {valveKeySet.map(({ key, valve }) => (
        <ValveMarker key={key} valve={valve} isDuplicate={duplicateValveIds.has(valve.valveId)} />
      ))}

      {inspectionRoutes.map((route) => (
        <RoutePath key={route.routeId} routeId={route.routeId} valveSequence={route.valveSequence} />
      ))}

      <CameraController />
      <OrbitControls makeDefault enableDamping dampingFactor={0.1} minDistance={5} maxDistance={80} />
    </>
  );
}

export default function GalleryScene() {
  return (
    <Canvas
      camera={{ position: [30, 12, 20], fov: 50, near: 0.1, far: 200 }}
      style={{ background: '#0a1420' }}
      gl={{ antialias: true, alpha: false }}
    >
      <SceneContent />
    </Canvas>
  );
}
