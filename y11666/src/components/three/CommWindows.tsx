import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useMoonStore } from "@/store/moon";
import { terrainHeight } from "@/utils/terrain";

export default function CommWindows() {
  const windows = useMoonStore((s) => s.commWindows);
  const filters = useMoonStore((s) => s.filters);
  const useComm = useMoonStore((s) => s.useComm);
  const replayStep = useMoonStore((s) => s.replay.step);
  const route = useMoonStore((s) => s.route);

  const visible = useMemo(() => {
    if (!filters.showComm) return [];
    return windows;
  }, [windows, filters]);

  const refs = useRef<Map<string, THREE.Mesh>>(new Map());

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    refs.current.forEach((m) => {
      const mat = m.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.35 + Math.sin(t * 2) * 0.1;
    });
  });

  const handleUse = (id: string, ok: boolean) => {
    useComm(id, ok);
  };

  return (
    <group>
      {visible.map((w) => {
        const y = terrainHeight(w.x, w.z);
        const color = w.used
          ? 0x6ef2a1
          : replayStep >= w.startT
            ? 0xffcc66
            : 0x4dc4ff;
        return (
          <group key={w.id} position={[w.x, y + 0.05, w.z]}>
            <mesh
              rotation={[-Math.PI / 2, 0, 0]}
              ref={(el) => {
                if (el) refs.current.set(w.id, el);
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
                const inWindow =
                  replayStep >= w.startT && replayStep <= w.endT;
                handleUse(w.id, inWindow);
              }}
            >
              <ringGeometry args={[w.radius - 0.1, w.radius, 48]} />
              <meshBasicMaterial
                color={color}
                side={THREE.DoubleSide}
                transparent
                opacity={0.6}
              />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[w.radius - 1.5, w.radius - 1.3, 48]} />
              <meshBasicMaterial
                color={color}
                side={THREE.DoubleSide}
                transparent
                opacity={0.3}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
