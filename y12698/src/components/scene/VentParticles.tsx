import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface Props {
  position: [number, number, number];
  particleCount?: number;
  height?: number;
  speed?: number;
}

export default function VentParticles({
  position,
  particleCount = 800,
  height = 40,
  speed = 0.08,
}: Props) {
  const ref = useRef<THREE.Points>(null);

  const { geometry, material } = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const c1 = new THREE.Color('#FF6B35');
    const c2 = new THREE.Color('#FFD93D');
    const c3 = new THREE.Color('#5a4030');
    for (let i = 0; i < particleCount; i++) {
      const r = Math.random() * 3;
      const a = Math.random() * Math.PI * 2;
      positions[i * 3] = Math.cos(a) * r;
      positions[i * 3 + 1] = Math.random() * height;
      positions[i * 3 + 2] = Math.sin(a) * r;
      const t = Math.random();
      const col = t < 0.3 ? c1.clone().lerp(c2, t / 0.3) : c2.clone().lerp(c3, (t - 0.3) / 0.7);
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
      sizes[i] = 0.3 + Math.random() * 0.7;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      },
      vertexShader: `
        attribute float aSize;
        uniform float uTime;
        uniform float uPixelRatio;
        varying vec3 vColor;
        varying float vY;
        void main() {
          vColor = color;
          vY = position.y;
          vec3 p = position;
          p.x += sin(uTime * 0.8 + position.y * 0.3) * 0.6;
          p.z += cos(uTime * 0.6 + position.y * 0.25) * 0.5;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          float fade = 1.0 - smoothstep(0.0, 1.0, position.y / 40.0);
          gl_PointSize = aSize * 180.0 * uPixelRatio / -mv.z * fade;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vY;
        void main() {
          vec2 uv = gl_PointCoord - 0.5;
          float d = length(uv);
          if (d > 0.5) discard;
          float alpha = (1.0 - d * 2.0);
          float fade = 1.0 - smoothstep(5.0, 35.0, vY);
          gl_FragColor = vec4(vColor, alpha * fade);
        }
      `,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return { geometry: geo, material: mat };
  }, [particleCount]);

  useFrame((state) => {
    if (ref.current) {
      (ref.current.material as THREE.ShaderMaterial).uniforms.uTime.value = state.clock.elapsedTime;
      const pos = ref.current.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < particleCount; i++) {
        let y = pos.getY(i);
        y += speed * (0.5 + (i % 5) * 0.15);
        if (y > height) {
          y = 0;
          const r = Math.random() * 2.5;
          const a = Math.random() * Math.PI * 2;
          pos.setX(i, Math.cos(a) * r);
          pos.setZ(i, Math.sin(a) * r);
        }
        pos.setY(i, y);
      }
      pos.needsUpdate = true;
    }
  });

  return (
    <group position={position}>
      <points ref={ref} geometry={geometry} material={material} />
    </group>
  );
}
