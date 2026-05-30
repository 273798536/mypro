import * as THREE from 'three';
import { InstitutionWithScore, RiskLevel } from '../types';

const TERRAIN_SIZE = 10;
const TERRAIN_SEGMENTS = 50;

export const generateTerrainGeometry = (
  institutions: InstitutionWithScore[]
): THREE.PlaneGeometry => {
  const geometry = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, TERRAIN_SEGMENTS, TERRAIN_SEGMENTS);
  const positions = geometry.attributes.position;

  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const z = positions.getY(i);

    let height = 0;
    let influenceSum = 0;

    institutions.forEach((inst) => {
      const dx = x - inst.x;
      const dz = z - inst.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      const influence = Math.exp(-distance * 1.5);
      const normalizedScore = inst.score / 100;
      height += normalizedScore * influence * 2;
      influenceSum += influence;
    });

    if (influenceSum > 0) {
      height = height / influenceSum;
    }

    positions.setZ(i, height);
  }

  geometry.computeVertexNormals();
  return geometry;
};

export const getTerrainColor = (height: number): THREE.Color => {
  const normalizedHeight = Math.min(1, Math.max(0, height / 2));

  const colors: Record<RiskLevel, THREE.Color> = {
    low: new THREE.Color('#2ed573'),
    medium: new THREE.Color('#ffa502'),
    high: new THREE.Color('#ff6b35'),
    critical: new THREE.Color('#ff4757'),
  };

  if (normalizedHeight < 0.3) {
    return colors.low;
  } else if (normalizedHeight < 0.5) {
    return colors.medium;
  } else if (normalizedHeight < 0.75) {
    return colors.high;
  } else {
    return colors.critical;
  }
};

export const createTerrainMaterial = (): THREE.MeshStandardMaterial => {
  return new THREE.MeshStandardMaterial({
    color: 0x1e3a5f,
    transparent: true,
    opacity: 0.9,
    wireframe: false,
    metalness: 0.3,
    roughness: 0.7,
  });
};

export const createGridHelper = (): THREE.GridHelper => {
  const gridHelper = new THREE.GridHelper(TERRAIN_SIZE + 4, 20, 0x00d4ff, 0x1e3a5f);
  gridHelper.position.y = -0.1;
  gridHelper.material.transparent = true;
  gridHelper.material.opacity = 0.3;
  return gridHelper;
};

export const getInstitutionMarkerColor = (level: RiskLevel, hasAnomaly: boolean): string => {
  if (hasAnomaly) {
    return '#ff4757';
  }

  const colors: Record<RiskLevel, string> = {
    low: '#2ed573',
    medium: '#ffa502',
    high: '#ff6b35',
    critical: '#ff4757',
  };
  return colors[level];
};
