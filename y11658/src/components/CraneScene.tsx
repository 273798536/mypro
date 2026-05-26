import { Canvas } from "@react-three/fiber";
import { OrbitControls, OrthographicCamera, Grid } from "@react-three/drei";
import { useMemo } from "react";
import type { Coil, Rail, Task, Vec3, Zone } from "@/types";
import { useGameStore } from "@/store/gameStore";

function CoilMesh({ coil, position, rotDeg }: { coil: Coil; position: Vec3; rotDeg: number }) {
  const diameter = Math.max(0.4, coil.diameter * 0.5);
  const length = Math.max(0.4, coil.length * 0.5);
  return (
    <group position={[position.x, position.y, position.z]} rotation={[0, (rotDeg * Math.PI) / 180, 0]}>
      <mesh castShadow={false}>
        <cylinderGeometry args={[diameter, diameter, length, 24, 1, true]} />
        <meshStandardMaterial color="#7a7f8a" metalness={0.8} roughness={0.3} side={2} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[diameter * 0.2, diameter * 0.2, length * 1.02, 16]} />
        <meshStandardMaterial color="#2a2d33" metalness={0.5} roughness={0.6} />
      </mesh>
    </group>
  );
}

function RailLine({ rail }: { rail: Rail }) {
  const points = useMemo(
    () => rail.points.map((p) => [p.x, 0.1, p.z] as [number, number, number]),
    [rail.points],
  );
  return (
    <group>
      {points.map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]}>
          <boxGeometry args={[0.6, 0.15, 0.3]} />
          <meshStandardMaterial color="#38bdf8" emissive="#0ea5e9" emissiveIntensity={0.3} />
        </mesh>
      ))}
    </group>
  );
}

function ZonePolygon({ zone }: { zone: Zone }) {
  const color =
    zone.type === "danger"
      ? "#ef4444"
      : zone.type === "restricted"
        ? "#f59e0b"
        : "#10b981";
  const xs = zone.polygon.map((p) => p.x);
  const zs = zone.polygon.map((p) => p.z);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);
  const cx = (minX + maxX) / 2;
  const cz = (minZ + maxZ) / 2;
  const w = Math.max(0.1, maxX - minX);
  const h = Math.max(0.1, maxZ - minZ);
  return (
    <mesh position={[cx, 0.05, cz]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial color={color} transparent opacity={0.18} />
    </mesh>
  );
}

function CogMarker({ position, offset, limit }: { position: Vec3; offset: number; limit: number }) {
  const over = offset > limit;
  const color = over ? "#ef4444" : offset > limit * 0.6 ? "#f59e0b" : "#10b981";
  return (
    <group position={[position.x, position.y + 1.2, position.z]}>
      <mesh>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh position={[0, -0.4, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.8, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
}

function StartEnd({ start, end }: { start: Vec3; end: Vec3 }) {
  return (
    <group>
      <mesh position={[start.x, 0.15, start.z]}>
        <cylinderGeometry args={[0.3, 0.3, 0.3, 16]} />
        <meshStandardMaterial color="#10b981" emissive="#059669" emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[end.x, 0.15, end.z]}>
        <cylinderGeometry args={[0.3, 0.3, 0.3, 16]} />
        <meshStandardMaterial color="#3b82f6" emissive="#2563eb" emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}

export default function CraneScene({
  task,
  coil,
  rail,
  zones,
  view,
}: {
  task: Task;
  coil: Coil;
  rail: Rail;
  zones: Zone[];
  view: "side" | "top";
}) {
  const position = useGameStore((s) => s.position);
  const offset = useGameStore((s) => {
    const last = s.events[s.events.length - 1];
    return last?.cogOffset ?? 0;
  });
  const pos: Vec3 = { x: position.x, y: position.y, z: position.z };

  const cameraPos: [number, number, number] =
    view === "top" ? [0, 25, 0.01] : [14, 8, 14];

  return (
    <Canvas shadows={false} dpr={[1, 1.5]}>
      <color attach="background" args={["#0b1020"]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 5]} intensity={0.8} color="#fef3c7" />
      <hemisphereLight args={["#94a3b8", "#0f172a", 0.4]} />
      <Grid
        args={[30, 30]}
        position={[0, 0, 0]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#1e293b"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#334155"
        fadeDistance={40}
        fadeStrength={1}
        infiniteGrid
      />
      <OrbitControls
        enablePan
        enableZoom
        enableRotate={view === "side"}
        target={[0, 1, 0]}
      />
      <OrthographicCamera makeDefault position={cameraPos} zoom={40} near={0.1} far={200} />
      <RailLine rail={rail} />
      {zones.map((z) => (
        <ZonePolygon key={z.id} zone={z} />
      ))}
      <StartEnd start={task.start} end={task.end} />
      <CoilMesh coil={coil} position={pos} rotDeg={position.rot} />
      <CogMarker position={pos} offset={offset} limit={0.15} />
    </Canvas>
  );
}
