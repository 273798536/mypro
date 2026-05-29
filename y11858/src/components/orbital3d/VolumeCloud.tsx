import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '../../store/useAppStore';
import { generateColorMapTexture } from '../../utils/colormaps';

const VOLUME_VERTEX = `
varying vec3 vOrigin;
varying vec3 vDirection;

void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vOrigin = vec3(inverse(modelMatrix) * vec4(cameraPosition, 1.0));
  vDirection = position - vOrigin;
  gl_Position = projectionMatrix * mvPosition;
}
`;

const VOLUME_FRAGMENT = `
precision highp float;
precision highp sampler3D;

varying vec3 vOrigin;
varying vec3 vDirection;

uniform sampler3D uVolume;
uniform sampler2D uColorMap;
uniform float uThreshold;
uniform float uOpacity;
uniform float uSteps;
uniform vec3 uBounds;

vec2 hitBox(vec3 orig, vec3 dir) {
  vec3 box_min = -uBounds;
  vec3 box_max = uBounds;
  vec3 inv_dir = 1.0 / dir;
  vec3 tmin_tmp = (box_min - orig) * inv_dir;
  vec3 tmax_tmp = (box_max - orig) * inv_dir;
  vec3 tmin = min(tmin_tmp, tmax_tmp);
  vec3 tmax = max(tmin_tmp, tmax_tmp);
  float t0 = max(tmin.x, max(tmin.y, tmin.z));
  float t1 = min(tmax.x, min(tmax.y, tmax.z));
  return vec2(t0, t1);
}

void main() {
  vec3 rayDir = normalize(vDirection);
  vec2 bounds = hitBox(vOrigin, rayDir);

  if (bounds.x > bounds.y) discard;

  bounds.x = max(bounds.x, 0.0);

  vec3 p = vOrigin + bounds.x * rayDir;
  vec3 inc = 1.0 / abs(rayDir);
  float delta = min(inc.x, min(inc.y, inc.z)) / uSteps;
  vec3 dt = rayDir * delta;

  vec4 color = vec4(0.0);

  for (float t = bounds.x; t < bounds.y; t += delta) {
    vec3 samplePos = (p + uBounds) / (2.0 * uBounds);
    float density = texture(uVolume, samplePos).r;

    if (density > uThreshold) {
      float mappedDensity = clamp((density - uThreshold) / (1.0 - uThreshold), 0.0, 1.0);
      vec4 sampleColor = texture(uColorMap, vec2(mappedDensity, 0.5));
      sampleColor.a *= uOpacity * mappedDensity;
      color.rgb += (1.0 - color.a) * sampleColor.a * sampleColor.rgb;
      color.a += (1.0 - color.a) * sampleColor.a;

      if (color.a >= 0.95) break;
    }

    p += dt;
  }

  gl_FragColor = color;
}
`;

export function VolumeCloud() {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const volumeData = useAppStore((s) => s.volumeData);
  const vizSettings = useAppStore((s) => s.vizSettings);

  const volumeTexture = useMemo(() => {
    const tex = new THREE.Data3DTexture(
      new Float32Array(1),
      1, 1, 1
    );
    tex.format = THREE.RedFormat;
    tex.type = THREE.FloatType;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    return tex;
  }, []);

  const colorMapTexture = useMemo(() => {
    const data = generateColorMapTexture('quantum');
    const tex = new THREE.DataTexture(data, 256, 1, THREE.RGBAFormat);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    return tex;
  }, []);

  useEffect(() => {
    if (!volumeData) return;
    const res = vizSettings.resolution;
    const newTex = new THREE.Data3DTexture(volumeData, res, res, res);
    newTex.format = THREE.RedFormat;
    newTex.type = THREE.FloatType;
    newTex.minFilter = THREE.LinearFilter;
    newTex.magFilter = THREE.LinearFilter;
    newTex.needsUpdate = true;
    volumeTexture.dispose();
    volumeTexture.image = newTex.image;
    volumeTexture.needsUpdate = true;
  }, [volumeData, vizSettings.resolution]);

  useEffect(() => {
    const data = generateColorMapTexture(vizSettings.colorMap);
    colorMapTexture.image.data = data;
    colorMapTexture.needsUpdate = true;
  }, [vizSettings.colorMap]);

  const uniforms = useMemo(
    () => ({
      uVolume: { value: volumeTexture },
      uColorMap: { value: colorMapTexture },
      uThreshold: { value: vizSettings.isoThreshold * 0.3 },
      uOpacity: { value: vizSettings.volumeOpacity },
      uSteps: { value: 80.0 },
      uBounds: { value: new THREE.Vector3(vizSettings.gridSize, vizSettings.gridSize, vizSettings.gridSize) },
    }),
    []
  );

  useEffect(() => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.uThreshold.value = vizSettings.isoThreshold * 0.3;
    materialRef.current.uniforms.uOpacity.value = vizSettings.volumeOpacity;
    materialRef.current.uniforms.uBounds.value.set(vizSettings.gridSize, vizSettings.gridSize, vizSettings.gridSize);
  }, [vizSettings]);

  useFrame(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.uVolume.value = volumeTexture;
      materialRef.current.uniforms.uColorMap.value = colorMapTexture;
    }
  });

  if (!volumeData) return null;

  const size = vizSettings.gridSize * 2;

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[size, size, size]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={VOLUME_VERTEX}
        fragmentShader={VOLUME_FRAGMENT}
        uniforms={uniforms}
        transparent
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
  );
}
