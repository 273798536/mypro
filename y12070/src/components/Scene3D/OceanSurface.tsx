import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const vertexShader = `
uniform float uTime;
varying vec2 vUv;
varying float vElevation;

void main() {
  vUv = uv;
  vec3 pos = position;
  float elevation = sin(pos.x * 0.01 + uTime * 0.5) * 1.5
                  + sin(pos.y * 0.008 + uTime * 0.3) * 2.0
                  + sin((pos.x + pos.y) * 0.005 + uTime * 0.7) * 1.0;
  pos.z += elevation;
  vElevation = elevation;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

const fragmentShader = `
uniform float uTime;
varying vec2 vUv;
varying float vElevation;

void main() {
  vec3 deepColor = vec3(0.02, 0.06, 0.12);
  vec3 surfaceColor = vec3(0.0, 0.25, 0.35);
  vec3 highlightColor = vec3(0.0, 0.55, 0.5);

  float mixVal = (vElevation + 4.5) / 9.0;
  vec3 color = mix(deepColor, surfaceColor, mixVal);

  float foamLine = smoothstep(0.55, 0.6, mixVal) * smoothstep(0.75, 0.7, mixVal);
  color = mix(color, highlightColor, foamLine * 0.3);

  float gridX = abs(fract(vUv.x * 40.0 - 0.5) - 0.5);
  float gridY = abs(fract(vUv.y * 40.0 - 0.5) - 0.5);
  float grid = smoothstep(0.48, 0.5, gridX) + smoothstep(0.48, 0.5, gridY);
  color += vec3(0.0, 0.15, 0.12) * grid * 0.15;

  gl_FragColor = vec4(color, 0.92);
}
`;

export default function OceanSurface() {
  const meshRef = useRef<THREE.Mesh>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
    }),
    []
  );

  useFrame((_, delta) => {
    uniforms.uTime.value += delta;
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[1000, -2, 600]}>
      <planeGeometry args={[4000, 3000, 120, 90]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
