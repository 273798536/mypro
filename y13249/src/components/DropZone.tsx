import { useCallback, useState } from "react"
import { useStore } from "@/store/useStore"
import { Upload } from "lucide-react"

export function DropZone() {
  const addRecords = useStore((s) => s.addRecords)
  const [dragging, setDragging] = useState(false)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0) addRecords(files)
    },
    [addRecords]
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || [])
      if (files.length > 0) addRecords(files)
      e.target.value = ""
    },
    [addRecords]
  )

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`
        relative border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-2
        transition-all duration-200 cursor-pointer
        ${
          dragging
            ? "border-studio-amber bg-studio-amber/5 shadow-[0_0_20px_rgba(240,165,0,0.15)]"
            : "border-studio-border hover:border-studio-amber-dim bg-studio-card/30"
        }
      `}
    >
      <input
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileInput}
        className="absolute inset-0 opacity-0 cursor-pointer"
      />
      <Upload
        size={24}
        className={dragging ? "text-studio-amber" : "text-studio-muted"}
      />
      <span
        className={`text-sm ${dragging ? "text-studio-amber" : "text-studio-muted"}`}
      >
        {dragging ? "释放以添加截图" : "拖拽排练群截图到此处，或点击选择文件"}
      </span>
      <span className="text-xs text-studio-muted/60">
        材料投放区 — 复核人由此上传截图
      </span>
    </div>
  )
}
