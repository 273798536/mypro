import { useRef } from 'react'
import { Camera } from 'lucide-react'

interface ExportButtonProps {
  targetRef: React.RefObject<HTMLDivElement | null>
}

export default function ExportButton({ targetRef }: ExportButtonProps) {
  const handleExport = async () => {
    if (!targetRef.current) return

    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(targetRef.current, {
        backgroundColor: '#0d1117',
        scale: 2,
        useCORS: true,
      })
      const link = document.createElement('a')
      link.download = `滑轮组计算_${new Date().toLocaleDateString('zh-CN')}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch {
      const canvas = document.querySelector('canvas')
      if (canvas) {
        const link = document.createElement('a')
        link.download = `滑轮组3D视图_${new Date().toLocaleDateString('zh-CN')}.png`
        link.href = canvas.toDataURL('image/png')
        link.click()
      }
    }
  }

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-2 px-4 py-2 bg-[#ff6b35] hover:bg-[#ff8555] text-white text-sm font-mono rounded-lg transition-all duration-200 shadow-lg shadow-[#ff6b35]/20 hover:shadow-[#ff6b35]/40"
    >
      <Camera className="w-4 h-4" />
      截图导出
    </button>
  )
}
