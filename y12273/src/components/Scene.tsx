import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import Charge from "./Charge";
import FieldLines from "./FieldLines";
import GridFloor from "./GridFloor";
import StarField from "./StarField";
import { useFieldStore } from "@/store/fieldStore";

export default function Scene() {
  const charges = useFieldStore((s) => s.charges);

  return (
    <div className="w-full h-full">
      <Canvas
        gl={{ antialias: true, alpha: false }}
        onPointerMissed={() => useFieldStore.getState().selectCharge(null)}
      >
        <PerspectiveCamera makeDefault position={[0, 8, 10]} fov={50} />
        <OrbitControls
          enablePan
          enableZoom
          enableRotate
          maxPolarAngle={Math.PI * 0.85}
          minDistance={3}
          maxDistance={25}
          target={[0, 0, 0]}
        />

        <color attach="background" args={["#060d1f"]} />
        <fog attach="fog" args={["#060d1f", 15, 40]} />

        <ambientLight color="#1a1a2e" intensity={0.8} />
        <directionalLight position={[5, 10, 5]} intensity={0.3} color="#4a6fa5" />

        <StarField />
        <GridFloor />

        {charges.map((c) => (
          <Charge
            key={c.id}
            id={c.id}
            position={c.position}
            charge={c.charge}
          />
        ))}

        <FieldLines />

        <EffectComposer>
          <Bloom
            luminanceThreshold={0.3}
            luminanceSmoothing={0.9}
            intensity={0.8}
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
