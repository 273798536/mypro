import { useRef } from 'react'
import Scene3D from '@/components/three/Scene3D'
import Toolbar from '@/components/layout/Toolbar'
import AnnotationPanel from '@/components/layout/AnnotationPanel'

export default function WorkbenchView() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  return (
    <div className="h-full w-full relative">
      <Scene3D onCanvasReady={(canvas) => { canvasRef.current = canvas }} />
      <Toolbar canvasRef={canvasRef} />
      <AnnotationPanel />
    </div>
  )
}
