import { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Instances, Float, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '../../store';
import type { ProductNode3D } from '../../../shared/types';

interface ProductNodesProps {
  nodes: ProductNode3D[];
}

const dummy = new THREE.Object3D();
const color = new THREE.Color();

export function ProductNodes({ nodes }: ProductNodesProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const glowMeshRef = useRef<THREE.InstancedMesh>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const {
    selectedProductId,
    setSelectedProductId,
    products,
    risks,
  } = useAppStore();

  const productMap = useMemo(() => {
    const map = new Map(products.map((p) => [p.id, p]));
    return map;
  }, [products]);

  const riskMap = useMemo(() => {
    const map = new Map<string, number>();
    risks.forEach((r) => {
      const current = map.get(r.productId) || 0;
      map.set(r.productId, current + 1);
    });
    return map;
  }, [risks]);

  useFrame((state) => {
    if (!meshRef.current || !glowMeshRef.current) return;

    const time = state.clock.getElapsedTime();

    nodes.forEach((node, i) => {
      const isSelected = selectedProductId === node.productId;
      const isHovered = hoveredId === node.productId;
      const pulseScale = node.riskHighlight
        ? 1 + Math.sin(time * 2 + i) * 0.1
        : 1;
      const baseScale = node.scale * (isSelected ? 1.4 : isHovered ? 1.2 : 1) * pulseScale;

      dummy.position.set(
        node.position[0],
        node.position[1] + Math.sin(time * 0.5 + i * 0.5) * 0.3,
        node.position[2]
      );
      dummy.scale.setScalar(baseScale);
      dummy.updateMatrix();

      meshRef.current!.setMatrixAt(i, dummy.matrix);
      meshRef.current!.setColorAt(i, color.set(node.color));

      if (node.riskHighlight || isSelected) {
        glowMeshRef.current!.setMatrixAt(i, dummy.matrix);
        glowMeshRef.current!.setColorAt(i, color.set(node.color));
      } else {
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        glowMeshRef.current!.setMatrixAt(i, dummy.matrix);
      }
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
    glowMeshRef.current.instanceMatrix.needsUpdate = true;
    if (glowMeshRef.current.instanceColor) glowMeshRef.current.instanceColor.needsUpdate = true;
  });

  const handlePointerOver = (e: any) => {
    e.stopPropagation();
    const instanceId = e.instanceId;
    if (instanceId !== undefined && nodes[instanceId]) {
      setHoveredId(nodes[instanceId].productId);
      document.body.style.cursor = 'pointer';
    }
  };

  const handlePointerOut = () => {
    setHoveredId(null);
    document.body.style.cursor = 'grab';
  };

  const handleClick = (e: any) => {
    e.stopPropagation();
    const instanceId = e.instanceId;
    if (instanceId !== undefined && nodes[instanceId]) {
      const productId = nodes[instanceId].productId;
      setSelectedProductId(selectedProductId === productId ? null : productId);
    }
  };

  const riskCount = (productId: string) => riskMap.get(productId) || 0;

  return (
    <group>
      <Instances
        ref={meshRef as any}
        limit={nodes.length}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
        castShadow
      >
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial
          emissiveIntensity={0.5}
          roughness={0.2}
          metalness={0.8}
        />
      </Instances>

      <Instances
        ref={glowMeshRef as any}
        limit={nodes.length}
      >
        <sphereGeometry args={[0.7, 32, 32]} />
        <meshBasicMaterial
          transparent
          opacity={0.2}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </Instances>

      {nodes.map((node, i) => {
        const product = productMap.get(node.productId);
        const isHovered = hoveredId === node.productId;
        const isSelected = selectedProductId === node.productId;

        if (!product) return null;

        return (
          <Float
            key={node.productId}
            speed={2}
            rotationIntensity={0}
            floatIntensity={0.5}
            position={[node.position[0], node.position[1], node.position[2]]}
          >
            {(isHovered || isSelected) && (
              <Html
                center
                distanceFactor={10}
                position={[0, 1, 0]}
                style={{ pointerEvents: 'none' }}
              >
                <div className="glass rounded-lg px-3 py-2 whitespace-nowrap min-w-[180px]">
                  <div className="font-display font-semibold text-cyber-400 text-sm">
                    {product.name}
                  </div>
                  <div className="text-xs text-gray-400 mt-1 font-mono">
                    {product.code}
                  </div>
                  {riskCount(node.productId) > 0 && (
                    <div className="text-xs text-risk-400 mt-1">
                      ⚠ {riskCount(node.productId)} 个风险点
                    </div>
                  )}
                </div>
              </Html>
            )}
          </Float>
        );
      })}
    </group>
  );
}
