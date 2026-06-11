import { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  Html,
  Edges,
  Sphere,
  Line,
} from "@react-three/drei";
import {
  EffectComposer,
  Bloom,
  SSAO,
} from "@react-three/postprocessing";
import * as THREE from "three";
import { useScene3DStore, useTimelineStore } from "@/store";
import { MOCK_SCHEMES, MOCK_RECORDS } from "@/data/mockData";
import {
  RISK_LEVEL_LABEL,
  type WarehouseScheme,
  type RiskLevel,
  type WarehouseZone,
} from "@/types";

const SCHEME_COLORS: Record<WarehouseZone, string> = {
  A: "#ef4444",
  B: "#f59e0b",
  C: "#10b981",
};

const SCHEME_EMISSIVE: Record<WarehouseZone, string> = {
  A: "#dc2626",
  B: "#d97706",
  C: "#059669",
};

const RISK_HEX: Record<RiskLevel, string> = {
  low: "#10b981",
  medium: "#f59e0b",
  high: "#ef4444",
  critical: "#dc2626",
};

function DockGround() {
  const meshRef = useRef<THREE.Mesh>(null);
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(200, 200, 80, 80);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const distFromCenter = Math.sqrt(x * x + y * y);
      const noise =
        Math.sin(x * 0.05) * 0.3 +
        Math.cos(y * 0.07) * 0.25 +
        Math.sin((x + y) * 0.03) * 0.15;
      const dockMask =
        x > -80 && x < 80 && y > -30 && y < 60 ? 1 : Math.max(0, 1 - distFromCenter / 100);
      pos.setZ(i, noise * 0.5 * dockMask - 0.1);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
    >
      <meshStandardMaterial
        color="#8b7355"
        roughness={0.9}
        metalness={0.05}
      />
    </mesh>
  );
}

function SeaSurface() {
  const meshRef = useRef<THREE.Mesh>(null);
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(400, 400, 60, 60);
    return geo;
  }, []);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const pos = geometry.attributes.position;
    const t = clock.getElapsedTime();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z =
        Math.sin(x * 0.04 + t * 0.8) * 0.3 +
        Math.cos(y * 0.05 + t * 0.6) * 0.25 +
        Math.sin((x + y) * 0.02 + t * 0.4) * 0.2;
      pos.setZ(i, z);
    }
    pos.needsUpdate = true;
    geometry.computeVertexNormals();
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -1.5, 0]}
    >
      <meshStandardMaterial
        color="#1e6091"
        transparent
        opacity={0.85}
        roughness={0.1}
        metalness={0.4}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function WarehouseSchemeBox({
  scheme,
  isSelected,
  onSelect,
}: {
  scheme: WarehouseScheme;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const boxRef = useRef<THREE.Mesh>(null);
  const pulseRef = useRef<THREE.Mesh>(null);
  const safeSphereRef = useRef<THREE.Mesh>(null);

  const baseColor = SCHEME_COLORS[scheme.zone];
  const displayColor = hovered || isSelected ? baseColor : baseColor;
  const height = Math.sqrt(scheme.area) * 0.15 + 3;
  const width = Math.sqrt(scheme.area) * 0.8;
  const depth = Math.sqrt(scheme.area) * 0.8;

  useFrame(({ clock }) => {
    if (isSelected && pulseRef.current) {
      const t = clock.getElapsedTime();
      const scale = 1 + Math.sin(t * 3) * 0.08;
      pulseRef.current.scale.set(scale, scale, scale);
      const mat = pulseRef.current.material as THREE.MeshStandardMaterial;
      mat.opacity = 0.15 + Math.sin(t * 3) * 0.1;
    }
    if (safeSphereRef.current) {
      const mat = safeSphereRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = hovered || isSelected ? 0.5 : 0.15;
    }
  });

  const opacity = hovered || isSelected ? 0.55 : 0.3;

  return (
    <group position={[scheme.position.x, height / 2, scheme.position.z]}>
      <mesh
        ref={boxRef}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "auto";
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(scheme.id);
        }}
      >
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial
          color={displayColor}
          transparent
          opacity={opacity}
          emissive={SCHEME_EMISSIVE[scheme.zone]}
          emissiveIntensity={hovered || isSelected ? 0.4 : 0.1}
          side={THREE.DoubleSide}
        />
        <Edges
          color={SCHEME_COLORS[scheme.zone]}
          threshold={15}
          scale={1.01}
        />
      </mesh>

      {isSelected && (
        <mesh ref={pulseRef}>
          <boxGeometry args={[width, height, depth]} />
          <meshStandardMaterial
            color={SCHEME_COLORS[scheme.zone]}
            transparent
            opacity={0.2}
            emissive={SCHEME_EMISSIVE[scheme.zone]}
            emissiveIntensity={0.6}
            side={THREE.BackSide}
          />
        </mesh>
      )}

      <Sphere
        ref={safeSphereRef}
        args={[50, 32, 32]}
        position={[0, 0, 0]}
      >
        <meshBasicMaterial
          color={SCHEME_COLORS[scheme.zone]}
          transparent
          opacity={0.15}
          wireframe
        />
      </Sphere>

      {hovered && (
        <Html
          position={[0, height / 2 + 4, 0]}
          center
          distanceFactor={12}
          style={{ pointerEvents: "none" }}
        >
          <div className="bg-slate-900/95 backdrop-blur rounded-xl p-4 shadow-2xl border border-slate-700 min-w-[220px]">
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: SCHEME_COLORS[scheme.zone] }}
              />
              <span className="font-bold text-white text-sm">
                {scheme.name}
              </span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">占地面积</span>
                <span className="font-mono font-medium text-white">
                  {scheme.area.toLocaleString()} ㎡
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">风险等级</span>
                <span
                  className="font-medium px-2 py-0.5 rounded"
                  style={{
                    backgroundColor: RISK_HEX[scheme.riskLevel] + "33",
                    color: RISK_HEX[scheme.riskLevel],
                  }}
                >
                  {RISK_LEVEL_LABEL[scheme.riskLevel]}
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">距码头</span>
                <span className="font-mono font-medium text-white">
                  {scheme.distanceToDock} m
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">距办公区</span>
                <span className="font-mono font-medium text-white">
                  {scheme.distanceToOffice} m
                </span>
              </div>
              <div className="h-px bg-slate-700 my-2" />
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">容量</span>
                <span className="font-mono text-white">
                  {scheme.capacity.toLocaleString()} TEU
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">造价</span>
                <span className="font-mono text-white">
                  {scheme.cost.toLocaleString()} 万元
                </span>
              </div>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

function Containers() {
  const positions = useMemo(() => {
    const list: { x: number; z: number; color: string }[] = [];
    const colors = ["#2563eb", "#dc2626", "#16a34a", "#eab308", "#7c3aed"];
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 6; col++) {
        list.push({
          x: -55 + col * 4,
          z: 35 + row * 3,
          color: colors[(row + col) % colors.length],
        });
      }
    }
    return list;
  }, []);

  return (
    <group>
      {positions.map((p, i) => (
        <group key={i} position={[p.x, 1.25, p.z]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[3.5, 2.5, 2.5]} />
            <meshStandardMaterial color={p.color} roughness={0.7} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Crane({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 8, 0]} castShadow>
        <boxGeometry args={[1, 16, 1]} />
        <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, 16, 0]} castShadow>
        <boxGeometry args={[20, 1.2, 1.5]} />
        <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[-8, 12, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.15, 8, 8]} />
        <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[-8, 7.5, 0]} castShadow>
        <boxGeometry args={[2, 1.5, 2]} />
        <meshStandardMaterial color="#facc15" metalness={0.3} roughness={0.6} />
      </mesh>
    </group>
  );
}

function SceneCameraController() {
  const { camera } = useThree();
  const cameraTarget = useScene3DStore((s) => s.cameraTarget);
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    if (cameraTarget && controlsRef.current) {
      controlsRef.current.target.set(
        cameraTarget.x,
        cameraTarget.y,
        cameraTarget.z,
      );
      controlsRef.current.update();
    }
  }, [cameraTarget]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.08}
      minDistance={30}
      maxDistance={250}
      maxPolarAngle={Math.PI / 2.1}
      target={[0, 5, 0]}
    />
  );
}

function SceneContent() {
  const selectedSchemeId = useScene3DStore((s) => s.selectedSchemeId);
  const setSelectedSchemeId = useScene3DStore((s) => s.setSelectedSchemeId);
  const highlightedRecordIds = useScene3DStore((s) => s.highlightedRecordIds);
  const currentSegmentId = useTimelineStore((s) => s.currentSegmentId);

  const highlightedZones = useMemo(() => {
    const zones = new Set<WarehouseZone>();
    if (highlightedRecordIds.length > 0) {
      MOCK_RECORDS.forEach((r) => {
        if (highlightedRecordIds.includes(r.id)) {
          zones.add(r.zone);
        }
      });
    }
    return zones;
  }, [highlightedRecordIds]);

  useEffect(() => {
    if (highlightedZones.size === 1) {
      const zone = Array.from(highlightedZones)[0];
      const scheme = MOCK_SCHEMES.find((s) => s.zone === zone);
      if (scheme && !selectedSchemeId) {
        setSelectedSchemeId(scheme.id);
      }
    }
  }, [highlightedZones, selectedSchemeId, setSelectedSchemeId]);

  return (
    <>
      <color attach="background" args={["#1a1a2e"]} />
      <fog attach="fog" args={["#1a1a2e", 80, 300]} />

      <ambientLight intensity={0.35} color="#ffcfa0" />
      <directionalLight
        position={[60, 80, 40]}
        intensity={1.4}
        color="#ff8c42"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-120}
        shadow-camera-right={120}
        shadow-camera-top={120}
        shadow-camera-bottom={-120}
      />
      <directionalLight
        position={[-40, 30, -60]}
        intensity={0.4}
        color="#7dd3fc"
      />
      <hemisphereLight
        args={["#ffa07a", "#4682b4", 0.3]}
      />

      <SceneCameraController />

      <SeaSurface />
      <DockGround />

      {MOCK_SCHEMES.map((scheme) => (
        <WarehouseSchemeBox
          key={scheme.id}
          scheme={scheme}
          isSelected={selectedSchemeId === scheme.id}
          onSelect={(id) =>
            setSelectedSchemeId(selectedSchemeId === id ? null : id)
          }
        />
      ))}

      <Containers />
      <Crane position={[-70, 0, 15]} />
      <Crane position={[-70, 0, -15]} />

      <Line
        points={[
          [-90, 0.02, -60],
          [-90, 0.02, 80],
          [80, 0.02, 80],
          [80, 0.02, -60],
        ]}
        color="#fbbf24"
        lineWidth={2}
      />

      <EffectComposer>
        <Bloom
          intensity={0.6}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
        <SSAO
          intensity={0.3}
          radius={10}
          luminanceInfluence={0.6}
          color={new THREE.Color(0x000000)}
          worldDistanceThreshold={10}
          worldDistanceFalloff={5}
          worldProximityThreshold={0.5}
          worldProximityFalloff={0.1}
        />
      </EffectComposer>
    </>
  );
}

export default function ThreeScene() {
  return (
    <Canvas
      shadows
      camera={{ position: [80, 60, 80], fov: 55 }}
      gl={{ antialias: true, alpha: false }}
      className="w-full h-full"
    >
      <SceneContent />
    </Canvas>
  );
}
