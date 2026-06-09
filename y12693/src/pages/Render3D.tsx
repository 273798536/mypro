import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, Sparkles } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRecordsStore } from "../store/recordsStore";
import type { LightRecord } from "../../shared/types";
import * as THREE from "three";

function Fixture({
  record,
  onSelect,
}: {
  record: LightRecord;
  onSelect: (id: string) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.SpotLight>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((_, dt) => {
    if (meshRef.current) {
      meshRef.current.position.y = 2 + Math.sin(Date.now() * 0.002) * 0.05;
    }
  });

  const hasError = record.unitErrors.length > 0;
  const hasRisk = record.riskNotes.length > 0;
  const color = hasError ? "#EF4444" : hasRisk ? "#EAB308" : "#F59E0B";
  const scale = record.coords.z / 8;

  const x = (record.coords.x - 12) * 0.6;
  const z = (record.coords.y - 5) * 0.6;

  return (
    <group position={[x, 0, z]}>
      <mesh
        ref={meshRef}
        position={[0, record.coords.z * 0.4, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(record.id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "auto";
        }}
      >
        <cylinderGeometry args={[0.15, 0.2, 0.4, 8]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered ? 0.8 : 0.3}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      <spotLight
        ref={lightRef}
        position={[0, record.coords.z * 0.4 - 0.2, 0]}
        angle={0.5}
        penumbra={0.8}
        intensity={hovered ? 4 : 2}
        color={color}
        castShadow
        target-position={[0, 0, 0]}
      />

      {hovered && (
        <Html
          position={[0, record.coords.z * 0.4 + 0.6, 0]}
          center
          distanceFactor={6}
        >
          <div className="bg-bg-secondary border border-accent/60 rounded-md px-3 py-2 shadow-glow whitespace-nowrap pointer-events-none">
            <div className="font-display font-semibold text-text-primary text-sm">
              {record.fixtureName}
            </div>
            <div className="text-[11px] font-mono text-text-muted mt-0.5">
              {record.coords.fixtureId} · {record.batchNo}
            </div>
            <div className="text-[10px] text-accent mt-1">点击查看详情</div>
          </div>
        </Html>
      )}
    </group>
  );
}

function StageFloor() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[30, 20]} />
        <meshStandardMaterial color="#1A1F29" roughness={0.9} metalness={0.1} />
      </mesh>
      <gridHelper args={[30, 30, "#3A4356", "#2A3140"]} position={[0, 0, 0]} />
      <mesh position={[-15, 1.5, 0]}>
        <boxGeometry args={[0.2, 3, 20]} />
        <meshStandardMaterial color="#242B38" metalness={0.3} roughness={0.7} />
      </mesh>
      <mesh position={[15, 1.5, 0]}>
        <boxGeometry args={[0.2, 3, 20]} />
        <meshStandardMaterial color="#242B38" metalness={0.3} roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.5, -10]}>
        <boxGeometry args={[30, 3, 0.2]} />
        <meshStandardMaterial color="#242B38" metalness={0.3} roughness={0.7} />
      </mesh>
    </group>
  );
}

export default function Render3D() {
  const nav = useNavigate();
  const { records, fetchRecords } = useRecordsStore();

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const visibleRecords = records.filter(
    (r) => !r.fixtureName.includes("重复")
  );

  return (
    <div className="flex-1 h-screen flex flex-col overflow-hidden">
      <header className="border-b border-border bg-bg-secondary px-6 py-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="font-display text-xl font-bold text-text-primary">
            3D 渲染 · 展台灯光预览
          </h1>
          <p className="text-xs text-text-secondary font-mono mt-0.5">
            月底 / 课前复核 · 点击灯具跳转对应记录详情
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-danger" />
            <span className="text-text-secondary">单位换算错误</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-warning" />
            <span className="text-text-secondary">风险备注</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-accent" />
            <span className="text-text-secondary">正常</span>
          </div>
        </div>
      </header>

      <div className="flex-1 relative bg-bg-primary">
        <Canvas
          shadows
          camera={{ position: [12, 14, 16], fov: 45 }}
          gl={{ antialias: true }}
        >
          <color attach="background" args={["#0a0d12"]} />
          <fog attach="fog" args={["#0a0d12", 20, 50]} />

          <ambientLight intensity={0.15} />
          <directionalLight
            position={[10, 20, 10]}
            intensity={0.3}
            color="#94a3b8"
            castShadow
          />

          <StageFloor />

          {visibleRecords.map((r) => (
            <Fixture key={r.id} record={r} onSelect={(id) => nav(`/records/${id}`)} />
          ))}

          <Sparkles count={60} scale={[30, 10, 20]} size={2} speed={0.2} color="#F59E0B" />

          <OrbitControls
            enablePan
            enableZoom
            enableRotate
            minDistance={5}
            maxDistance={40}
            maxPolarAngle={Math.PI / 2.1}
            target={[0, 2, 0]}
          />
        </Canvas>

        <div className="absolute bottom-4 left-4 panel px-3 py-2 text-[11px] font-mono text-text-muted">
          鼠标左键旋转 · 右键平移 · 滚轮缩放
        </div>

        <div className="absolute top-4 right-4 panel px-3 py-2 text-[11px] font-mono">
          <span className="text-text-secondary">灯具总数:</span>{" "}
          <span className="text-accent">{visibleRecords.length}</span>
        </div>
      </div>
    </div>
  );
}
