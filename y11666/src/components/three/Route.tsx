import { useMemo, useRef, useEffect } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls as DreiOrbitControls } from "@react-three/drei";
import { useMoonStore } from "@/store/moon";
import { terrainHeight } from "@/utils/terrain";
import { isPointInShadow } from "@/utils/energy";

export default function Route() {
  const route = useMoonStore((s) => s.route);
  const seed = useMoonStore((s) => s.terrainSeed);
  const sun = useMoonStore((s) => s.sun);
  const sensitivity = useMoonStore((s) => s.filters.shadowSensitivity);
  const replayStep = useMoonStore((s) => s.replay.step);
  const replay = useMoonStore((s) => s.replay);

  const tubeRef = useRef<THREE.Mesh>(null);

  const displayedRoute = useMemo(() => {
    if (replay.playing && replayStep > 0 && replayStep <= route.length) {
      return route.slice(0, replayStep);
    }
    return route;
  }, [route, replayStep, replay.playing]);

  const hasShadow = useMemo(() => {
    if (displayedRoute.length < 2) return false;
    for (let i = 0; i < displayedRoute.length - 1; i++) {
      const a = displayedRoute[i];
      const b = displayedRoute[i + 1];
      const mx = (a.x + b.x) / 2;
      const mz = (a.z + b.z) / 2;
      if (isPointInShadow(mx, mz, seed, sun, sensitivity)) return true;
    }
    return false;
  }, [displayedRoute, seed, sun, sensitivity]);

  const tubeGeom = useMemo(() => {
    if (displayedRoute.length < 2) return null;
    const pts = displayedRoute.map(
      (p) => new THREE.Vector3(p.x, p.y + 0.12, p.z)
    );
    const c = new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.08);
    return new THREE.TubeGeometry(
      c,
      Math.max(20, displayedRoute.length * 6),
      0.15,
      6,
      false
    );
  }, [displayedRoute]);

  useFrame((state) => {
    if (tubeRef.current) {
      const m = tubeRef.current.material as THREE.MeshBasicMaterial;
      const t = state.clock.getElapsedTime();
      m.opacity = 0.7 + Math.sin(t * 2) * 0.15;
    }
  });

  const tubeColor = hasShadow ? 0xff7a5a : 0x4dc4ff;

  return (
    <group>
      {displayedRoute.map((p, i) => (
        <mesh key={i} position={[p.x, p.y + 0.22, p.z]}>
          <sphereGeometry args={[0.28, 16, 16]} />
          <meshBasicMaterial color={i === 0 ? 0x6ef2a1 : tubeColor} />
        </mesh>
      ))}
      {tubeGeom && (
        <mesh ref={tubeRef} geometry={tubeGeom}>
          <meshBasicMaterial
            color={tubeColor}
            transparent
            opacity={0.85}
            toneMapped={false}
          />
        </mesh>
      )}
    </group>
  );
}

export function RouteInteractor() {
  const appendRoutePoint = useMoonStore((s) => s.appendRoutePoint);
  const popRoutePoint = useMoonStore((s) => s.popRoutePoint);
  const route = useMoonStore((s) => s.route);
  const seed = useMoonStore((s) => s.terrainSeed);

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.05, 0]}
      onPointerDown={(e) => {
        if (e.nativeEvent.button === 2) {
          e.stopPropagation();
          popRoutePoint();
          useMoonStore.getState().pushHistory("撤销上一路径点", "route_pop");
          return;
        }
        if (e.nativeEvent.shiftKey && e.nativeEvent.button === 0) {
          e.stopPropagation();
          const p = e.point;
          const y = terrainHeight(p.x, p.z, seed);
          appendRoutePoint({ x: p.x, z: p.z, y, idx: route.length });
          useMoonStore
            .getState()
            .pushHistory(`新增路径点 #${route.length + 1}`, "route_add");
        }
      }}
      onContextMenu={(e) => e.stopPropagation()}
    >
      <planeGeometry args={[200, 200]} />
      <meshBasicMaterial transparent opacity={0.001} />
    </mesh>
  );
}

export function OrbitControls() {
  const controlsRef = useRef<any>(null);
  const { camera, gl } = useThree();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "Shift" && controlsRef.current) {
        controlsRef.current.enabled = false;
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === "Shift" && controlsRef.current) {
        controlsRef.current.enabled = true;
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  return (
    <DreiOrbitControls
      ref={controlsRef}
      args={[camera, gl.domElement]}
      enableDamping
      dampingFactor={0.08}
      minDistance={6}
      maxDistance={80}
      maxPolarAngle={Math.PI / 2 - 0.05}
      mouseButtons={{
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN,
      }}
    />
  );
}
