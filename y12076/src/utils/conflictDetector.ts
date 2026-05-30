import { MagnetConfig, ConfigConflict, FieldLineParams, EditorSource } from '../types';

const generateId = () => Math.random().toString(36).substr(2, 9);

export const detectPositionPoleConflict = (
  oldConfig: MagnetConfig,
  newConfig: MagnetConfig
): ConfigConflict | null => {
  if (oldConfig.lastModifiedBy !== newConfig.lastModifiedBy &&
      oldConfig.lastModifiedBy !== undefined &&
      newConfig.lastModifiedBy !== 'user') {
    
    const positionChanged = 
      oldConfig.position.x !== newConfig.position.x ||
      oldConfig.position.y !== newConfig.position.y ||
      oldConfig.position.z !== newConfig.position.z;
    
    const poleChanged = oldConfig.poleDirection !== newConfig.poleDirection;
    
    if ((oldConfig.lastModifiedBy === 'position-editor' && 
         newConfig.lastModifiedBy === 'pole-editor' && poleChanged) ||
        (oldConfig.lastModifiedBy === 'pole-editor' && 
         newConfig.lastModifiedBy === 'position-editor' && positionChanged)) {
      
      return {
        id: generateId(),
        type: 'position-vs-pole',
        magnetId: newConfig.id,
        description: '磁体位置和磁极方向由不同人员编辑，可能存在配置不一致',
        sideA: {
          source: oldConfig.lastModifiedBy === 'position-editor' ? '磁体位置维护者' : '磁极方向维护者',
          value: oldConfig.lastModifiedBy === 'position-editor' 
            ? { ...oldConfig.position } 
            : oldConfig.poleDirection,
          timestamp: oldConfig.lastModifiedAt,
        },
        sideB: {
          source: newConfig.lastModifiedBy === 'position-editor' ? '磁体位置维护者' : '磁极方向维护者',
          value: newConfig.lastModifiedBy === 'position-editor' 
            ? { ...newConfig.position } 
            : newConfig.poleDirection,
          timestamp: newConfig.lastModifiedAt,
        },
        resolved: false,
      };
    }
  }
  
  return null;
};

export const detectDensityPerformanceConflict = (
  params: FieldLineParams
): ConfigConflict | null => {
  if (params.sampleDensity > 8) {
    return {
      id: generateId(),
      type: 'density-vs-performance',
      description: '采样密度过高，可能影响渲染性能',
      sideA: {
        source: '参数配置',
        value: `采样密度: ${params.sampleDensity}`,
        timestamp: Date.now(),
      },
      sideB: {
        source: '系统性能',
        value: '建议采样密度: 3-7',
        timestamp: Date.now(),
      },
      resolved: false,
    };
  }
  return null;
};

export const detectStrengthStabilityConflict = (
  magnets: MagnetConfig[]
): ConfigConflict | null => {
  for (let i = 0; i < magnets.length; i++) {
    for (let j = i + 1; j < magnets.length; j++) {
      const m1 = magnets[i];
      const m2 = magnets[j];
      const distance = Math.sqrt(
        Math.pow(m1.position.x - m2.position.x, 2) +
        Math.pow(m1.position.y - m2.position.y, 2) +
        Math.pow(m1.position.z - m2.position.z, 2)
      );
      
      const avgStrength = (m1.strength + m2.strength) / 2;
      
      if (distance < 0.3 && avgStrength > 1.5) {
        return {
          id: generateId(),
          type: 'strength-vs-stability',
          description: '磁体距离过近且强度过高，可能导致场强异常',
          sideA: {
            source: '磁体配置',
            value: `磁体${m1.id}和${m2.id}距离: ${distance.toFixed(2)}, 平均强度: ${avgStrength.toFixed(2)}`,
            timestamp: Date.now(),
          },
          sideB: {
            source: '稳定性要求',
            value: '建议距离 > 0.5, 强度 < 1.5',
            timestamp: Date.now(),
          },
          resolved: false,
        };
      }
    }
  }
  return null;
};

export const detectAllConflicts = (
  oldConfig: MagnetConfig | null,
  newConfig: MagnetConfig,
  allMagnets: MagnetConfig[],
  fieldLineParams: FieldLineParams
): ConfigConflict[] => {
  const conflicts: ConfigConflict[] = [];
  
  if (oldConfig) {
    const positionPoleConflict = detectPositionPoleConflict(oldConfig, newConfig);
    if (positionPoleConflict) {
      conflicts.push(positionPoleConflict);
    }
  }
  
  const densityConflict = detectDensityPerformanceConflict(fieldLineParams);
  if (densityConflict) {
    conflicts.push(densityConflict);
  }
  
  const strengthConflict = detectStrengthStabilityConflict(allMagnets);
  if (strengthConflict) {
    conflicts.push(strengthConflict);
  }
  
  return conflicts;
};

export const getConflictTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    'position-vs-pole': '📍 位置 vs 磁极方向',
    'density-vs-performance': '📊 采样密度 vs 性能',
    'strength-vs-stability': '⚡ 场强 vs 稳定性',
  };
  return labels[type] || type;
};

export const getConflictSeverity = (type: string): 'error' | 'warning' | 'info' => {
  const severity: Record<string, 'error' | 'warning' | 'info'> = {
    'position-vs-pole': 'error',
    'density-vs-performance': 'warning',
    'strength-vs-stability': 'warning',
  };
  return severity[type] || 'info';
};
