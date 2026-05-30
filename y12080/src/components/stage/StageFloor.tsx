import { useStageStore } from '../../store/useStageStore';

export function StageFloor() {
  const { stage } = useStageStore();
  const hw = stage.width / 2;
  const hd = stage.depth / 2;
  
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[stage.width, stage.depth]} />
        <meshStandardMaterial
          color="#1a1a2e"
          roughness={0.8}
          metalness={0.2}
        />
      </mesh>
      
      <gridHelper
        args={[Math.max(stage.width, stage.depth), 20, '#333355', '#222244']}
        position={[0, 0.01, 0]}
      />
      
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={8}
            array={new Float32Array([
              -hw, 0.02, -hd, hw, 0.02, -hd,
              hw, 0.02, -hd, hw, 0.02, hd,
              hw, 0.02, hd, -hw, 0.02, hd,
              -hw, 0.02, hd, -hw, 0.02, -hd,
            ])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#4a4a6a" linewidth={2} />
      </lineSegments>
      
      <mesh position={[0, stage.height / 2, -hd - 0.1]}>
        <planeGeometry args={[stage.width, stage.height]} />
        <meshStandardMaterial
          color="#0d0d1a"
          side={2}
        />
      </mesh>
    </group>
  );
}
