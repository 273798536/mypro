import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSceneStore } from '@/stores/useSceneStore';

export function WaterSurface() {
  const waterLevel = useSceneStore((s) => s.waterLevel);
  const meshRef = useRef<THREE.Mesh>(null);
  const geomRef = useRef<THREE.ShaderMaterial>(null);

  const waterMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
      uTime: { value: 0 },
      uLevel: { value: waterLevel.currentLevel },
      uMaxLevel: { value: waterLevel.maxLevel },
      uMinLevel: { value: waterLevel.minLevel },
    },
    vertexShader: `
      uniform float uTime;
      varying vec2 vUv;
      varying float vWave;

      void main() {
        vUv = uv;
        vec3 pos = position;
        float wave1 = sin(pos.x * 0.8 + uTime * 0.6) * 0.08;
        float wave2 = sin(pos.z * 1.2 + uTime * 0.9) * 0.05;
        float wave3 = sin((pos.x + pos.z) * 0.5 + uTime * 0.4) * 0.06;
        vWave = wave1 + wave2 + wave3;
        pos.y += vWave;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uLevel;
      uniform float uMaxLevel;
      uniform float uMinLevel;
      varying vec2 vUv;
      varying float vWave;

      void main() {
        float depthFactor = (uLevel - uMinLevel) / (uMaxLevel - uMinLevel);
        vec3 shallow = vec3(0.0, 0.6, 0.85);
        vec3 deep = vec3(0.0, 0.15, 0.35);
        vec3 color = mix(deep, shallow, depthFactor);

        float foam = smoothstep(0.08, 0.12, vWave + 0.05);
        color = mix(color, vec3(0.9, 0.95, 1.0), foam * 0.4);

        float caustic1 = sin(vUv.x * 30.0 + uTime * 2.0) * sin(vUv.y * 25.0 - uTime * 1.5);
        float caustic = smoothstep(0.3, 0.8, caustic1);
        color += caustic * 0.08;

        gl_FragColor = vec4(color, 0.78);
      }
    `,
    transparent: true,
      side: THREE.DoubleSide,
    });
  }, [waterLevel.maxLevel, waterLevel.minLevel]);

  useFrame((state) => {
    if (waterMat.uniforms) {
      waterMat.uniforms.uTime.value = state.clock.elapsedTime;
      waterMat.uniforms.uLevel.value = waterLevel.currentLevel;
    }
    if (meshRef.current) {
      meshRef.current.position.y = waterLevel.currentLevel;
    }
  });

  const levelProgress = (waterLevel.currentLevel - waterLevel.minLevel) / (waterLevel.maxLevel - waterLevel.minLevel);

  return (
    <group>
      {/* 主水面 - 闸室内 */}
      <mesh ref={meshRef} position={[0, waterLevel.currentLevel, 0]} receiveShadow material={waterMat}>
        <planeGeometry args={[9.8, 9.8, 48, 48]} />
        <meshStandardMaterial
          color="#0077aa"
          transparent
          opacity={0.75}
          side={THREE.DoubleSide}
          metalness={0.1}
          roughness={0.15}
        />
      </mesh>

      {/* 上游水面 */}
      <mesh position={[-10, waterLevel.upstreamLevel, 0]} receiveShadow>
        <planeGeometry args={[4, 11.8, 20, 20]} />
        <meshStandardMaterial
          color="#006699"
          transparent
          opacity={0.7}
          side={THREE.DoubleSide}
          metalness={0.1}
          roughness={0.2}
        />
      </mesh>

      {/* 下游水面 */}
      <mesh position={[10, waterLevel.downstreamLevel, 0]} receiveShadow>
        <planeGeometry args={[4, 11.8, 20, 20]} />
        <meshStandardMaterial
          color="#0088bb"
          transparent
          opacity={0.7}
          side={THREE.DoubleSide}
          metalness={0.1}
          roughness={0.2}
        />
      </mesh>

      {/* 水位线发光带 */}
      <mesh position={[0, waterLevel.currentLevel + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[4.8, 4.95, 64]} />
        <meshBasicMaterial
          color="#00ffff"
          transparent
          opacity={0.4 + Math.sin(Date.now() * 0.003) * 0.2}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 目标水位指示 */}
      {Math.abs(waterLevel.currentLevel - waterLevel.targetLevel) > 0.3 && (
        <mesh position={[0, waterLevel.targetLevel, 4.9]}>
          <boxGeometry args={[10, 0.04, 0.04]} />
          <meshBasicMaterial color="#ffaa00" transparent opacity={0.7} />
        </mesh>
      )}

      {/* 水位容积可视化 - 半透明水体 */}
      <mesh position={[0, waterLevel.currentLevel / 2, 0]}>
        <boxGeometry args={[9.8, waterLevel.currentLevel, 9.8]} />
        <meshStandardMaterial
          color="#00aaff"
          transparent
          opacity={0.06 + levelProgress * 0.08}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
