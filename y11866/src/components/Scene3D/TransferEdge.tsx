import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { TransferEdge as TransferEdgeType } from '@/types';
import { getEdgeColor, getEdgeWidth, formatAmount, getRiskLabel } from '@/utils/colors';
import { COLORS } from '@/utils/colors';

interface TransferEdgeProps {
  edge: TransferEdgeType;
  sourcePosition: { x: number; y: number; z: number };
  targetPosition: { x: number; y: number; z: number };
  isSelected: boolean;
  isHighlighted: boolean;
  onClick: () => void;
  onPointerOver: () => void;
  onPointerOut: () => void;
}

export function TransferEdge({
  edge,
  sourcePosition,
  targetPosition,
  isSelected,
  isHighlighted,
  onClick,
  onPointerOver,
  onPointerOut,
}: TransferEdgeProps) {
  const lineRef = useRef<THREE.LineSegments>(null);
  const glowRef = useRef<THREE.LineSegments>(null);
  const flowRef = useRef<THREE.Mesh>(null);

  const color = getEdgeColor(edge.riskLevel, !!edge.isModified, isSelected, isHighlighted);
  const width = getEdgeWidth(edge.amount);
  const opacity = isSelected || isHighlighted ? 1 : edge.isModified ? 0.9 : 0.6;

  const { curve, midpoint, direction, distance } = useMemo(() => {
    const start = new THREE.Vector3(sourcePosition.x, sourcePosition.y, sourcePosition.z);
    const end = new THREE.Vector3(targetPosition.x, targetPosition.y, targetPosition.z);
    const dir = new THREE.Vector3().subVectors(end, start).normalize();
    const dist = start.distanceTo(end);

    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    const normal = new THREE.Vector3(0, 1, 0);
    const offset = dist * 0.15;
    mid.add(normal.clone().cross(dir).normalize().multiplyScalar(offset));

    const curvePath = new THREE.QuadraticBezierCurve3(start, mid, end);
    return {
      curve: curvePath,
      midpoint: mid,
      direction: dir,
      distance: dist,
    };
  }, [sourcePosition, targetPosition]);

  const { positions, glowPositions } = useMemo(() => {
    const points = curve.getPoints(50);
    const positions = new Float32Array(points.length * 3);
    const glowPositions = new Float32Array(points.length * 3);

    points.forEach((point, i) => {
      positions[i * 3] = point.x;
      positions[i * 3 + 1] = point.y;
      positions[i * 3 + 2] = point.z;

      const normalOffset = direction.clone().cross(new THREE.Vector3(0, 1, 0)).normalize();
      glowPositions[i * 3] = point.x + normalOffset.x * 0.1;
      glowPositions[i * 3 + 1] = point.y + normalOffset.y * 0.1;
      glowPositions[i * 3 + 2] = point.z + normalOffset.z * 0.1;
    });

    return { positions, glowPositions };
  }, [curve, direction]);

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();

    if (flowRef.current && (isSelected || isHighlighted || edge.isCrossChain)) {
      const t = (elapsed * 0.5) % 1;
      const point = curve.getPoint(t);
      flowRef.current.position.copy(point);

      const lookAt = curve.getPoint(Math.min(t + 0.01, 1));
      flowRef.current.lookAt(lookAt);
    }

    if (glowRef.current) {
      const glowOpacity = 0.3 + Math.sin(elapsed * 2) * 0.2;
      const mat = glowRef.current.material as THREE.LineBasicMaterial;
      mat.opacity = glowOpacity;
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    onClick();
  };

  const handlePointerOver = (e: any) => {
    e.stopPropagation();
    document.body.style.cursor = 'pointer';
    onPointerOver();
  };

  const handlePointerOut = (e: any) => {
    e.stopPropagation();
    document.body.style.cursor = 'default';
    onPointerOut();
  };

  return (
    <group>
      <lineSegments ref={glowRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={50}
            array={glowPositions}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial
          color={color}
          transparent
          opacity={0.3}
          linewidth={width * 2}
        />
      </lineSegments>

      <lineSegments
        ref={lineRef}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={50}
            array={positions}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial
          color={color}
          transparent
          opacity={opacity}
          linewidth={width}
        />
      </lineSegments>

      <mesh
        ref={flowRef}
        position={[midpoint.x, midpoint.y, midpoint.z]}
      >
        <coneGeometry args={[0.3, 0.8, 8]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.8}
        />
      </mesh>

      {(isSelected || isHighlighted) && (
        <mesh position={[midpoint.x, midpoint.y + 1, midpoint.z]}>
          <sprite scale={[4, 1.5, 1]}>
            <spriteMaterial>
              <canvasTexture
                image={(function createLabel() {
                  const canvas = document.createElement('canvas');
                  canvas.width = 512;
                  canvas.height = 128;
                  const ctx = canvas.getContext('2d')!;

                  ctx.fillStyle = 'rgba(10, 22, 40, 0.95)';
                  ctx.fillRect(0, 0, 512, 128);
                  ctx.strokeStyle = color;
                  ctx.lineWidth = 4;
                  ctx.strokeRect(2, 2, 508, 124);

                  ctx.fillStyle = COLORS.text.primary;
                  ctx.font = 'bold 24px JetBrains Mono, monospace';
                  ctx.textAlign = 'center';
                  ctx.fillText(`${formatAmount(edge.amount)} ${edge.token}`, 256, 50);

                  ctx.font = '18px JetBrains Mono, monospace';
                  ctx.fillStyle = color;
                  ctx.fillText(getRiskLabel(edge.riskLevel), 256, 85);

                  if (edge.isCrossChain) {
                    ctx.fillStyle = COLORS.node.pending;
                    ctx.font = '14px JetBrains Mono, monospace';
                    ctx.fillText('跨链交易', 256, 110);
                  }

                  const texture = new THREE.CanvasTexture(canvas);
                  texture.needsUpdate = true;
                  return texture;
                })()}
              />
            </spriteMaterial>
          </sprite>
        </mesh>
      )}

      {edge.isDuplicate && (
        <mesh position={[midpoint.x, midpoint.y, midpoint.z]}>
          <boxGeometry args={[0.5, 0.5, 0.5]} />
          <meshBasicMaterial color={COLORS.node.pending} />
        </mesh>
      )}
    </group>
  );
}

export default TransferEdge;
