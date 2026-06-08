import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useDataStore } from '@/store/useDataStore';
import { createViridisScale } from '@/utils/colorScale';

export default function EddyParticles() {
  const records = useDataStore((s) => s.records);
  const range = useDataStore((s) => s.valueRange);
  const selectedId = useDataStore((s) => s.selectedRecordId);
  const hoveredId = useDataStore((s) => s.hoveredRecordId);
  const setSelected = useDataStore((s) => s.setSelectedRecord);
  const setHovered = useDataStore((s) => s.setHoveredRecord);
  const pointsRef = useRef<THREE.Points>(null);

  const { positions, colors, sizes, ids } = useMemo(() => {
    const n = records.length;
    const positions = new Float32Array(n * 3);
    const colors = new Float32Array(n * 3);
    const sizes = new Float32Array(n);
    const ids: string[] = new Array(n);
    const scale = createViridisScale(range.min, range.max);
    records.forEach((r, i) => {
      positions[i * 3] = r.x;
      positions[i * 3 + 1] = r.y;
      positions[i * 3 + 2] = r.z;
      const c = scale.getColor(r.value);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
      const isAbnormal = r.abnormalFlags.some((f) => !f.resolved);
      sizes[i] = isAbnormal ? 0.14 : 0.07;
      ids[i] = r.id;
    });
    return { positions, colors, sizes, ids };
  }, [records, range.min, range.max]);

  useFrame((state) => {
    if (!pointsRef.current) return;
    const t = state.clock.getElapsedTime();
    const mat = pointsRef.current.material as THREE.ShaderMaterial;
    if (mat.uniforms) mat.uniforms.time.value = t;
  });

  const onPointerMove = (e: any) => {
    e.stopPropagation();
    const idx = (e as unknown as { instanceId?: number }).instanceId;
    if (typeof idx === 'number' && ids[idx]) {
      setHovered(ids[idx]);
    }
  };
  const onPointerOut = () => setHovered(null);
  const onClick = (e: any) => {
    e.stopPropagation();
    const idx = (e as unknown as { instanceId?: number }).instanceId;
    if (typeof idx === 'number' && ids[idx]) {
      setSelected(ids[idx] === selectedId ? null : ids[idx]);
    }
  };

  return (
    <points ref={pointsRef} onPointerMove={onPointerMove} onPointerOut={onPointerOut} onClick={onClick}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={colors.length / 3} array={colors} itemSize={3} />
        <bufferAttribute attach="attributes-aSize" count={sizes.length} array={sizes} itemSize={1} />
      </bufferGeometry>
      <shaderMaterial
        vertexColors
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={{ time: { value: 0 }, hoverId: { value: -1 }, selectId: { value: -1 } }}
        vertexShader={`
          attribute float aSize;
          varying vec3 vColor;
          varying float vSize;
          uniform float time;
          void main() {
            vColor = color;
            vSize = aSize;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            float pulse = 1.0 + 0.15 * sin(time * 2.0 + position.x * 3.0);
            gl_PointSize = aSize * 300.0 * pulse / -mvPosition.z;
            gl_Position = projectionMatrix * mvPosition;
          }
        `}
        fragmentShader={`
          varying vec3 vColor;
          void main() {
            vec2 uv = gl_PointCoord - vec2(0.5);
            float d = length(uv);
            if (d > 0.5) discard;
            float alpha = smoothstep(0.5, 0.0, d);
            gl_FragColor = vec4(vColor, alpha);
          }
        `}
      />
    </points>
  );
}
