import type { Hotspot, MapConfig, DetectionResult } from '@/types';

const generateId = () => `det-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const detectEmptyValues = (hotspots: Hotspot[]): DetectionResult[] => {
  const results: DetectionResult[] = [];
  
  hotspots.forEach(hotspot => {
    if (hotspot.x === null) {
      results.push({
        id: generateId(),
        type: 'empty',
        severity: 'warning',
        message: `热点 "${hotspot.label}" 的X坐标为空`,
        reference: `热点ID: ${hotspot.id}`,
        hotspotId: hotspot.id
      });
    }
    if (hotspot.y === null) {
      results.push({
        id: generateId(),
        type: 'empty',
        severity: 'warning',
        message: `热点 "${hotspot.label}" 的Y坐标为空`,
        reference: `热点ID: ${hotspot.id}`,
        hotspotId: hotspot.id
      });
    }
  });
  
  return results;
};

export const detectDuplicates = (hotspots: Hotspot[]): DetectionResult[] => {
  const results: DetectionResult[] = [];
  const seen = new Map<string, string[]>();
  
  hotspots.forEach(hotspot => {
    if (hotspot.x !== null && hotspot.y !== null) {
      const key = `${hotspot.x},${hotspot.y}`;
      if (!seen.has(key)) {
        seen.set(key, []);
      }
      seen.get(key)!.push(hotspot.id);
    }
  });
  
  seen.forEach((ids, key) => {
    if (ids.length > 1) {
      results.push({
        id: generateId(),
        type: 'duplicate',
        severity: 'error',
        message: `发现重复坐标 (${key})，涉及 ${ids.length} 个热点`,
        reference: `热点ID: ${ids.join(', ')}`
      });
    }
  });
  
  return results;
};

export const detectFlippedCoordinates = (hotspots: Hotspot[], mapConfig: MapConfig): DetectionResult[] => {
  const results: DetectionResult[] = [];
  
  hotspots.forEach(hotspot => {
    if (hotspot.y !== null && hotspot.y > mapConfig.height) {
      results.push({
        id: generateId(),
        type: 'flipped',
        severity: 'error',
        message: `热点 "${hotspot.label}" 的Y坐标(${hotspot.y})超出底图范围(${mapConfig.height})，可能存在坐标翻转`,
        reference: `热点ID: ${hotspot.id}`,
        hotspotId: hotspot.id
      });
    }
    if (hotspot.x !== null && hotspot.x > mapConfig.width) {
      results.push({
        id: generateId(),
        type: 'flipped',
        severity: 'error',
        message: `热点 "${hotspot.label}" 的X坐标(${hotspot.x})超出底图范围(${mapConfig.width})`,
        reference: `热点ID: ${hotspot.id}`,
        hotspotId: hotspot.id
      });
    }
  });
  
  return results;
};

export const detectScaleErrors = (mapConfig: MapConfig): DetectionResult[] => {
  const results: DetectionResult[] = [];
  
  if (mapConfig.scale === null) {
    results.push({
      id: generateId(),
      type: 'scale_error',
      severity: 'warning',
      message: '底图标尺未标注',
      reference: `底图: ${mapConfig.name}`
    });
  } else if (mapConfig.scale <= 0) {
    results.push({
      id: generateId(),
      type: 'scale_error',
      severity: 'error',
      message: `底图标尺值(${mapConfig.scale})无效，应为正数`,
      reference: `底图: ${mapConfig.name}`
    });
  }
  
  if (!mapConfig.scaleUnit) {
    results.push({
      id: generateId(),
      type: 'scale_error',
      severity: 'warning',
      message: '底图标尺单位未标注',
      reference: `底图: ${mapConfig.name}`
    });
  }
  
  return results;
};

export const detectMixedNotes = (hotspots: Hotspot[]): DetectionResult[] => {
  const results: DetectionResult[] = [];
  
  hotspots.forEach(hotspot => {
    if (hotspot.x !== null && typeof hotspot.x !== 'number') {
      results.push({
        id: generateId(),
        type: 'mixed_notes',
        severity: 'error',
        message: `热点 "${hotspot.label}" 的X坐标包含非数字内容`,
        reference: `热点ID: ${hotspot.id}`,
        hotspotId: hotspot.id
      });
    }
    
    if (hotspot.notes && hotspot.notes.length > 0) {
      if (/[\d,。，、]/.test(hotspot.notes)) {
        results.push({
          id: generateId(),
          type: 'mixed_notes',
          severity: 'warning',
          message: `热点 "${hotspot.label}" 的备注字段可能包含坐标数据`,
          reference: `热点ID: ${hotspot.id}`,
          hotspotId: hotspot.id
        });
      }
    }
  });
  
  return results;
};

export const runAllDetections = (hotspots: Hotspot[], mapConfig: MapConfig): DetectionResult[] => {
  const results: DetectionResult[] = [];
  
  results.push(...detectEmptyValues(hotspots));
  results.push(...detectDuplicates(hotspots));
  results.push(...detectFlippedCoordinates(hotspots, mapConfig));
  results.push(...detectScaleErrors(mapConfig));
  results.push(...detectMixedNotes(hotspots));
  
  return results;
};
