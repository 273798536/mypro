import { useState } from "react";
import html2canvas from "html2canvas";
import { Camera, Download, X } from "lucide-react";
import { usePartitionStore } from "@/store/index";

export default function ExportPanel() {
  const { currentResult, config } = usePartitionStore();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const handleExport = async () => {
    if (!currentResult) return;
    const el = document.getElementById("export-area");
    if (!el) return;

    setIsCapturing(true);
    try {
      const canvas = await html2canvas(el, {
        backgroundColor: "#2d4a3e",
        scale: 2,
      });
      setPreviewUrl(canvas.toDataURL("image/png"));
    } finally {
      setIsCapturing(false);
    }
  };

  const handleDownload = () => {
    if (!previewUrl) return;
    const a = document.createElement("a");
    a.href = previewUrl;
    a.download = `整数拆分_${config.targetNumber}_${Date.now()}.png`;
    a.click();
  };

  if (!currentResult) {
    return (
      <div className="rounded-lg border-2 border-dashed border-[#8fbc8f]/40 bg-[#2d4a3e]/30 p-6 text-center">
        <p className="font-serif text-[#d2b48c]/70 text-sm">暂无方案可导出</p>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={handleExport}
        disabled={isCapturing}
        className="flex items-center gap-2 rounded-lg border-2 border-[#d2b48c]/60 bg-[#2d4a3e]/80 px-4 py-2 font-serif text-[#d2b48c] shadow-[2px_2px_0_0_rgba(139,115,85,0.5)] transition-all hover:bg-[#3a5f4c] hover:shadow-[3px_3px_0_0_rgba(139,115,85,0.6)] active:shadow-none disabled:opacity-50"
      >
        <Camera className="h-4 w-4" />
        <span>{isCapturing ? "截取中..." : "导出截图"}</span>
      </button>

      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative mx-4 max-h-[90vh] w-full max-w-2xl overflow-auto rounded-xl border-2 border-[#8fbc8f]/40 bg-[#1a332a] p-6 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
            <button
              onClick={() => setPreviewUrl(null)}
              className="absolute right-3 top-3 rounded-full p-1 text-[#d2b48c]/70 transition-colors hover:bg-[#2d4a3e] hover:text-[#d2b48c]"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="mb-4 font-serif text-lg text-[#d2b48c]">截图预览</h3>

            <div className="mb-4 overflow-auto rounded-lg border border-[#8fbc8f]/30">
              <img
                src={previewUrl}
                alt="截图预览"
                className="w-full"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setPreviewUrl(null)}
                className="rounded-lg border border-[#8fbc8f]/40 px-4 py-2 font-serif text-sm text-[#d2b48c]/80 transition-colors hover:bg-[#2d4a3e]"
              >
                关闭
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 rounded-lg border-2 border-[#d2b48c]/60 bg-[#2d4a3e] px-4 py-2 font-serif text-sm text-[#d2b48c] shadow-[2px_2px_0_0_rgba(139,115,85,0.5)] transition-all hover:bg-[#3a5f4c]"
              >
                <Download className="h-4 w-4" />
                下载
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
