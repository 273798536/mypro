import { useMemo, useRef, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useMoonStore } from "@/store/moon";
import { terrainHeight } from "@/utils/terrain";

export default function Rover() {
  const route = useMoonStore((s) => s.route);
  const replay = useMoonStore((s) => s.replay);
  const setReplay = useMoonStore((s) => s.setReplay);
  const roverRef = useRef<THREE.Group>(null);

  const totalSteps = Math.max(1, route.length);

  useEffect(() => {
    if (!replay.playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = () => {
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      const st = useMoonStore.getState();
      if (st.replay.playing && st.replay.step < totalSteps) {
        const next = Math.min(totalSteps, st.replay.step + dt * st.replay.speed * 0.8);
        setReplay({ step: next });
      } else if (st.replay.step >= totalSteps) {
        setReplay({ playing: false });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [replay.playing, totalSteps, setReplay]);

  const progress = useMemo(() => {
    if (replay.step <= 0 || route.length < 2) return null;
    const step = Math.min(replay.step, route.length - 1);
    const p = route[Math.floor(step)];
    const y = terrainHeight(p.x, p.z);
    return { pos: new THREE.Vector3(p.x, y + 0.55, p.z), step };
  }, [replay.step, route]);

  useFrame((state, dt) => {
    if (roverRef.current && progress) {
      roverRef.current.position.lerp(progress.pos, Math.min(1, dt * 4));
    }
  });

  if (!progress) return null;

  return (
    <group ref={roverRef} position={[0, 0.55, 0]}>
      <mesh castShadow>
        <boxGeometry args={[1.4, 0.5, 0.9]} />
        <meshStandardMaterial
          color={0xd0d4dc}
          metalness={0.6}
          roughness={0.4}
        />
      </mesh>
      <mesh position={[0, 0.35, 0]} castShadow>
        <boxGeometry args={[0.8, 0.25, 0.6]} />
        <meshStandardMaterial
          color={0xe8ecf2}
          metalness={0.5}
          roughness={0.4}
        />
      </mesh>
      <mesh position={[0, 0.55, 0.2]}>
        <cylinderGeometry args={[0.15, 0.15, 0.1, 12]} />
        <meshStandardMaterial
          color={0x4dc4ff}
          emissive={0x2a7fa8}
          emissiveIntensity={0.4}
        />
      </mesh>
      {[-0.5, 0.5].map((x) =>
        [-0.35, 0.35].map((z) => (
          <mesh key={`${x}-${z}`} position={[x, -0.35, z]} castShadow>
            <cylinderGeometry args={[0.2, 0.2, 0.25, 12]} />
            <meshStandardMaterial color={0x2a2e36} roughness={0.9} />
          </mesh>
        ))
      )}
    </group>
  );
}
