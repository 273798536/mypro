import { Html } from '@react-three/drei'
import { useAppStore } from '@/store/useAppStore'
import type { Annotation } from '@/types'
import { Type, ArrowRight, Ruler } from 'lucide-react'

function AnnotationItem({ annotation }: { annotation: Annotation }) {
  const iconColor = annotation.type === 'text' ? '#60A5FA' : annotation.type === 'arrow' ? '#22C55E' : '#F59E0B'

  return (
    <group position={[annotation.position[0], annotation.position[1], annotation.position[2]]}>
      <mesh>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshBasicMaterial color={iconColor} />
      </mesh>
      <Html position={[0, 0.3, 0]} center zIndexRange={[100, 0]}>
        <div
          style={{
            background: 'rgba(15, 29, 47, 0.95)',
            border: `1px solid ${iconColor}`,
            borderRadius: '4px',
            padding: '4px 8px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          {annotation.type === 'text' && <Type size={10} color={iconColor} />}
          {annotation.type === 'arrow' && <ArrowRight size={10} color={iconColor} />}
          {annotation.type === 'measure' && <Ruler size={10} color={iconColor} />}
          <span style={{ color: '#CBD5E1', fontSize: '10px', fontFamily: 'Noto Sans SC, sans-serif' }}>
            {annotation.content}
          </span>
        </div>
      </Html>
    </group>
  )
}

export default function Annotations3D() {
  const annotations = useAppStore((s) => s.annotations)
  const showAnnotationLayer = useAppStore((s) => s.showAnnotationLayer)

  if (!showAnnotationLayer || annotations.length === 0) return null

  return (
    <>
      {annotations.map((ann) => (
        <AnnotationItem key={ann.id} annotation={ann} />
      ))}
    </>
  )
}
