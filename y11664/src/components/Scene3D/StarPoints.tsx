import { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FundData, INDUSTRY_COLORS, ThreeDPoint } from '../../types';
import { useStore } from '../../store/useStore';

interface StarPointsProps {
  funds: FundData[];
  onPointHover: (fund: FundData | null) => void;
  onPointClick: (fund: FundData) => void;
  setPoints: (points: ThreeDPoint[]) => void;
}

export const StarPoints = ({ funds, onPointHover, onPointClick, setPoints }: StarPointsProps) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const { selectedFund, hoveredFundId } = useStore();

  const { positions, colors, scales } = useMemo(() => {
    const positions: [number, number, number][] = [];
    const colors: string[] = [];
    const scales: number[] = [];
    const points: ThreeDPoint[] = [];

    funds.forEach((fund) => {
      const x = fund.volatility;
      const y = fund.maxDrawdown;
      const z = fund.returnRate;
      
      positions.push([x, y, z]);
      colors.push(INDUSTRY_COLORS[fund.industry] || '#888888');
      scales.push(fund.weight / 5 + 0.5);
      points.push({ x, y, z, fund });
    });

    setPoints(points);
    return { positions, colors, scales };
  }, [funds, setPoints]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colorObj = useMemo(() => new THREE.Color(), []);

  useFrame(() => {
    if (!meshRef.current) return;

    positions.forEach((pos, i) => {
      const fund = funds[i];
      const isSelected = selectedFund?.id === fund.id;
      const isHovered = hoveredFundId === fund.id || hoveredIndex === i;
      const isBad = fund.dataStatus === 'bad';
      const isBorder = fund.dataStatus === 'border';

      const time = Date.now() * 0.002;
      const pulseScale = isBad ? 1 + Math.sin(time * 3) * 0.3 : isBorder ? 1 + Math.sin(time * 2) * 0.15 : 1;
      const baseScale = scales[i] * (isSelected || isHovered ? 1.5 : 1) * pulseScale;

      dummy.position.set(pos[0], pos[1], pos[2]);
      dummy.scale.setScalar(baseScale);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);

      let color = colors[i];
      if (isBad) color = '#ff3366';
      else if (isBorder) color = '#ff6b35';
      
      colorObj.set(color);
      meshRef.current!.setColorAt(i, colorObj);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  const handlePointerMove = (e: any) => {
    e.stopPropagation();
    const index = e.instanceId;
    setHoveredIndex(index);
    onPointHover(funds[index]);
  };

  const handlePointerOut = () => {
    setHoveredIndex(null);
    onPointHover(null);
  };

  const handleClick = (e: any) => {
    e.stopPropagation();
    const index = e.instanceId;
    onPointClick(funds[index]);
  };

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, funds.length]}
      onPointerMove={handlePointerMove}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    >
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial
        transparent
        opacity={0.9}
        roughness={0.2}
        metalness={0.8}
        emissiveIntensity={0.3}
      />
    </instancedMesh>
  );
};
