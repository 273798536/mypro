import { useMemo } from "react";
import { useMoonStore } from "@/store/moon";
import { terrainHeight } from "@/utils/terrain";

export default function Samples() {
  const samples = useMoonStore((s) => s.samples);
  const filters = useMoonStore((s) => s.filters);
  const collectSample = useMoonStore((s) => s.collectSample);

  const visible = useMemo(() => {
    return samples.filter((s) => {
      if (s.kind === "rock" && !filters.showRock) return false;
      if (s.kind === "soil" && !filters.showSoil) return false;
      if (s.kind === "ice" && !filters.showIce) return false;
      return true;
    });
  }, [samples, filters]);

  return (
    <group>
      {visible.map((s) => {
        const y = terrainHeight(s.x, s.z);
        const color =
          s.kind === "rock" ? 0xb88a60 : s.kind === "soil" ? 0x9a6a3f : 0x9ad8ff;
        return (
          <group
            key={s.id}
            position={[s.x, y + 0.3, s.z]}
            onPointerDown={(e) => {
              e.stopPropagation();
              if (!s.collected) collectSample(s.id);
            }}
          >
            <mesh>
              <dodecahedronGeometry
                args={[s.kind === "ice" ? 0.42 : 0.32, 0]}
              />
              <meshStandardMaterial
                color={color}
                emissive={s.collected ? 0x1a3d1a : 0x221a1a}
                emissiveIntensity={s.collected ? 0.4 : 0.2}
                roughness={0.85}
                transparent
                opacity={s.collected ? 0.35 : 1}
              />
            </mesh>
            <mesh position={[0, 0.55, 0]}>
              <ringGeometry args={[0.45, 0.5, 24]} />
              <meshBasicMaterial
                color={s.collected ? 0x6ef2a1 : 0xffcc66}
                side={2}
                transparent
                opacity={0.8}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
