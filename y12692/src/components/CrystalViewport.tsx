import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls as DreiOrbitControls, PerspectiveCamera } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useLatticeStore } from "@/store/useLatticeStore";
import type { BatchRecord, LatticeParameters, Vec3 } from "@/types";

interface ControlsT {
  target: THREE.Vector3;
  update: () => void;
}

const ELEMENT_COLORS: Record<string, string> = {
  Na: "#3DDC97",
  Cl: "#FF8C42",
  O: "#6FE6B2",
  Si: "#C7D3E8",
  C: "#95A9CC",
};

function elementColor(el: string): string {
  return ELEMENT_COLORS[el] ?? "#637FB0";
}

function buildLatticeAtoms(params: LatticeParameters) {
  const atoms: { position: [number, number, number]; element: string; radius: number }[] = [];
  for (let ix = 0; ix < params.layersX; ix++) {
    for (let iy = 0; iy < params.layersY; iy++) {
      for (let iz = 0; iz < params.layersZ; iz++) {
        const base: [number, number, number] = [
          ix * params.a + params.offsetX,
          iy * params.b + params.offsetY,
          iz * params.c + params.offsetZ,
        ];
        const corners: [number, number, number][] = [
          [0, 0, 0],
          [params.a, 0, 0],
          [0, params.b, 0],
          [0, 0, params.c],
          [params.a, params.b, 0],
          [params.a, 0, params.c],
          [0, params.b, params.c],
          [params.a, params.b, params.c],
        ];
        corners.forEach((c, i) => {
          const el = (ix + iy + iz + i) % 2 === 0 ? "Na" : "Cl";
          atoms.push({
            position: [base[0] + c[0], base[1] + c[1], base[2] + c[2]],
            element: el,
            radius: el === "Na" ? 0.45 : 0.75,
          });
        });
        atoms.push({
          position: [
            base[0] + params.a / 2,
            base[1] + params.b / 2,
            base[2] + params.c / 2,
          ],
          element: (ix + iy + iz) % 2 === 0 ? "Cl" : "Na",
          radius: (ix + iy + iz) % 2 === 0 ? 0.75 : 0.45,
        });
      }
    }
  }
  return atoms;
}

function buildCellEdges(params: LatticeParameters) {
  const edges: [number, number, number][][] = [];
  for (let ix = 0; ix < params.layersX; ix++) {
    for (let iy = 0; iy < params.layersY; iy++) {
      for (let iz = 0; iz < params.layersZ; iz++) {
        const ox = ix * params.a + params.offsetX;
        const oy = iy * params.b + params.offsetY;
        const oz = iz * params.c + params.offsetZ;
        const A: [number, number, number] = [ox, oy, oz];
        const B: [number, number, number] = [ox + params.a, oy, oz];
        const C: [number, number, number] = [ox + params.a, oy + params.b, oz];
        const D: [number, number, number] = [ox, oy + params.b, oz];
        const E: [number, number, number] = [ox, oy, oz + params.c];
        const F: [number, number, number] = [ox + params.a, oy, oz + params.c];
        const G: [number, number, number] = [ox + params.a, oy + params.b, oz + params.c];
        const H: [number, number, number] = [ox, oy + params.b, oz + params.c];
        edges.push(
          [A, B], [B, C], [C, D], [D, A],
          [E, F], [F, G], [G, H], [H, E],
          [A, E], [B, F], [C, G], [D, H],
        );
      }
    }
  }
  return edges;
}

function CellEdges({ params }: { params: LatticeParameters }) {
  const edges = useMemo(() => buildCellEdges(params), [params]);
  const lineSegments = useMemo(() => {
    const positions: number[] = [];
    edges.forEach(([a, b]) => {
      positions.push(...a, ...b);
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    return geo;
  }, [edges]);
  return (
    <lineSegments geometry={lineSegments}>
      <lineBasicMaterial color="#3A5584" transparent opacity={0.55} />
    </lineSegments>
  );
}

function Atoms({ params }: { params: LatticeParameters }) {
  const atoms = useMemo(() => buildLatticeAtoms(params), [params]);
  return (
    <group>
      {atoms.map((a, i) => (
        <mesh key={i} position={a.position}>
          <sphereGeometry args={[a.radius, 32, 32]} />
          <meshStandardMaterial
            color={elementColor(a.element)}
            metalness={0.35}
            roughness={0.25}
            emissive={elementColor(a.element)}
            emissiveIntensity={0.08}
            transparent
            opacity={0.88}
          />
        </mesh>
      ))}
    </group>
  );
}

function CollisionMarkers({
  collisions,
  selectedId,
  onSelect,
}: {
  collisions: BatchRecord["collisions"];
  selectedId: string | null;
  onSelect: (id: string, pos: Vec3) => void;
}) {
  return (
    <group>
      {collisions.map((c) => {
        const isSelected = selectedId === c.collisionId;
        return (
          <group key={c.collisionId} position={[c.position.x, c.position.y, c.position.z]}>
            <mesh
              onClick={(e) => {
                e.stopPropagation();
                onSelect(c.collisionId, c.position);
              }}
            >
              <sphereGeometry args={[Math.max(0.55, Math.cbrt(c.volume) * 1.3), 32, 32]} />
              <meshBasicMaterial
                color={isSelected ? "#E63946" : "#FF8C42"}
                transparent
                opacity={isSelected ? 0.55 : 0.3}
              />
            </mesh>
            <mesh>
              <ringGeometry args={[0.8, 0.92, 48]} />
              <meshBasicMaterial
                color={isSelected ? "#E63946" : "#FF8C42"}
                transparent
                opacity={0.75}
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function FocusIndicator({ position }: { position: Vec3 | null }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (ref.current) {
      ref.current.rotation.x += dt * 0.6;
      ref.current.rotation.y += dt * 0.9;
    }
  });
  if (!position) return null;
  return (
    <mesh ref={ref} position={[position.x, position.y, position.z]}>
      <torusGeometry args={[1.1, 0.05, 16, 64]} />
      <meshBasicMaterial color="#3DDC97" transparent opacity={0.9} />
    </mesh>
  );
}

function CameraSync({ cameraState }: { cameraState: { position: Vec3; target: Vec3 } }) {
  const { camera, controls } = useThree();
  useEffect(() => {
    camera.position.set(cameraState.position.x, cameraState.position.y, cameraState.position.z);
    const c = controls as unknown as ControlsT | undefined;
    if (c && c.target) {
      c.target.set(cameraState.target.x, cameraState.target.y, cameraState.target.z);
      c.update();
    }
  }, [cameraState, camera, controls]);
  return null;
}

function ControlsBridge() {
  const { camera, controls } = useThree();
  const setCamera = useLatticeStore((s) => s.setCamera);
  const focus = useLatticeStore((s) => s.focusedPosition);
  useEffect(() => {
    if (!focus) return;
    const c = controls as unknown as ControlsT | undefined;
    if (!c) return;
    const start = { tx: c.target.x, ty: c.target.y, tz: c.target.z };
    const duration = 700;
    const t0 = performance.now();
    let raf = 0;
    const step = () => {
      const t = Math.min(1, (performance.now() - t0) / duration);
      const ease = 1 - Math.pow(1 - t, 3);
      c.target.set(
        start.tx + (focus.x - start.tx) * ease,
        start.ty + (focus.y - start.ty) * ease,
        start.tz + (focus.z - start.tz) * ease,
      );
      const camOffset = new THREE.Vector3(14, 14, 14);
      camera.position.lerp(
        new THREE.Vector3(
          focus.x + camOffset.x,
          focus.y + camOffset.y,
          focus.z + camOffset.z,
        ),
        ease * 0.7,
      );
      c.update();
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [focus, camera, controls]);
  return (
    <DreiOrbitControls
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={3}
      maxDistance={80}
      onChange={(e) => {
        if (!e) return;
        const c = e.target as unknown as ControlsT;
        setCamera(
          { x: camera.position.x, y: camera.position.y, z: camera.position.z },
          { x: c.target.x, y: c.target.y, z: c.target.z },
        );
      }}
    />
  );
}

export default function CrystalViewport({ batch }: { batch: BatchRecord }) {
  const camera = useLatticeStore((s) => s.camera);
  const selectedId = useLatticeStore((s) => s.selectedCollisionId);
  const focused = useLatticeStore((s) => s.focusedPosition);
  const selectCollision = useLatticeStore((s) => s.selectCollision);
  const focusPosition = useLatticeStore((s) => s.focusPosition);
  const markCameraLost = useLatticeStore((s) => s.markCameraLost);

  const cameraState = useMemo(
    () => ({
      position: camera.position,
      target: camera.target,
    }),
    [camera],
  );

  return (
    <div className="relative h-full w-full overflow-hidden rounded-sm border border-ink-500/40 bg-gradient-to-br from-ink-900 via-ink-800 to-ink-900 grain">
      <Canvas dpr={[1, 1.6]} gl={{ antialias: true }}>
        <PerspectiveCamera makeDefault position={[18, 18, 18]} fov={45} />
        <CameraSync cameraState={cameraState} />
        <ambientLight intensity={0.35} />
        <directionalLight position={[10, 18, 8]} intensity={0.9} color="#E8EEF7" />
        <directionalLight position={[-8, 6, -10]} intensity={0.35} color="#637FB0" />
        <pointLight position={[0, 12, 0]} intensity={0.5} color="#3DDC97" distance={40} />

        <group>
          <gridHelper args={[60, 30, "#1F3A66", "#0F2747"]} position={[10, -0.05, 10]} />
          <CellEdges params={batch.parameters} />
          <Atoms params={batch.parameters} />
          <CollisionMarkers
            collisions={batch.collisions}
            selectedId={selectedId}
            onSelect={(id, pos) => {
              selectCollision(id);
              focusPosition(pos);
            }}
          />
          <FocusIndicator position={focused} />
        </group>

        <EffectComposer>
          <Bloom luminanceThreshold={0.25} luminanceSmoothing={0.9} intensity={0.55} />
        </EffectComposer>

        <ControlsBridge />
      </Canvas>

      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4 text-[11px] font-mono">
        <div className="flex items-start justify-between">
          <div className="pointer-events-auto flex items-center gap-2">
            <span className="chip border-lattice/60 bg-lattice/10 text-lattice">
              <span className="h-1.5 w-1.5 rounded-full bg-lattice" />
              3D 视口 · 晶胞堆叠
            </span>
            <span className="chip border-ink-400/50 text-ink-200">
              {batch.materialName}
            </span>
          </div>
          <button
            type="button"
            onClick={markCameraLost}
            className="pointer-events-auto btn-ghost text-[10px]"
            title="标记当前视角丢失，下批将重置并加载示例"
          >
            视角异常?
          </button>
        </div>
        <div className="flex items-end justify-between text-ink-200/70">
          <div className="space-y-1">
            <div>
              相机: ({camera.position.x.toFixed(1)}, {camera.position.y.toFixed(1)},{" "}
              {camera.position.z.toFixed(1)})
            </div>
            <div>
              目标: ({camera.target.x.toFixed(1)}, {camera.target.y.toFixed(1)},{" "}
              {camera.target.z.toFixed(1)})
              {camera.isInvalid && (
                <span className="ml-2 text-warn">视角已标记丢失，下批次自动重置</span>
              )}
            </div>
          </div>
          <div className="text-right">
            <div>拖拽旋转 · 滚轮缩放 · 右键平移</div>
            <div className="text-ink-300/60">点击橙色碰撞区自动定位</div>
          </div>
        </div>
      </div>
    </div>
  );
}
