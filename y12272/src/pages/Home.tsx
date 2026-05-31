import { useEffect, useRef, useState } from "react"
import Toolbar from "@/components/Toolbar"
import Scene3D from "@/components/Scene3D"
import Sidebar from "@/components/Sidebar"
import PipelineDetailPanel from "@/components/PipelineDetailPanel"
import { useStore } from "@/store/useStore"
import { AlertTriangle, X } from "lucide-react"

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [toast, setToast] = useState<{ type: string; message: string } | null>(null)
  const conflicts = useStore((s) => s.conflicts)
  const selectedConflictId = useStore((s) => s.selectedConflictId)

  const unresolvedCount = conflicts.filter((c) => c.status === "unresolved" && c.severity === "critical").length

  useEffect(() => {
    if (unresolvedCount > 0) {
      setToast({
        type: "warning",
        message: `检测到 ${unresolvedCount} 个严重冲突未解决，导出报告将包含详细信息`,
      })
      const timer = setTimeout(() => setToast(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [unresolvedCount])

  useEffect(() => {
    if (selectedConflictId) {
      const conflict = conflicts.find((c) => c.id === selectedConflictId)
      if (conflict) {
        const typeLabel =
          conflict.type === "elevation_mismatch"
            ? "标高错配"
            : conflict.type === "outdated_drawing"
              ? "旧图未作废"
              : "管线交叉"
        setToast({
          type: conflict.severity,
          message: `定位到冲突 ${conflict.id}：${typeLabel} - ${conflict.description.slice(0, 40)}...`,
        })
        const timer = setTimeout(() => setToast(null), 3000)
        return () => clearTimeout(timer)
      }
    }
  }, [selectedConflictId, conflicts])

  const handleCanvasReady = (canvas: HTMLCanvasElement | null) => {
    canvasRef.current = canvas
  }

  const getCanvas = () => {
    const wrapper = document.getElementById("scene-wrapper")
    return wrapper
  }

  return (
    <div className="flex h-screen w-screen flex-col bg-[#0f1115] text-zinc-100 overflow-hidden">
      <Toolbar getCanvas={getCanvas} />

      <div className="relative flex flex-1 overflow-hidden">
        <div id="scene-wrapper" className="relative flex-1">
          <Scene3D onReady={handleCanvasReady} />

          <div className="absolute bottom-4 left-4 flex gap-2">
            <div className="rounded-lg border border-[#2a2d36] bg-[#1a1d23]/80 backdrop-blur-sm px-3 py-2 text-[10px] font-mono text-zinc-400">
              <div className="text-zinc-500">鼠标左键</div>
              <div className="text-zinc-300">旋转 / 选中</div>
            </div>
            <div className="rounded-lg border border-[#2a2d36] bg-[#1a1d23]/80 backdrop-blur-sm px-3 py-2 text-[10px] font-mono text-zinc-400">
              <div className="text-zinc-500">鼠标滚轮</div>
              <div className="text-zinc-300">缩放</div>
            </div>
            <div className="rounded-lg border border-[#2a2d36] bg-[#1a1d23]/80 backdrop-blur-sm px-3 py-2 text-[10px] font-mono text-zinc-400">
              <div className="text-zinc-500">鼠标右键</div>
              <div className="text-zinc-300">平移</div>
            </div>
          </div>

          <div className="absolute bottom-4 right-4 rounded-lg border border-[#2a2d36] bg-[#1a1d23]/80 backdrop-blur-sm px-3 py-2 text-[10px] text-zinc-400">
            拖拽蓝色剖切面调整位置，侧边栏可精确控制
          </div>
        </div>

        <Sidebar />

        <PipelineDetailPanel />

        {toast && (
          <div
            className={`absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-lg border px-4 py-3 shadow-lg animate-in fade-in slide-in-from-top-2 z-50 ${
              toast.type === "critical" || toast.type === "warning"
                ? "border-red-500/30 bg-red-500/90 text-white"
                : toast.type === "info"
                  ? "border-yellow-500/30 bg-yellow-500/90 text-white"
                  : "border-blue-500/30 bg-blue-500/90 text-white"
            }`}
          >
            <AlertTriangle size={16} />
            <span className="text-sm">{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-2 rounded p-0.5 hover:bg-white/20"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
