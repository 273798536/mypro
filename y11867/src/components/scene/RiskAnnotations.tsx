import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { Html } from '@react-three/drei'
import { useStore } from '@/store/useStore'
import type { RiskAnnotation, DetectedIssue } from '@/types'

const TYPE_COLORS: Record<RiskAnnotation['type'], string> = {
  danger: '#FF3B3B',
  warning: '#FF9800',
  info: '#3B9EFF',
}

const SEVERITY_COLORS: Record<DetectedIssue['severity'], string> = {
  critical: '#FF3B3B',
  warning: '#FF9800',
  info: '#3B9EFF',
}

function AnnotationLabel({ annotation }: { annotation: RiskAnnotation }) {
  const bgColor = TYPE_COLORS[annotation.type]
  return (
    <Html
      position={[
        annotation.position[0],
        annotation.position[1] + 4,
        annotation.position[2],
      ]}
      center
      style={{ pointerEvents: 'none' }}
    >
      <div style={{
        background: bgColor,
        color: '#fff',
        padding: '3px 10px',
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        fontFamily: 'sans-serif',
        boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
      }}>
        {annotation.label}
      </div>
    </Html>
  )
}

function IssueWireframe({ issue }: { issue: DetectedIssue }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const color = SEVERITY_COLORS[issue.severity]

  useEffect(() => {
    return () => {
      meshRef.current?.geometry.dispose()
      if (meshRef.current?.material instanceof THREE.Material) meshRef.current.material.dispose()
    }
  }, [])

  return (
    <mesh
      ref={meshRef}
      position={[
        issue.position[0],
        issue.position[1] + 4,
        issue.position[2],
      ]}
    >
      <boxGeometry args={[5, 5, 5]} />
      <meshBasicMaterial color={color} wireframe transparent opacity={0.8} />
    </mesh>
  )
}

export default function RiskAnnotations() {
  const annotations = useStore(state => state.annotations)
  const issues = useStore(state => state.issues)
  const selectedIssueId = useStore(state => state.selectedIssueId)

  const selectedIssue = issues.find(i => i.id === selectedIssueId) ?? null

  return (
    <group>
      {annotations.map(a => (
        <AnnotationLabel key={a.id} annotation={a} />
      ))}
      {selectedIssue && (
        <IssueWireframe issue={selectedIssue} />
      )}
    </group>
  )
}
