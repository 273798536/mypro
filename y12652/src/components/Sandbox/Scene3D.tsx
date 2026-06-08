import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { useSandboxStore } from "@/store/useSandboxStore";
import { GroundGrid } from "./GroundGrid";
import { BuildingBlock } from "./BuildingBlock";
import { CorridorPath } from "./CorridorPath";
import { CollisionMarker } from "./CollisionMarker";

export function Scene3D() {
  const {
    currentProject,
    selectedBlockId,
    selectedCollisionId,
    selectBlock,
    selectCollision,
  } = useSandboxStore();

  const collisionBlockIds = new Set(
    currentProject.collisions.flatMap((c) => [c.blockA, c.blockB])
  );

  return (
    <Canvas
      shadows
      camera={{ position: [60, 70, 60], fov: 45, near: 0.1, far: 1000 }}
      gl={{ antialias: true, alpha: true }}
      onPointerMissed={() => {
        selectBlock(null);
        selectCollision(null);
      }}
    >
      <color attach="background" args={["#020617"]} />
      <fog attach="fog" args={["#020617", 80, 250]} />

      <ambientLight intensity={0.3} />
      <directionalLight
        position={[50, 80, 30]}
        intensity={0.8}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={200}
        shadow-camera-left={-100}
        shadow-camera-right={100}
        shadow-camera-top={100}
        shadow-camera-bottom={-100}
      />
      <directionalLight position={[-40, 50, -40]} intensity={0.3} color="#6EE7B7" />
      <pointLight position={[0, 40, 0]} intensity={0.5} color="#2DD4BF" distance={100} />

      <GroundGrid />

      {currentProject.corridors.map((corridor) => (
        <CorridorPath key={corridor.id} corridor={corridor} />
      ))}

      {currentProject.blocks.map((block) => (
        <BuildingBlock
          key={block.id}
          block={block}
          isSelected={selectedBlockId === block.id}
          isInCollision={collisionBlockIds.has(block.id)}
          onSelect={(id) => {
            selectBlock(id);
            selectCollision(null);
          }}
        />
      ))}

      {currentProject.collisions.map((collision) => (
        <CollisionMarker
          key={collision.id}
          collision={collision}
          isSelected={selectedCollisionId === collision.id}
          onClick={(id) => {
            selectCollision(id);
            selectBlock(null);
          }}
        />
      ))}

      <ContactShadows
        position={[0, 0.01, 0]}
        opacity={0.5}
        scale={200}
        blur={2}
        far={50}
        color="#000000"
      />

      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        minDistance={15}
        maxDistance={200}
        maxPolarAngle={Math.PI / 2.1}
        target={[0, 10, 0]}
      />

      <EffectComposer>
        <Bloom
          intensity={0.6}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </EffectComposer>
    </Canvas>
  );
}
