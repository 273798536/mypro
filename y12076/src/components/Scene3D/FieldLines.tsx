import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MagnetConfig, FieldLineParams } from '../../types';
import { generateAllFieldLines } from '../../engine/magneticField';
import { useConfigStore } from '../../store/useConfigStore';
import { createIssueReport } from '../../utils/reportGenerator';

interface FieldLinesProps {
  magnets: MagnetConfig[];
  params: FieldLineParams;
  version: number;
}

export function FieldLines({ magnets, params, version }: FieldLinesProps) {
  const linesRef = useRef<THREE.Group>(null);
  const timeRef = useRef(0);
  const { addIssue, interaction } = useConfigStore();

  const fieldLineData = useMemo(() => {
    if (magnets.length === 0) return { lines: [], explosionCount: 0, records: [] };
    
    const startTime = performance.now();
    const result = generateAllFieldLines(magnets, params);
    const endTime = performance.now();
    
    console.log(`[场线生成] ${result.lines.length}条线, 耗时: ${(endTime - startTime).toFixed(2)}ms`);
    
    if (result.explosionCount > 0) {
      const recordIds = result.records.map(r => 
        `爆炸记录#${r.id.substring(0, 6)} @点(${r.point.x.toFixed(2)},${r.point.y.toFixed(2)},${r.point.z.toFixed(2)}) 场强:${r.fieldStrength.toFixed(2)}`
      );
      
      addIssue(createIssueReport(
        'field-explosion',
        `检测到 ${result.explosionCount} 处场强异常。场强上限: ${params.maxFieldStrength}, 最大检测值: ${Math.max(...result.records.map(r => r.fieldStrength)).toFixed(2)}。已自动截断 ${result.explosionCount} 条场线。`,
        recordIds
      ));
    }
    
    return result;
  }, [magnets, params, version]);

  const lineObjects = useMemo(() => {
    return fieldLineData.lines.map((points, index) => {
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const maxStrength = Math.max(...points.map((_, i) => {
        const t = i / points.length;
        return 1 - t * 0.5;
      }));
      
      const color = new THREE.Color();
      color.setHSL(0.55 - (index % 10) * 0.03, 0.8, 0.6);
      
      const material = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.7,
        linewidth: 1,
      });
      
      return new THREE.Line(geometry, material);
    });
  }, [fieldLineData]);

  useEffect(() => {
    if (!linesRef.current) return;
    
    while (linesRef.current.children.length > 0) {
      const child = linesRef.current.children[0];
      linesRef.current.remove(child);
      if (child instanceof THREE.Line) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
    }
    
    lineObjects.forEach(line => {
      linesRef.current?.add(line);
    });
  }, [lineObjects]);

  useFrame((state, delta) => {
    if (interaction.isPaused) return;
    
    timeRef.current += delta;
    
    if (linesRef.current) {
      linesRef.current.children.forEach((child, i) => {
        if (child instanceof THREE.Line && child.material instanceof THREE.LineBasicMaterial) {
          const pulse = Math.sin(timeRef.current * 2 + i * 0.3) * 0.2 + 0.6;
          child.material.opacity = pulse;
        }
      });
    }
  });

  return <group ref={linesRef} />;
}
