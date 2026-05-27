import { Camera } from "lucide-react"
import { exportCanvasAsImage } from "@/utils/exportImage"
import { useStore } from "@/store/useStore"
import { useState } from "react"

export function ExportButton() {
  const recordExport = useStore((s) => s.recordExport)
  const [showToast, setShowToast] = useState(false)

  const handleExport = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
    const success = exportCanvasAsImage(
      "#mountain-canvas canvas",
      `cashflow-ridge-${timestamp}.png`
    )
    if (success) {
      recordExport()
      setShowToast(true)
      setTimeout(() => setShowToast(false), 2000)
    }
  }

  return (
    <>
      <button
        onClick={handleExport}
        className="absolute top-4 right-4 z-10 p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-[#4fc3f7]/10 hover:border-[#4fc3f7]/30 hover:shadow-[0_0_12px_rgba(79,195,247,0.3)] transition-all"
      >
        <Camera className="w-5 h-5 text-white/70" />
      </button>
      {showToast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-[#1a1f36]/90 border border-[#4fc3f7]/40 text-sm text-white/90 backdrop-blur-sm animate-slide-up">
          视图已导出为PNG
        </div>
      )}
    </>
  )
}
