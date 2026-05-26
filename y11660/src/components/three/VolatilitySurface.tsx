import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ProcessedDataPoint } from '@/types';

interface VolatilitySurfaceProps {
  dataPoints: ProcessedDataPoint[];
  onPointHover?: (point: ProcessedDataPoint | null) => void;
  onPointClick?: (point: ProcessedDataPoint) => void;
}

export const VolatilitySurface = ({
  dataPoints,
  onPointHover,
  onPointClick,
}: VolatilitySurfaceProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const geometryRef = useRef<THREE.PlaneGeometry>(null);
  const shaderMaterialRef = useRef<THREE.ShaderMaterial>(null);

  const { geometry, colors, positions } = useMemo(() => {
    if (dataPoints.length === 0) {
      return {
        geometry: new THREE.PlaneGeometry(10, 10, 1, 1),
        colors: [],
        positions: [],
      };
    }

    const expirationDates = [
      ...new Set(dataPoints.map((p) => p.expirationDate)),
    ].sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime()
    );
    const strikePrices = [
      ...new Set(dataPoints.map((p) => p.strikePrice)),
    ].sort((a, b) => a - b);

    const cols = expirationDates.length;
    const rows = strikePrices.length;

    const geo = new THREE.PlaneGeometry(10, 10, cols - 1, rows - 1);
    geo.rotateX(-Math.PI / 2);

    const positionsArray: number[][] = [];
    const colorArray: number[] = [];

    const positionAttribute = geo.attributes.position;
    const vertex = new THREE.Vector3();

    for (let i = 0; i < positionAttribute.count; i++) {
      vertex.fromBufferAttribute(positionAttribute, i);

      const originalX = (vertex.x + 5) / 10;
      const originalZ = (vertex.z + 5) / 10;

      const expIndex = Math.round(originalX * (cols - 1));
      const strikeIndex = Math.round(originalZ * (rows - 1));

      const expDate = expirationDates[Math.min(Math.max(expIndex, 0), cols - 1)];
      const strike = strikePrices[Math.min(Math.max(strikeIndex, 0), rows - 1)];

      const point = dataPoints.find(
        (p) => p.expirationDate === expDate && p.strikePrice === strike
      );

      if (point) {
        vertex.y = point.y;
        positionsArray.push([vertex.x, vertex.y, vertex.z]);
      } else {
        const neighbors = dataPoints.filter((p) => {
          const expDist = Math.abs(
            expirationDates.indexOf(p.expirationDate) - expIndex
          );
          const strikeDist = Math.abs(
            strikePrices.indexOf(p.strikePrice) - strikeIndex
          );
          return expDist <= 1 && strikeDist <= 1;
        });

        if (neighbors.length > 0) {
          const avgY =
            neighbors.reduce((sum, p) => sum + p.y, 0) / neighbors.length;
          vertex.y = avgY;
        } else {
          vertex.y = 0.5;
        }
      }

      positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);

      const volNormalized = Math.min(Math.max(vertex.y / 4, 0), 1);
      const color = new THREE.Color();
      color.setHSL(0.6 - volNormalized * 0.5, 0.8, 0.5);
      colorArray.push(color.r, color.g, color.b);
    }

    geo.setAttribute(
      'color',
      new THREE.Float32BufferAttribute(colorArray, 3)
    );
    geo.computeVertexNormals();

    return {
      geometry: geo,
      colors: colorArray,
      positions: positionsArray,
    };
  }, [dataPoints]);

  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec3 vColor;
        
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          vColor = color;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec3 vColor;
        
        void main() {
          vec3 lightDir = normalize(vec3(0.5, 1.0, 0.5));
          float diff = max(dot(vNormal, lightDir), 0.0);
          vec3 ambient = 0.3 * vColor;
          vec3 diffuse = diff * vColor;
          vec3 result = ambient + diffuse;
          
          float fresnel = pow(1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0), 2.0);
          result += fresnel * vec3(0.1, 0.2, 0.3);
          
          gl_FragColor = vec4(result, 0.9);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      vertexColors: true,
    });
  }, []);

  useFrame((state) => {
    if (shaderMaterialRef.current) {
      shaderMaterialRef.current.uniforms.time.value = state.clock.elapsedTime;
    }
  });

  return (
    <group>
      <mesh
        ref={meshRef}
        geometry={geometry}
      >
        <primitive object={shaderMaterial} attach="material" ref={shaderMaterialRef} />
      </mesh>

      <mesh geometry={geometry}>
        <meshBasicMaterial
          color="#00D4FF"
          wireframe
          transparent
          opacity={0.15}
        />
      </mesh>
    </group>
  );
};
