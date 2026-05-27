import React, { useMemo, useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { Text } from '@react-three/drei';
import type { Portfolio, AxisMapping } from '../../types/portfolio';
import { getPortfolioValue } from '../../engine/efficientFrontier';
import { generateColorGradient } from '../../utils/formatters';

interface PortfolioPointsProps {
  portfolios: Portfolio[];
  xAxis: AxisMapping;
  yAxis: AxisMapping;
  zAxis: AxisMapping;
  selectedId: string | null;
  comparisonIds: string[];
  onSelect: (id: string | null) => void;
  onHover: (portfolio: Portfolio | null) => void;
  visible?: boolean;
  highlightOptimal?: boolean;
  optimalId?: string;
}

export const PortfolioPoints: React.FC<PortfolioPointsProps> = ({
  portfolios,
  xAxis,
  yAxis,
  zAxis,
  selectedId,
  comparisonIds,
  onSelect,
  onHover,
  visible = true,
  highlightOptimal = true,
  optimalId
}) => {
  const instancedMeshRef = useRef<THREE.InstancedMesh>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  
  const { positions, colors, scales, dummy } = useMemo(() => {
    const dummy = new THREE.Object3D();
    const positions: THREE.Vector3[] = [];
    const colors: THREE.Color[] = [];
    const scales: number[] = [];
    
    if (portfolios.length === 0) {
      return { positions, colors, scales, dummy };
    }

    const values = {
      x: portfolios.map(p => getPortfolioValue(p, xAxis)),
      y: portfolios.map(p => getPortfolioValue(p, yAxis)),
      z: portfolios.map(p => getPortfolioValue(p, zAxis))
    };

    const ranges = {
      x: { min: Math.min(...values.x), max: Math.max(...values.x) },
      y: { min: Math.min(...values.y), max: Math.max(...values.y) },
      z: { min: Math.min(...values.z), max: Math.max(...values.z) }
    };

    const sharpeValues = portfolios.map(p => p.sharpeRatio);
    const sharpeRange = {
      min: Math.min(...sharpeValues),
      max: Math.max(...sharpeValues)
    };

    portfolios.forEach((portfolio, i) => {
      const normalize = (v: number, range: { min: number; max: number }) => {
        if (range.max === range.min) return 0;
        return ((v - range.min) / (range.max - range.min)) * 0.8 - 0.4;
      };

      const x = normalize(values.x[i], ranges.x);
      const y = normalize(values.y[i], ranges.y);
      const z = normalize(values.z[i], ranges.z);

      positions.push(new THREE.Vector3(x, y, z));

      if (portfolio.status === 'error') {
        colors.push(new THREE.Color('#ef4444'));
      } else if (portfolio.status === 'warning') {
        colors.push(new THREE.Color('#f59e0b'));
      } else {
        const colorHex = generateColorGradient(
          portfolio.sharpeRatio,
          sharpeRange.min,
          sharpeRange.max,
          ['#ef4444', '#f59e0b', '#10b981']
        );
        colors.push(new THREE.Color(colorHex));
      }

      const baseScale = portfolio.id === optimalId && highlightOptimal ? 0.025 : 0.015;
      scales.push(baseScale);
    });

    return { positions, colors, scales, dummy };
  }, [portfolios, xAxis, yAxis, zAxis, optimalId, highlightOptimal]);

  useEffect(() => {
    if (!instancedMeshRef.current) return;

    const mesh = instancedMeshRef.current;
    
    positions.forEach((pos, i) => {
      const isSelected = portfolios[i].id === selectedId;
      const isComparison = comparisonIds.includes(portfolios[i].id);
      const isHovered = portfolios[i].id === hoveredId;
      const isOptimal = portfolios[i].id === optimalId && highlightOptimal;
      
      const scale = scales[i] * (isSelected || isHovered ? 1.8 : isComparison ? 1.4 : isOptimal ? 1.5 : 1);
      
      dummy.position.copy(pos);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      
      mesh.setMatrixAt(i, dummy.matrix);
      
      const color = colors[i].clone();
      if (isSelected) {
        color.set('#d4af37');
      } else if (isComparison) {
        color.multiplyScalar(1.2);
      }
      
      mesh.setColorAt(i, color);
    });
    
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  }, [positions, colors, scales, selectedId, comparisonIds, hoveredId, optimalId, highlightOptimal, dummy, portfolios]);

  const handlePointerMove = (e: any) => {
    e.stopPropagation();
    const index = e.instanceId;
    if (index !== undefined && index >= 0 && index < portfolios.length) {
      setHoveredId(portfolios[index].id);
      onHover(portfolios[index]);
      document.body.style.cursor = 'pointer';
    }
  };

  const handlePointerOut = (e: any) => {
    e.stopPropagation();
    setHoveredId(null);
    onHover(null);
    document.body.style.cursor = 'auto';
  };

  const handleClick = (e: any) => {
    e.stopPropagation();
    const index = e.instanceId;
    if (index !== undefined && index >= 0 && index < portfolios.length) {
      const clickedId = portfolios[index].id;
      onSelect(clickedId === selectedId ? null : clickedId);
    }
  };

  if (!visible || portfolios.length === 0) return null;

  const selectedPortfolio = portfolios.find(p => p.id === selectedId);

  return (
    <group>
      <instancedMesh
        ref={instancedMeshRef}
        args={[undefined, undefined, portfolios.length]}
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        <sphereGeometry args={[1, 16, 16]} />
        <meshPhongMaterial
          emissiveIntensity={0.3}
          shininess={100}
        />
      </instancedMesh>

      {selectedPortfolio && (() => {
        const idx = portfolios.findIndex(p => p.id === selectedId);
        if (idx < 0) return null;
        
        const pos = positions[idx];
        
        return (
          <group>
            <mesh position={pos}>
              <sphereGeometry args={[scales[idx] * 2.2, 32, 32]} />
              <meshBasicMaterial
                color="#d4af37"
                transparent
                opacity={0.2}
              />
            </mesh>
            
            <Text
              position={[pos.x, pos.y + 0.06, pos.z]}
              fontSize={0.035}
              color="#d4af37"
              anchorX="center"
              anchorY="bottom"
              outlineWidth={0.004}
              outlineColor="#0a1628"
            >
              {selectedPortfolio.name}
            </Text>
          </group>
        );
      })()}

      {comparisonIds.map(id => {
        const idx = portfolios.findIndex(p => p.id === id);
        if (idx < 0) return null;
        
        const pos = positions[idx];
        const colorIndex = comparisonIds.indexOf(id);
        const comparisonColors = ['#3b82f6', '#8b5cf6', '#ec4899'];
        
        return (
          <mesh key={id} position={pos}>
            <ringGeometry args={[scales[idx] * 1.3, scales[idx] * 1.6, 32]} />
            <meshBasicMaterial
              color={comparisonColors[colorIndex]}
              transparent
              opacity={0.6}
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      })}

      {optimalId && highlightOptimal && (() => {
        const idx = portfolios.findIndex(p => p.id === optimalId);
        if (idx < 0 || selectedId === optimalId) return null;
        
        const pos = positions[idx];
        
        return (
          <group>
            <mesh position={pos}>
              <torusGeometry args={[scales[idx] * 1.8, 0.008, 16, 32]} />
              <meshBasicMaterial
                color="#d4af37"
                transparent
                opacity={0.8}
              />
            </mesh>
            
            <Text
              position={[pos.x, pos.y + 0.08, pos.z]}
              fontSize={0.028}
              color="#d4af37"
              anchorX="center"
              anchorY="bottom"
            >
              ★ 最优
            </Text>
          </group>
        );
      })()}

      {hoveredId && !selectedId && (() => {
        const idx = portfolios.findIndex(p => p.id === hoveredId);
        if (idx < 0) return null;
        
        const pos = positions[idx];
        const portfolio = portfolios[idx];
        
        return (
          <Text
            position={[pos.x, pos.y + 0.05, pos.z]}
            fontSize={0.03}
            color="#ffffff"
            anchorX="center"
            anchorY="bottom"
            outlineWidth={0.003}
            outlineColor="#0a1628"
          >
            {portfolio.name}
          </Text>
        );
      })()}
    </group>
  );
};
