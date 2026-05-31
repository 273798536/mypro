import { useRef, useMemo } from 'react';
import { Html, Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Annotation } from '../../types';

interface AnnotationsLayerProps {
  annotations: Annotation[];
  onRemove?: (annotationId: string) => void;
}

const ANNOTATION_COLORS: Record<string, string> = {
  filter_impact: '#f59e0b',
  manual_note: '#3b82f6',
  quality_issue: '#ef4444'
};

const ANNOTATION_LABELS: Record<string, string> = {
  filter_impact: '筛选影响',
  manual_note: '手动标注',
  quality_issue: '质量问题'
};

export function AnnotationsLayer({ annotations, onRemove }: AnnotationsLayerProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      const time = state.clock.getElapsedTime();
      groupRef.current.children.forEach((child, i) => {
        child.position.y += Math.sin(time * 2 + i * 0.5) * 0.002;
      });
    }
  });

  if (!annotations.length) return null;

  return (
    <group ref={groupRef}>
      {annotations.map((annotation) => (
        <group
          key={annotation.annotationId}
          position={[annotation.x, annotation.z + 0.5, annotation.y]}
        >
          <mesh>
            <sphereGeometry args={[0.15, 16, 16]} />
            <meshBasicMaterial
              color={ANNOTATION_COLORS[annotation.type] || '#6b7280'}
              transparent
              opacity={0.8}
            />
          </mesh>

          <Line
            points={[[0, 0, 0], [0, 0.5, 0]]}
            color={ANNOTATION_COLORS[annotation.type] || '#6b7280'}
            lineWidth={2}
          />

          <Html
            center
            position={[0, 0.8, 0]}
            distanceFactor={15}
            zIndexRange={[100, 0]}
          >
            <div
              className="relative min-w-[160px] max-w-[240px] rounded-lg border shadow-lg backdrop-blur-sm"
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                borderColor: ANNOTATION_COLORS[annotation.type] || '#6b7280'
              }}
            >
              <div
                className="flex items-center justify-between px-3 py-1.5 text-xs font-medium rounded-t-lg"
                style={{
                  backgroundColor: `${ANNOTATION_COLORS[annotation.type] || '#6b7280'}20`,
                  color: ANNOTATION_COLORS[annotation.type] || '#6b7280'
                }}
              >
                <span>{ANNOTATION_LABELS[annotation.type] || '标注'}</span>
                {onRemove && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(annotation.annotationId);
                    }}
                    className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
                  >
                    ×
                  </button>
                )}
              </div>
              <div className="px-3 py-2 text-xs text-slate-300 leading-relaxed">
                {annotation.content}
              </div>
              <div className="px-3 pb-2 text-[10px] text-slate-500 flex justify-between">
                <span>{annotation.createdBy}</span>
                <span>{new Date(annotation.createdAt).toLocaleTimeString()}</span>
              </div>
            </div>
          </Html>
        </group>
      ))}
    </group>
  );
}
