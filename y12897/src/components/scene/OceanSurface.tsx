import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface OceanSurfaceProps {
  size?: number;
  segments?: number;
}

export function OceanSurface({ size = 20, segments = 64 }: OceanSurfaceProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor: { value: new THREE.Color('#0e4d7a') },
      uHighlight: { value: new THREE.Color('#2196c4') },
    }),
    []
  );

  const vertexShader = `
    uniform float uTime;
    varying vec2 vUv;
    varying float vElevation;

    void main() {
      vUv = uv;
      vec3 pos = position;
      float wave1 = sin(pos.x * 0.5 + uTime * 0.3) * 0.08;
      float wave2 = sin(pos.y * 0.7 + uTime * 0.2) * 0.05;
      float wave3 = sin((pos.x + pos.y) * 0.3 + uTime * 0.15) * 0.06;
      pos.z += wave1 + wave2 + wave3;
      vElevation = wave1 + wave2 + wave3;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `;

  const fragmentShader = `
    uniform vec3 uColor;
    uniform vec3 uHighlight;
    varying vec2 vUv;
    varying float vElevation;

    void main() {
      float depth = smoothstep(-0.1, 0.15, vElevation);
      vec3 color = mix(uColor, uHighlight, depth);
      float alpha = 0.95;
      gl_FragColor = vec4(color, alpha);
    }
  `;

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[size, size, segments, segments]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
