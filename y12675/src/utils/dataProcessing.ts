import type { PointCloudData, CrystalDefect, CollisionEvent, DataStatus } from '../types';

export function cleanPointCloudData(data: PointCloudData): PointCloudData {
  let points = [...data.points];
  
  const beforeCount = points.length;
  
  points = points.filter((defect) => {
    if (!defect.position || 
        defect.position.x === null || 
        defect.position.y === null || 
        defect.position.z === null) {
      return false;
    }
    if (isNaN(defect.position.x) || 
        isNaN(defect.position.y) || 
        isNaN(defect.position.z)) {
      return false;
    }
    return true;
  });
  
  const nullCount = beforeCount - points.length;
  
  const seen = new Set<string>();
  const duplicates: CrystalDefect[] = [];
  points = points.filter((defect) => {
    const key = `${defect.position.x},${defect.position.y},${defect.position.z},${defect.type}`;
    if (seen.has(key)) {
      duplicates.push(defect);
      return false;
    }
    seen.add(key);
    return true;
  });
  
  const duplicateCount = duplicates.length;
  
  let noteCount = 0;
  points = points.map((defect) => {
    const hasNote = Object.values(defect.properties).some(
      (v) => typeof v === 'string' && (v.includes('备注') || v.includes('注意') || v.includes('需'))
    );
    if (hasNote) {
      noteCount++;
    }
    return defect;
  });

  return {
    ...data,
    points,
    metadata: {
      ...data.metadata,
      nullCount,
      duplicateCount,
      noteCount,
      clean: nullCount === 0 && duplicateCount === 0,
    },
  };
}

export function checkDataStatus(data: PointCloudData | null): DataStatus {
  if (!data) {
    return {
      hasNulls: false,
      hasDuplicates: false,
      hasNotes: false,
      needsReview: false,
    };
  }
  
  return {
    hasNulls: data.metadata.nullCount > 0,
    hasDuplicates: data.metadata.duplicateCount > 0,
    hasNotes: data.metadata.noteCount > 0,
    needsReview: data.metadata.nullCount > 0 || data.metadata.duplicateCount > 0,
  };
}

export function detectCollisions(
  defects: CrystalDefect[],
  threshold: number = 1.0
): CollisionEvent[] {
  const collisions: CollisionEvent[] = [];
  
  for (let i = 0; i < defects.length; i++) {
    for (let j = i + 1; j < defects.length; j++) {
      const d1 = defects[i];
      const d2 = defects[j];
      
      const dx = d1.position.x - d2.position.x;
      const dy = d1.position.y - d2.position.y;
      const dz = d1.position.z - d2.position.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      
      const combinedRadius = d1.radius + d2.radius;
      
      if (distance < combinedRadius + threshold) {
        const severity = distance < combinedRadius * 0.5 ? 'high' : 
                        distance < combinedRadius ? 'medium' : 'low';
        
        collisions.push({
          id: `collision-${d1.id}-${d2.id}`,
          time: Math.max(d1.timestamp, d2.timestamp),
          defect1: d1.id,
          defect2: d2.id,
          distance,
          severity,
        });
      }
    }
  }
  
  return collisions;
}

export function generateMockData(): PointCloudData {
  const defectTypes: CrystalDefect['type'][] = ['vacancy', 'interstitial', 'dislocation', 'grain_boundary', 'precipitate'];
  const points: CrystalDefect[] = [];
  
  for (let i = 0; i < 100; i++) {
    const type = defectTypes[Math.floor(Math.random() * defectTypes.length)];
    const hasProperty = Math.random() > 0.8;
    const properties: Record<string, string | number | boolean | undefined> = {};
    
    if (hasProperty) {
      if (Math.random() > 0.5) {
        properties.note = '需人工复核';
      } else {
        properties.remark = '备注：可能为空位簇';
      }
    }
    
    points.push({
      id: `defect-${i}`,
      position: {
        x: (Math.random() - 0.5) * 20,
        y: (Math.random() - 0.5) * 20,
        z: (Math.random() - 0.5) * 20,
      },
      type,
      radius: 0.5 + Math.random() * 1.5,
      timestamp: Math.floor(Math.random() * 100),
      properties,
    });
  }
  
  const withNulls = Math.random() > 0.7;
  if (withNulls) {
    for (let i = 0; i < 3; i++) {
      points.push({
        id: `defect-null-${i}`,
        position: {
          x: Number.NaN,
          y: 0,
          z: 0,
        },
        type: 'vacancy',
        radius: 1,
        timestamp: 10,
        properties: {},
      });
    }
  }
  
  return {
    points,
    metadata: {
      material: '铝合金 6061-T6',
      clean: false,
      nullCount: withNulls ? 3 : 0,
      duplicateCount: 0,
      noteCount: points.filter((p) => 
        (p.properties as Record<string, string | number | boolean | undefined>).note || 
        (p.properties as Record<string, string | number | boolean | undefined>).remark
      ).length,
      importTimestamp: Date.now(),
      source: '扫描电镜数据',
    },
  };
}

export function calculateDistance(p1: { x: number; y: number; z: number }, 
                                  p2: { x: number; y: number; z: number }): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dz = p1.z - p2.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function formatDistance(distance: number): string {
  return `${distance.toFixed(3)} nm`;
}

export function exportToJSON(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
