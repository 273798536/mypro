import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Asset } from '../../types/asset';
import type { ChangePoint } from '../../types/analysis';
import { useUIStore } from '../../store/uiStore';
import { useDataStore } from '../../store/dataStore';
import { COLORS, getRiskColor } from '../../utils/color';
import { interpolateToTimeIndex } from '../../engine/dataProcessor';

interface NebulaPointsProps {
  assets: Asset[];
  runType: 'first' | 'second';
  showComparison?: boolean;
}

const POINT_SIZE_BASE = 0.08;
const POINT_SIZE_HOVER = 0.15;
const POINT_SIZE_SELECTED = 0.18;

export function NebulaPoints({ assets, runType, showComparison = false }: NebulaPointsProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colorArray = useMemo(() => new Float32Array(assets.length * 3), [assets.length]);
  
  const currentTimeIndex = useUIStore(s => s.currentTimeIndex);
  const isPlaying = useUIStore(s => s.isPlaying);
  const selectedAssetId = useUIStore(s => s.selectedAssetId);
  const hoveredAssetId = useUIStore(s => s.hoveredAssetId);
  const selectedIndustries = useUIStore(s => s.selectedIndustries);
  const highlightRisk = useUIStore(s => s.highlightRisk);
  const activeRun = useUIStore(s => s.activeRun);
  
  const result = useDataStore(s => 
    runType === 'first' ? s.firstRunResult : s.secondRunResult
  );
  
  const changes = useMemo(() => {
    if (runType !== 'second' || !result?.changes) return new Map<string, ChangePoint>();
    return new Map(result.changes.map(c => [c.assetId, c]));
  }, [result?.changes, runType]);
  
  const animatedPositions = useRef<Map<string, THREE.Vector3>>(new Map());
  const targetPositions = useRef<Map<string, THREE.Vector3>>(new Map());
  
  useEffect(() => {
    if (!result) return;
    
    const timeInterpolated = interpolateToTimeIndex(result.assets, currentTimeIndex, result.bounds);
    
    for (const asset of timeInterpolated) {
      const target = new THREE.Vector3(asset.position.x, asset.position.y, asset.position.z);
      targetPositions.current.set(asset.id, target);
      
      if (!animatedPositions.current.has(asset.id)) {
        animatedPositions.current.set(asset.id, target.clone());
      }
    }
  }, [currentTimeIndex, result, assets]);
  
  useFrame((state, delta) => {
    if (!meshRef.current || !result) return;
    
    const interpolationSpeed = isPlaying ? 2 : 5;
    
    for (let i = 0; i < assets.length; i++) {
      const asset = assets[i];
      
      if (asset.weight === 0) {
        dummy.position.set(1000, 1000, 1000);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
        continue;
      }
      
      const animated = animatedPositions.current.get(asset.id);
      const target = targetPositions.current.get(asset.id);
      
      if (animated && target) {
        animated.lerp(target, Math.min(1, delta * interpolationSpeed));
      }
      
      const pos = animated || target;
      if (!pos) continue;
      
      const isSelected = asset.id === selectedAssetId;
      const isHovered = asset.id === hoveredAssetId;
      const hasChange = changes.has(asset.id);
      
      const isFilteredOut = 
        (selectedIndustries.length > 0 && !selectedIndustries.includes(asset.industry)) ||
        (highlightRisk !== 'all' && asset.riskLevel !== highlightRisk);
      
      let size = POINT_SIZE_BASE;
      if (isSelected) size = POINT_SIZE_SELECTED;
      else if (isHovered) size = POINT_SIZE_HOVER;
      else if (hasChange && activeRun === 'comparison') size = POINT_SIZE_BASE * 1.3;
      
      size *= (0.5 + Math.abs(asset.weight) * 0.5);
      
      dummy.position.copy(pos);
      dummy.scale.setScalar(size);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
      
      let color: THREE.Color;
      if (hasChange && activeRun === 'comparison') {
        const pulse = (Math.sin(state.clock.elapsedTime * 3) + 1) / 2;
        const baseColor = new THREE.Color(COLORS.change.marker);
        const riskColor = new THREE.Color(getRiskColor(asset.riskLevel));
        color = baseColor.clone().lerp(riskColor, pulse * 0.5);
      } else {
        color = new THREE.Color(getRiskColor(asset.riskLevel));
      }
      
      if (isFilteredOut) {
        color.multiplyScalar(0.3);
      }
      
      if (isSelected || isHovered) {
        color.multiplyScalar(1.3);
      }
      
      colorArray[i * 3] = color.r;
      colorArray[i * 3 + 1] = color.g;
      colorArray[i * 3 + 2] = color.b;
    }
    
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });
  
  useEffect(() => {
    if (!meshRef.current) return;
    
    for (let i = 0; i < assets.length; i++) {
      const asset = assets[i];
      const color = new THREE.Color(getRiskColor(asset.riskLevel));
      colorArray[i * 3] = color.r;
      colorArray[i * 3 + 1] = color.g;
      colorArray[i * 3 + 2] = color.b;
    }
    
    meshRef.current.instanceColor = new THREE.InstancedBufferAttribute(colorArray, 3);
  }, [assets, colorArray]);
  
  const handlePointerMove = (event: any) => {
    event.stopPropagation();
    const { instanceId } = event;
    if (instanceId !== undefined && instanceId < assets.length) {
      const asset = assets[instanceId];
      if (asset.weight !== 0) {
        useUIStore.getState().setHoveredAssetId(asset.id);
        document.body.style.cursor = 'pointer';
      }
    }
  };
  
  const handlePointerOut = () => {
    useUIStore.getState().setHoveredAssetId(null);
    document.body.style.cursor = 'auto';
  };
  
  const handleClick = (event: any) => {
    event.stopPropagation();
    const { instanceId } = event;
    if (instanceId !== undefined && instanceId < assets.length) {
      const asset = assets[instanceId];
      if (asset.weight !== 0) {
        const currentSelected = useUIStore.getState().selectedAssetId;
        useUIStore.getState().setSelectedAssetId(
          currentSelected === asset.id ? null : asset.id
        );
      }
    }
  };
  
  if (!result || assets.length === 0) return null;
  
  const visibleAssets = assets.filter(a => a.weight !== 0);
  if (visibleAssets.length === 0) return null;
  
  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, assets.length]}
      onPointerMove={handlePointerMove}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    >
      <sphereGeometry args={[1, 16, 16]} />
      <meshStandardMaterial
        transparent
        opacity={0.9}
        emissiveIntensity={0.3}
        roughness={0.2}
        metalness={0.8}
      />
    </instancedMesh>
  );
}
